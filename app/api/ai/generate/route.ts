import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitResponse } from "@/lib/rate-limit";
import { getVoucherLink, getPointsLink, getMenuLink } from "@/lib/pwa-links";
import { aiCallWithTools } from "@/lib/ai-tools";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const AI_MODEL = "gpt-4o";

export async function POST(request: NextRequest) {
  // Rate limit: 20 req/min for AI
  const limited = rateLimitResponse(request, "ai")
  if (limited) return limited

  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse request body
    const { goal, conversationHistory, language: userLang } = await request.json();

    if (!goal) {
      return NextResponse.json({ error: "Please provide a goal" }, { status: 400 });
    }

    // Use admin client (service role key) to bypass RLS and fetch ALL customer data
    // This is safe because we already verified the user is admin above
    let adminSupabase;
    try {
      adminSupabase = createAdminClient();
    } catch (envError: any) {
      console.error("[AI Generate] Admin client error:", envError.message);
      return NextResponse.json(
        { error: "Server configuration error: " + envError.message },
        { status: 500 }
      );
    }

    // Fetch ALL customer data for AI context (using admin client to bypass RLS)
    // Use SELECT * to avoid errors from missing columns (e.g. birthday if migration not run)
    let customers: any[] = [];
    const { data: allCustomers, error: customersError } = await adminSupabase
      .from("profiles")
      .select("*")
      .eq("role", "customer");

    if (customersError) {
      console.error("[AI Generate] Failed to fetch customers:", customersError);
      // Fallback: try minimal query without optional columns
      const { data: fallbackCustomers } = await adminSupabase
        .from("profiles")
        .select("id, full_name, phone, points_balance, total_spent, visit_count, last_visit, created_at, role")
        .eq("role", "customer");
      customers = fallbackCustomers || [];
      console.log(`[AI Generate] Fallback query found ${customers.length} customers`);
    } else {
      customers = allCustomers || [];
    }

    console.log(`[AI Generate] Found ${customers.length} customers for AI context`);
    
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Calculate customer segments
    const segments = {
      total: customers.length,
      active: customers.filter(c => c.last_visit && new Date(c.last_visit) > thirtyDaysAgo).length,
      dormant: customers.filter(c => !c.last_visit || new Date(c.last_visit) <= thirtyDaysAgo).length,
      vip: customers.filter(c => (c.total_spent || 0) >= 1000).length,
      newCustomers: customers.filter(c => new Date(c.created_at) > sevenDaysAgo).length,
      upcomingBirthdays: customers.filter(c => {
        if (!c.birthday) return false;
        const bday = new Date(c.birthday);
        const thisYearBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
        const diff = (thisYearBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
        return diff >= -1 && diff <= 14;
      }).length,
    };

    // Find specific customer groups for AI
    const birthdayCustomers = customers.filter(c => {
      if (!c.birthday) return false;
      const bday = new Date(c.birthday);
      const thisYearBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
      const diff = (thisYearBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= -1 && diff <= 14;
    }).map(c => ({
      id: c.id,
      name: c.full_name || "Unknown",
      phone: c.phone,
      birthday: c.birthday,
      points: c.points_balance || 0,
      totalSpent: c.total_spent || 0,
      visits: c.visit_count || 0,
    }));

    const dormantCustomers = customers.filter(c => !c.last_visit || new Date(c.last_visit) <= thirtyDaysAgo)
      .map(c => ({
        id: c.id,
        name: c.full_name || "Unknown",
        phone: c.phone,
        points: c.points_balance || 0,
        totalSpent: c.total_spent || 0,
        visits: c.visit_count || 0,
        lastVisit: c.last_visit,
        daysSince: c.last_visit ? Math.floor((today.getTime() - new Date(c.last_visit).getTime()) / (1000 * 60 * 60 * 24)) : null,
      }));

    const vipCustomers = customers.filter(c => (c.total_spent || 0) >= 1000)
      .map(c => ({
        id: c.id,
        name: c.full_name || "Unknown",
        phone: c.phone,
        points: c.points_balance || 0,
        totalSpent: c.total_spent || 0,
        visits: c.visit_count || 0,
        lastVisit: c.last_visit,
      }));

    const newCustomers = customers.filter(c => new Date(c.created_at) > sevenDaysAgo)
      .map(c => ({
        id: c.id,
        name: c.full_name || "Unknown",
        phone: c.phone,
        points: c.points_balance || 0,
        totalSpent: c.total_spent || 0,
        visits: c.visit_count || 0,
        joinDate: c.created_at,
      }));

    // Get recent transactions (using admin client to bypass RLS)
    const { data: recentTransactions } = await adminSupabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    const totalRevenue = recentTransactions?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;

    // === ENHANCED BUSINESS METRICS FOR AI INSIGHTS ===
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);

    // Fetch all earn transactions for revenue metrics
    const { data: allEarnTx } = await adminSupabase
      .from("transactions")
      .select("amount, created_at, type")
      .eq("type", "earn");

    const earnTxList = allEarnTx || [];
    const revenueThisMonth = earnTxList
      .filter(t => new Date(t.created_at) >= startOfMonth)
      .reduce((s, t) => s + (t.amount || 0), 0);
    const revenueLastMonth = earnTxList
      .filter(t => new Date(t.created_at) >= startOfLastMonth && new Date(t.created_at) <= endOfLastMonth)
      .reduce((s, t) => s + (t.amount || 0), 0);
    const revenueTrend = revenueLastMonth > 0
      ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth * 100).toFixed(1)
      : "N/A";

    // Fetch all transactions for count metrics
    const { data: allTxData } = await adminSupabase
      .from("transactions")
      .select("id, type, amount, created_at");
    const allTxList = allTxData || [];
    const txThisMonth = allTxList.filter(t => new Date(t.created_at) >= startOfMonth);
    const earnCountMonth = txThisMonth.filter(t => t.type === "earn").length;
    const redeemCountMonth = txThisMonth.filter(t => t.type === "redeem").length;
    const avgTxValue = allTxList.filter(t => t.amount && t.amount > 0).length > 0
      ? (allTxList.filter(t => t.amount && t.amount > 0).reduce((s, t) => s + (t.amount || 0), 0) / allTxList.filter(t => t.amount && t.amount > 0).length).toFixed(2)
      : "0";

    // Voucher metrics
    let voucherMetrics = { active: 0, redeemed: 0, rate: "0" };
    try {
      const { data: activeV } = await adminSupabase.from("vouchers").select("id").eq("is_active", true);
      const { data: usedV } = await adminSupabase.from("user_vouchers").select("id, is_used");
      const totalUV = usedV?.length || 0;
      const redeemedUV = usedV?.filter((v: any) => v.is_used).length || 0;
      voucherMetrics = {
        active: activeV?.length || 0,
        redeemed: redeemedUV,
        rate: totalUV > 0 ? (redeemedUV / totalUV * 100).toFixed(1) : "0",
      };
    } catch {}

    // Top customers
    const topBySpend = [...customers].sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0)).slice(0, 5);
    const topByVisits = [...customers].sort((a, b) => (b.visit_count || 0) - (a.visit_count || 0)).slice(0, 5);

    const avgLifetimeValue = customers.length > 0
      ? (customers.reduce((s, c) => s + (c.total_spent || 0), 0) / customers.length).toFixed(2)
      : "0";

    // Full customer list summary for AI
    const customerListSummary = customers.slice(0, 50).map(c => 
      `- ${c.full_name || "Unknown"} (${c.phone || "no phone"}) | RM${(c.total_spent || 0).toFixed(0)} spent | ${c.points_balance || 0} pts | ${c.visit_count || 0} visits | Last: ${c.last_visit ? new Date(c.last_visit).toLocaleDateString() : "never"} | Birthday: ${c.birthday || "unknown"}`
    ).join("\n");

    // Build powerful system prompt
    const systemPrompt = `You are JP&Co's Senior AI Marketing Strategist — powered by 302.AI. You are a world-class F&B retention marketing expert specializing in customer lifecycle management, behavioral segmentation, and high-conversion WhatsApp campaigns for JP&Co, a trendy casual dining restaurant at Pavilion Bukit Jalil, Kuala Lumpur, Malaysia (burgers, cakes, artisan coffee).

## YOUR EXPERTISE
1. **Customer Lifecycle Marketing** — Acquisition → Activation → Retention → Reactivation → Win-back
2. **Behavioral Segmentation** — RFM analysis (Recency, Frequency, Monetary), VIP tiers, churn prediction
3. **Personalized WhatsApp Campaigns** — 1-to-1 messages with dynamic variables, urgency triggers, social proof
4. **Promotion Strategy** — Flash sales, loyalty multipliers, referral loops, birthday surprises, time-limited offers
5. **Business Intelligence** — Revenue analysis, trend detection, cohort analysis, AOV optimization
6. **Copywriting Mastery** — Persuasive, emoji-rich, action-driven messages that convert

## MARKETING FRAMEWORKS YOU APPLY
- **AIDA** (Attention → Interest → Desire → Action) for message structure
- **Loss Aversion** — "Your 50 points expire soon!" works better than "You have 50 points"
- **Social Proof** — "Join 200+ members who claimed this week"
- **Urgency & Scarcity** — "Only 24 hours left", "Limited to first 20 customers"
- **Reciprocity** — Give value first (free voucher), then ask for visit

## LIVE BUSINESS DATA (Real-time from Supabase)

### Customer Metrics
| Metric | Value |
|--------|-------|
| Total Customers | ${segments.total} |
| Active (30d) | ${segments.active} |
| Dormant (30d+) | ${segments.dormant} |
| VIP (≥RM1000 spent) | ${segments.vip} |
| New (7 days) | ${segments.newCustomers} |
| Upcoming Birthdays (14d) | ${segments.upcomingBirthdays} |

### Revenue & Financials
| Metric | Value |
|--------|-------|
| Revenue This Month | RM ${revenueThisMonth.toFixed(2)} |
| Revenue Last Month | RM ${revenueLastMonth.toFixed(2)} |
| MoM Trend | ${revenueTrend}% |
| Avg Transaction | RM ${avgTxValue} |
| Transactions This Month | ${txThisMonth.length} (${earnCountMonth} earn, ${redeemCountMonth} redeem) |
| Avg Customer LTV | RM ${avgLifetimeValue} |

### Voucher Performance
| Metric | Value |
|--------|-------|
| Active Vouchers | ${voucherMetrics.active} |
| Redeemed | ${voucherMetrics.redeemed} |
| Redemption Rate | ${voucherMetrics.rate}% |

### Top 5 by Spend
${topBySpend.map(c => `- ${c.full_name || "Unknown"} | RM${(c.total_spent || 0).toFixed(0)} | ${c.visit_count || 0} visits`).join("\n") || "No data"}

### Top 5 by Visits
${topByVisits.map(c => `- ${c.full_name || "Unknown"} | ${c.visit_count || 0} visits | RM${(c.total_spent || 0).toFixed(0)} spent`).join("\n") || "No data"}

### Full Customer Database (up to 50)
${customerListSummary}

### Birthday Customers (next 14 days)
${birthdayCustomers.length > 0 ? birthdayCustomers.map(c => `- ${c.name} (${c.phone}) | Birthday: ${c.birthday} | RM${c.totalSpent.toFixed(0)} spent | ${c.points} pts`).join("\n") : "No upcoming birthdays"}

### Dormant Customers (30+ days inactive)
${dormantCustomers.slice(0, 20).map(c => `- ${c.name} (${c.phone}) | ${c.daysSince ? c.daysSince + "d ago" : "never visited"} | RM${c.totalSpent.toFixed(0)} spent | ${c.points} pts`).join("\n") || "None"}

### VIP Customers (≥RM1000 lifetime spend)
${vipCustomers.map(c => `- ${c.name} (${c.phone}) | RM${c.totalSpent.toFixed(0)} spent | ${c.points} pts | ${c.visits} visits`).join("\n") || "None"}

### New Customers (7 days)
${newCustomers.map(c => `- ${c.name} (${c.phone}) | Joined: ${new Date(c.joinDate).toLocaleDateString()} | ${c.points} pts`).join("\n") || "None"}

## OUTPUT RULES

### Language
You MUST respond in ${userLang === "zh" ? "Chinese (简体中文)" : userLang === "ms" ? "Bahasa Melayu" : "English"}. All analysis, headings, and explanations must be in this language. WhatsApp messages for customers should also be written in this language.

### WhatsApp Message Format
When generating messages for customers, ALWAYS include this JSON block at the end:

\`\`\`customer_actions
[
  {"id": "customer_uuid", "name": "Customer Name", "phone": "60123456789", "message": "The WhatsApp message", "reason": "Marketing rationale"}
]
\`\`\`

### Message Copywriting Rules
- Open with the customer's name and a warm greeting
- Use emojis strategically (not excessively) — 3-5 per message
- Create urgency or exclusivity ("Just for you", "Expires in 48h")
- Include their points balance or VIP status to make it personal
- End with a clear CTA (Call-to-Action) + PWA link
- Keep under 160 words for optimal WhatsApp readability
- Use line breaks for visual breathing room

### PWA Smart Links (ALWAYS include in messages)
- Points & rewards: ${getPointsLink()}
- Menu: ${getMenuLink()}
- Voucher claim: ${getVoucherLink("CODE")} (replace CODE with actual code)

Link strategy:
- Birthday → points link + voucher link
- Dormant/win-back → menu link + points link + special voucher
- VIP → points link (exclusive feel)
- New customer → menu link + referral link
- Voucher campaigns → voucher claim link + points link

### Analysis Response Format
For business questions, structure your answer as:
1. **Key Finding** — One-sentence headline
2. **Data Breakdown** — Specific numbers and %
3. **Trend Analysis** — What direction things are moving
4. **Action Items** — 2-3 specific things the admin should do NOW

## TOOLS YOU CAN USE
You have access to these tools. Use them when the admin's question needs external or uploaded data:
- **web_search** — Search the internet for real-time competitor info, promotions, market trends, prices
- **scrape_url** — Read any webpage content (competitor site, GrabFood, FoodPanda, social media)
- **search_knowledge_base** — Search files the admin uploaded (competitor menus, reports, images, documents)

**When to use tools:**
- Admin asks about competitors → use web_search and/or search_knowledge_base
- Admin asks about market trends → use web_search
- Admin mentions a specific URL → use scrape_url
- Admin references uploaded data → use search_knowledge_base
- You can chain multiple tools if needed

## BEHAVIOR
- Be proactive — always suggest WHO to message and WHY with marketing rationale
- Think like a CMO — every recommendation should tie back to revenue or retention
- When multiple customers match, list ALL with personalized messages for each
- Never give generic advice — always reference specific customers and their data
- If data is insufficient, say what's missing and suggest how to collect it
- When using tools, briefly mention what data source you used (e.g. "Based on web search..." or "From your uploaded files...")`;


    // Generate response using AI with tool calling
    let generatedMessage = "";
    let customerActions: any[] = [];

    try {
      if (!OPENAI_API_KEY) {
        throw new Error("OpenAI API key not configured");
      }

      const chatMessages: any[] = [
        { role: "system", content: systemPrompt },
      ];
      
      if (conversationHistory) {
        chatMessages.push({
          role: "user",
          content: `Previous conversation:\n${conversationHistory}\n\n---\nNew message:`,
        });
      }
      
      chatMessages.push({
        role: "user",
        content: goal,
      });

      const result = await aiCallWithTools({
        messages: chatMessages,
        maxRounds: 4,
        temperature: 0.8,
        maxTokens: 2500,
      });

      generatedMessage = result.content || "Sorry, I couldn't generate a response. Please try again.";
      if (result.toolsUsed.length > 0) {
        console.log(`[AI Generate] Tools used: ${result.toolsUsed.join(", ")}`);
      }

      // Extract customer_actions from response
      const actionsMatch = generatedMessage.match(/```customer_actions\n([\s\S]*?)\n```/);
      if (actionsMatch) {
        try {
          customerActions = JSON.parse(actionsMatch[1]);
          generatedMessage = generatedMessage.replace(/```customer_actions\n[\s\S]*?\n```/, "").trim();
        } catch {}
      }

    } catch (openaiError: any) {
      generatedMessage = `## AI Service Error

I'm having trouble connecting to the AI service right now.

**Error:** ${openaiError.message || "Connection failed"}

**What you can try:**
1. Go to **Customer Analyzer** tab for AI-powered messaging
2. Try again in a moment
3. Check if 302.AI service is available

**Your current data:**
- ${segments.total} total customers
- ${segments.dormant} dormant customers need attention
- ${segments.upcomingBirthdays} upcoming birthdays
- ${segments.vip} VIP customers`;
    }

    return NextResponse.json({
      success: true,
      message: generatedMessage,
      customerActions,
      segments,
      targetCount: customerActions.length,
    });
  } catch (outerError: any) {
    console.error("[AI Generate] Outer error:", outerError);
    return NextResponse.json(
      { error: "Error processing request: " + (outerError.message || "Unknown error") },
      { status: 500 }
    );
  }
}
