import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitResponse } from "@/lib/rate-limit";
import { getVoucherLink, getPointsLink, getMenuLink } from "@/lib/pwa-links";

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
    const systemPrompt = `You are JP&Co's AI Marketing & Business Intelligence Assistant - a powerful, smart AI for a casual restaurant in Malaysia serving burgers, cakes, and coffee.

## YOUR CAPABILITIES
You can:
1. **Analyze customer data** - Find birthdays, dormant customers, VIPs, etc.
2. **Generate personalized WhatsApp messages** - For individual or groups of customers
3. **Provide marketing strategies** - Based on real data
4. **Create promotions** - Suggest discounts, events, campaigns
5. **Answer business questions** - Revenue, trends, customer insights, comparisons
6. **Business Intelligence** - Answer "how much", "who", "when", "compare" questions with real data

## CURRENT BUSINESS DATA
- Total customers: ${segments.total}
- Active (30d): ${segments.active}
- Dormant (30d+): ${segments.dormant}
- VIP (≥RM1000): ${segments.vip}
- New (7d): ${segments.newCustomers}
- Upcoming birthdays (14d): ${segments.upcomingBirthdays}
- Recent revenue (last 20 tx): RM ${totalRevenue.toFixed(2)}

## REVENUE & FINANCIAL DATA
- Revenue this month: RM ${revenueThisMonth.toFixed(2)}
- Revenue last month: RM ${revenueLastMonth.toFixed(2)}
- Month-over-month trend: ${revenueTrend}%
- Average transaction value: RM ${avgTxValue}
- Transactions this month: ${txThisMonth.length} (${earnCountMonth} earn, ${redeemCountMonth} redeem)
- Average customer lifetime value: RM ${avgLifetimeValue}

## VOUCHER DATA
- Active vouchers: ${voucherMetrics.active}
- Redeemed vouchers: ${voucherMetrics.redeemed}
- Redemption rate: ${voucherMetrics.rate}%

## TOP 5 CUSTOMERS BY SPEND
${topBySpend.map(c => `- ${c.full_name || "Unknown"} | RM${(c.total_spent || 0).toFixed(0)} | ${c.visit_count || 0} visits`).join("\n") || "No data"}

## TOP 5 CUSTOMERS BY VISITS
${topByVisits.map(c => `- ${c.full_name || "Unknown"} | ${c.visit_count || 0} visits | RM${(c.total_spent || 0).toFixed(0)} spent`).join("\n") || "No data"}

## CUSTOMER DATABASE
${customerListSummary}

## BIRTHDAY CUSTOMERS (next 14 days)
${birthdayCustomers.length > 0 ? birthdayCustomers.map(c => `- ${c.name} (${c.phone}) | Birthday: ${c.birthday} | RM${c.totalSpent.toFixed(0)} spent | ${c.points} pts`).join("\n") : "No upcoming birthdays"}

## DORMANT CUSTOMERS (30+ days inactive)
${dormantCustomers.slice(0, 20).map(c => `- ${c.name} (${c.phone}) | ${c.daysSince ? c.daysSince + "d ago" : "never visited"} | RM${c.totalSpent.toFixed(0)} spent | ${c.points} pts`).join("\n") || "None"}

## VIP CUSTOMERS (≥RM1000)
${vipCustomers.map(c => `- ${c.name} (${c.phone}) | RM${c.totalSpent.toFixed(0)} spent | ${c.points} pts | ${c.visits} visits`).join("\n") || "None"}

## NEW CUSTOMERS (7 days)
${newCustomers.map(c => `- ${c.name} (${c.phone}) | Joined: ${new Date(c.joinDate).toLocaleDateString()} | ${c.points} pts`).join("\n") || "None"}

## RESPONSE FORMAT RULES
1. Respond in the same language as the user's message. If in Chinese, respond in Chinese. If in Malay, respond in Malay. Otherwise English.
2. When generating messages for customers, use this EXACT JSON format at the end of your response:

\`\`\`customer_actions
[
  {"id": "customer_uuid", "name": "Customer Name", "phone": "60123456789", "message": "The WhatsApp message here", "reason": "Why this customer"}
]
\`\`\`

3. ALWAYS include the customer_actions JSON block when suggesting to send messages to specific customers
4. Keep WhatsApp messages under 200 words, friendly, with emojis
5. If user asks about birthday/party customers, find them from the data and suggest personalized messages
6. If asking about dormant customers, list them with comeback offers
7. Be proactive - suggest who to message and why
8. If multiple customers match, list ALL of them and let admin choose
9. For business questions (revenue, stats, comparisons), provide clear answers with specific numbers
10. When answering business questions, format key metrics clearly and suggest actionable insights

## PWA SMART LINKS
When generating WhatsApp messages, ALWAYS include relevant PWA links at the end of the message so customers can take action directly:
- Points & rewards page: ${getPointsLink()}
- Menu page: ${getMenuLink()}
- For voucher codes, include: 👉 Claim here: ${getVoucherLink("CODE")} (replace CODE with the actual voucher code)

Link usage by context:
- Birthday messages → points link
- Dormant/inactive → menu link + points link
- VIP messages → points link
- New customers → menu link
- Voucher messages → voucher claim link + points link
- General → points link

## IMPORTANT
- Each customer message should be UNIQUE and personalized with their name
- Include their points balance or membership status when relevant
- Always provide the customer_actions block so admin can directly send via WhatsApp
- When asked business questions, be specific with numbers and percentages from the data above
- If you don't have enough data to answer, say so honestly and suggest what data would be needed
- ALWAYS append PWA smart links at the end of every WhatsApp message`;

    // Generate response using AI
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

      const chatEndpoint = `${OPENAI_BASE_URL}/chat/completions`
      const aiResponse = await fetch(chatEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: chatMessages,
          max_tokens: 2000,
          temperature: 0.8,
          presence_penalty: 0.4,
          frequency_penalty: 0.3,
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        throw new Error(`AI API error ${aiResponse.status}: ${errText}`);
      }

      const rawText = await aiResponse.text();
      let data: any;
      try { data = JSON.parse(rawText); } catch { data = rawText; }
      generatedMessage = (typeof data === "string" ? data : data.choices?.[0]?.message?.content) || "Sorry, I couldn't generate a response. Please try again.";

      // Extract customer_actions from response
      const actionsMatch = generatedMessage.match(/```customer_actions\n([\s\S]*?)\n```/);
      if (actionsMatch) {
        try {
          customerActions = JSON.parse(actionsMatch[1]);
          // Remove the JSON block from displayed message
          generatedMessage = generatedMessage.replace(/```customer_actions\n[\s\S]*?\n```/, "").trim();
        } catch {
          // Invalid JSON - ignore
        }
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
