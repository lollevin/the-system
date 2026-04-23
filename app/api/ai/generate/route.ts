import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitResponse } from "@/lib/rate-limit";
import { getVoucherLink, getPointsLink, getMenuLink } from "@/lib/pwa-links";
import { aiCallWithTools } from "@/lib/ai-tools";
import { buildLanguageDirective, resolveLocaleFromRequest } from "@/lib/i18n/language-directive";
import { getMalaysiaNow, buildDatePromptBlock } from "@/lib/malaysia-time";

// Allow up to 60 seconds for AI generation (matches Nginx default proxy_read_timeout)
export const maxDuration = 60;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const AI_MODEL = process.env.OPENAI_TEXT_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";

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
    const { goal, conversationHistory, language: bodyLang } = await request.json();

    if (!goal) {
      return NextResponse.json({ error: "Please provide a goal" }, { status: 400 });
    }

    // Resolve locale with three-source fallback: body > X-Locale header > cookie > "en"
    // so an async request is never silently parsed against a stale default.
    const localeInfo = resolveLocaleFromRequest(request, bodyLang);
    const userLang = localeInfo.tag;
    const languageDirective = buildLanguageDirective(userLang);

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
    
    // Use Malaysia time (KL) for "today" so date math is always correct,
    // regardless of where the server is deployed.
    const klNow = getMalaysiaNow();
    const today = klNow.date;
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
    // Include ALL customers whose birthday is in the CURRENT calendar month,
    // plus anyone with a birthday in the next 14 days (wraps into next month).
    const birthdayCustomers = customers.filter(c => {
      if (!c.birthday) return false;
      const bday = new Date(c.birthday);
      if (isNaN(bday.getTime())) return false;
      // Same month as today = this-month birthday (past, today, future)
      if (bday.getMonth() === today.getMonth()) return true;
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

    // Knowledge base files overview so AI knows what admin has uploaded
    let kbFilesSummary = "(no files uploaded yet)";
    try {
      const { data: kbRows } = await adminSupabase
        .from("knowledge_base")
        .select("file_name, file_type, created_at, status")
        .order("created_at", { ascending: false })
        .limit(30);
      if (kbRows && kbRows.length > 0) {
        kbFilesSummary = kbRows
          .map((f: any) =>
            `- ${f.file_name} (${f.file_type || "unknown"}) — ${f.status || "ready"}`
          )
          .join("\n");
      }
    } catch {}

    // Long-term memories — persistent facts AI has saved across conversations
    let memoriesSummary = "(no saved memories yet)";
    try {
      const { data: memRows } = await adminSupabase
        .from("ai_memories")
        .select("category, key, content, importance, created_at")
        .order("importance", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(50);
      if (memRows && memRows.length > 0) {
        memoriesSummary = memRows
          .map((m: any) =>
            `- [${m.category}${m.key ? "/" + m.key : ""}, priority ${m.importance}] ${m.content}`
          )
          .join("\n");
      }
    } catch {}

    // Recent staff audit log — so AI can reason about who did what
    let auditLogSummary = "(no recent staff activity)";
    try {
      const { data: auditRows } = await adminSupabase
        .from("staff_activity_log")
        .select(`
          action_type, details, created_at,
          staff:profiles!staff_activity_log_staff_id_fkey(full_name),
          customer:profiles!staff_activity_log_target_customer_id_fkey(full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(20);
      if (auditRows && auditRows.length > 0) {
        auditLogSummary = auditRows
          .map((r: any) => {
            const d = r.details || {};
            const when = new Date(r.created_at).toLocaleDateString();
            const staff = r.staff?.full_name || "staff";
            const cust = r.customer?.full_name || "—";
            if (r.action_type === "add_points") {
              return `- [${when}] ${staff} added +${d.points || 0} pts (RM${d.amount || 0}) to ${cust}`;
            }
            if (r.action_type === "delete_points") {
              return `- [${when}] ${staff} REVERSED −${d.points_reversed || 0} pts (RM${d.amount_reversed || 0}) from ${cust}`;
            }
            if (r.action_type === "redeem_voucher") {
              return `- [${when}] ${cust} redeemed ${d.voucher_name || "voucher"} via ${staff}`;
            }
            return `- [${when}] ${staff} ${r.action_type} → ${cust}`;
          })
          .join("\n");
      }
    } catch {}

    // Authoritative date/time strings for AI prompt & user-message prefix
    const todayIso = klNow.iso;
    const timeStr = klNow.time;
    const dayOfWeek = klNow.dayOfWeek;
    const todayStr = klNow.long;
    const monthStr = klNow.monthLabel;

    // Build powerful system prompt — language lock at the very top (primacy)
    const systemPrompt = `${languageDirective}

---

${buildDatePromptBlock(klNow)}

---

You are JP&Co's Senior AI Marketing Strategist. You are a world-class F&B retention marketing expert specializing in customer lifecycle management, behavioral segmentation, and high-conversion WhatsApp campaigns for JP&Co, a trendy casual dining restaurant at Pavilion Bukit Jalil, Kuala Lumpur, Malaysia (burgers, cakes, artisan coffee).

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

### Birthday Customers (this month + next 14 days)
${birthdayCustomers.length > 0 ? birthdayCustomers.map(c => `- ${c.name} (${c.phone}) | Birthday: ${c.birthday} | RM${c.totalSpent.toFixed(0)} spent | ${c.points} pts`).join("\n") : "No customers with birthdays this month or in the next 14 days"}

### Dormant Customers (30+ days inactive)
${dormantCustomers.slice(0, 20).map(c => `- ${c.name} (${c.phone}) | ${c.daysSince ? c.daysSince + "d ago" : "never visited"} | RM${c.totalSpent.toFixed(0)} spent | ${c.points} pts`).join("\n") || "None"}

### Knowledge Base Files (uploaded by admin)
${kbFilesSummary}
→ If admin asks about uploaded data, competitors, POS exports, campaign files, or "do you have my file" — USE the \`search_knowledge_base\` tool to read the actual content. Use \`list_knowledge_base_files\` when they ask for a file overview.

### Recent Staff Audit Log (last 20 actions)
${auditLogSummary}
→ Use this to answer "which staff added/deleted points", "was any reversal recently", etc. Also use it to spot patterns (same customer gets points often, many reversals = training issue, etc).

### Long-term Memory (saved across conversations)
${memoriesSummary}
→ These are facts you've chosen to remember permanently. Reference them when relevant. Use \`save_memory\` tool to add new important facts (business rules, customer insights, campaign lessons) so you remember them in future chats.

### VIP Customers (≥RM1000 lifetime spend)
${vipCustomers.map(c => `- ${c.name} (${c.phone}) | RM${c.totalSpent.toFixed(0)} spent | ${c.points} pts | ${c.visits} visits`).join("\n") || "None"}

### New Customers (7 days)
${newCustomers.map(c => `- ${c.name} (${c.phone}) | Joined: ${new Date(c.joinDate).toLocaleDateString()} | ${c.points} pts`).join("\n") || "None"}

## OUTPUT RULES

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
- Do NOT force voucher wording in every message; use voucher only when campaign intent explicitly requires it
- If no voucher is provided/approved, avoid words like "voucher", "coupon", "claim", and use points/menu/revisit CTA instead
- Tone must be premium and trustworthy (brand-safe), never "spammy" or "scam-like"
- Avoid ALL CAPS, too many exclamation marks, fake countdown pressure, and suspicious wording
- Prefer human, caring, relationship-first copy that sounds like a real brand manager

### Marketing Quality Bar (Must Follow)
- Each recommendation must include: target segment, objective, offer/mechanic, channel timing, and expected impact
- Prefer measurable actions with KPI targets (CTR, redemption rate, revisit rate, revenue uplift)
- For campaign ideas, provide a concise A/B angle (headline A vs headline B)
- Keep advice practical for small F&B operations (fast to launch, low operational complexity)
- When suggesting promotions, include guardrails to protect margin (minimum spend, valid window, audience cap)

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
- Non-voucher campaigns → menu link + points link only

### Analysis Response Format
For business questions, structure your answer as:
1. **Key Finding** — One-sentence headline
2. **Data Breakdown** — Specific numbers and %
3. **Trend Analysis** — What direction things are moving
4. **Action Items** — 2-3 specific things the admin should do NOW

## TOOLS YOU CAN USE
You have access to these tools. CALL THEM WHENEVER RELEVANT — do not apologize that you don't know, just call the tool.
- **web_search** — Search the internet for real-time competitor info, promotions, market trends, prices
- **scrape_url** — Read any webpage content (competitor site, GrabFood, FoodPanda, social media)
- **search_knowledge_base** — Read the actual content of admin-uploaded files (PDFs, POS exports, campaign files, images)
- **list_knowledge_base_files** — Get a list of all uploaded files (file name, type, date)
- **save_memory** — Permanently remember an important fact, customer insight, or campaign lesson across conversations

**MANDATORY tool-calling rules:**
- Admin says "my file / uploaded / 档案 / fail" → call \`search_knowledge_base\` with keywords from their question. Never say "please tell me what file" without first searching.
- Admin asks "what did I upload / 有没有我的档案" → call \`list_knowledge_base_files\`.
- Admin asks about competitors / prices / market trends → \`web_search\`.
- Admin mentions any URL → \`scrape_url\`.
- Admin tells you a business rule, preference, or you discover a key insight → immediately call \`save_memory\` so you never forget it.
- You CAN chain multiple tools (e.g. list_knowledge_base_files → search_knowledge_base → save_memory → respond).

## BEHAVIOR
- Be proactive — always suggest WHO to message and WHY with marketing rationale
- Think like a CMO — every recommendation should tie back to revenue or retention
- When multiple customers match, list ALL with personalized messages for each
- Never give generic advice — always reference specific customers and their data
- If data is insufficient, say what's missing and suggest how to collect it
- When using tools, briefly mention what data source you used (e.g. "Based on web search..." or "From your uploaded files...")

---

${languageDirective}

Silent pre-send checklist (do not emit this list):
  □ Is every heading, bullet, JSON string and example in ${localeInfo.label}?
  □ Did I avoid mentioning model names / providers?
  □ Did I include at least one specific customer record by name?
If any box is unchecked → rewrite before responding.`;


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
      
      // Prefix every user message with the authoritative date stamp so the
      // model cannot "forget" today even deep into a long conversation.
      chatMessages.push({
        role: "user",
        content: `[System clock: ${todayIso} ${timeStr} KL, ${dayOfWeek}]\n\n${goal}`,
      });

      const result = await aiCallWithTools({
        messages: chatMessages,
        maxRounds: 4,
        temperature: 0.7,
        maxTokens: 2000,
        retries: 2,
        timeoutMs: 20000,
        totalBudgetMs: 55000,
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
3. Retry once the upstream service recovers

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
