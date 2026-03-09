import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const CHAT_ENDPOINT = `${OPENAI_BASE_URL}/chat/completions`

export async function POST(request: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // ── Parse body ───────────────────────────────────────────────────
    const { question } = await request.json()
    if (!question) {
      return NextResponse.json(
        { error: "Please provide a question" },
        { status: 400 }
      )
    }

    // ── Admin client (bypasses RLS) ──────────────────────────────────
    let admin
    try {
      admin = createAdminClient()
    } catch (envError: any) {
      console.error("[AI Insights] Admin client error:", envError.message)
      return NextResponse.json(
        { error: "Server configuration error: " + envError.message },
        { status: 500 }
      )
    }

    // ── Date helpers ─────────────────────────────────────────────────
    const now = new Date()
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).toISOString()

    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    const startOfWeekISO = startOfWeek.toISOString()

    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    ).toISOString()

    const startOfLastMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    ).toISOString()

    const endOfLastMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59
    ).toISOString()

    const thirtyDaysAgo = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000
    ).toISOString()

    // ── Revenue Metrics ──────────────────────────────────────────────
    const { data: earnTxAll } = await admin
      .from("transactions")
      .select("amount, created_at")
      .eq("type", "earn")

    const earnTx = earnTxAll || []

    const revenue_today = earnTx
      .filter((t) => t.created_at >= startOfToday)
      .reduce((s, t) => s + (t.amount || 0), 0)

    const revenue_this_week = earnTx
      .filter((t) => t.created_at >= startOfWeekISO)
      .reduce((s, t) => s + (t.amount || 0), 0)

    const revenue_this_month = earnTx
      .filter((t) => t.created_at >= startOfMonth)
      .reduce((s, t) => s + (t.amount || 0), 0)

    const revenue_last_month = earnTx
      .filter(
        (t) => t.created_at >= startOfLastMonth && t.created_at <= endOfLastMonth
      )
      .reduce((s, t) => s + (t.amount || 0), 0)

    const revenue_trend =
      revenue_last_month > 0
        ? ((revenue_this_month - revenue_last_month) / revenue_last_month) * 100
        : revenue_this_month > 0
          ? 100
          : 0

    // ── Customer Metrics ─────────────────────────────────────────────
    const { data: allCustomers } = await admin
      .from("profiles")
      .select(
        "id, full_name, total_spent, visit_count, last_visit, created_at"
      )
      .eq("role", "customer")

    const customers = allCustomers || []
    const total_customers = customers.length

    const new_this_month = customers.filter(
      (c) => c.created_at >= startOfMonth
    ).length

    const new_last_month = customers.filter(
      (c) =>
        c.created_at >= startOfLastMonth && c.created_at <= endOfLastMonth
    ).length

    const active_customers = customers.filter(
      (c) => c.last_visit && c.last_visit >= thirtyDaysAgo
    ).length

    const dormant_customers = customers.filter(
      (c) => !c.last_visit || c.last_visit < thirtyDaysAgo
    ).length

    const avg_customer_lifetime_value =
      total_customers > 0
        ? customers.reduce((s, c) => s + (c.total_spent || 0), 0) /
          total_customers
        : 0

    // ── Transaction Metrics ──────────────────────────────────────────
    const { data: allTx } = await admin
      .from("transactions")
      .select("id, type, amount, points, created_at")

    const transactions = allTx || []

    const transactions_today = transactions.filter(
      (t) => t.created_at >= startOfToday
    ).length

    const transactions_this_week = transactions.filter(
      (t) => t.created_at >= startOfWeekISO
    ).length

    const transactions_this_month = transactions.filter(
      (t) => t.created_at >= startOfMonth
    ).length

    const txWithAmount = transactions.filter(
      (t) => t.amount !== null && t.amount > 0
    )
    const avg_transaction_value =
      txWithAmount.length > 0
        ? txWithAmount.reduce((s, t) => s + (t.amount || 0), 0) /
          txWithAmount.length
        : 0

    const monthTx = transactions.filter((t) => t.created_at >= startOfMonth)
    const earn_count = monthTx.filter((t) => t.type === "earn").length
    const redeem_count = monthTx.filter((t) => t.type === "redeem").length

    // ── Voucher Metrics ──────────────────────────────────────────────
    let total_vouchers_active = 0
    let total_redeemed = 0
    let redemption_rate = 0

    try {
      const { data: activeVouchers } = await admin
        .from("vouchers")
        .select("id")
        .eq("is_active", true)

      total_vouchers_active = activeVouchers?.length || 0
    } catch {
      // vouchers table may not exist
    }

    try {
      const { data: userVouchers } = await admin
        .from("user_vouchers")
        .select("id, is_used")

      if (userVouchers && userVouchers.length > 0) {
        total_redeemed = userVouchers.filter((v) => v.is_used).length
        redemption_rate =
          (total_redeemed / userVouchers.length) * 100
      }
    } catch {
      // user_vouchers table may not exist
    }

    // ── Top Customers ────────────────────────────────────────────────
    const top_5_by_spend = [...customers]
      .sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0))
      .slice(0, 5)
      .map((c) => ({
        name: c.full_name || "Unknown",
        total_spent: c.total_spent || 0,
        visits: c.visit_count || 0,
      }))

    const top_5_by_visits = [...customers]
      .sort((a, b) => (b.visit_count || 0) - (a.visit_count || 0))
      .slice(0, 5)
      .map((c) => ({
        name: c.full_name || "Unknown",
        visits: c.visit_count || 0,
        total_spent: c.total_spent || 0,
      }))

    // ── Time Patterns ────────────────────────────────────────────────
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ]
    const dayCounts: Record<string, number> = {}
    const hourCounts: Record<number, number> = {}

    for (const tx of transactions) {
      const d = new Date(tx.created_at)
      const dayName = dayNames[d.getDay()]
      dayCounts[dayName] = (dayCounts[dayName] || 0) + 1
      const hour = d.getHours()
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    }

    const busiest_day_of_week =
      Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A"

    const peakHourEntry = Object.entries(hourCounts).sort(
      (a, b) => b[1] - a[1]
    )[0]
    const peak_hour = peakHourEntry
      ? `${String(peakHourEntry[0]).padStart(2, "0")}:00`
      : "N/A"

    // ── Staff Metrics ────────────────────────────────────────────────
    const { data: staffProfiles } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "staff")

    const total_staff = staffProfiles?.length || 0

    let staff_activities_count = 0
    try {
      const { data: staffActivities } = await admin
        .from("staff_activities")
        .select("id")

      staff_activities_count = staffActivities?.length || 0
    } catch {
      // staff_activities table may not exist
    }

    // ── Build businessData ───────────────────────────────────────────
    const businessData = {
      revenue: {
        today: revenue_today,
        this_week: revenue_this_week,
        this_month: revenue_this_month,
        last_month: revenue_last_month,
        trend_percent: Math.round(revenue_trend * 100) / 100,
      },
      customers: {
        total: total_customers,
        new_this_month,
        new_last_month,
        active: active_customers,
        dormant: dormant_customers,
        avg_lifetime_value:
          Math.round(avg_customer_lifetime_value * 100) / 100,
      },
      transactions: {
        today: transactions_today,
        this_week: transactions_this_week,
        this_month: transactions_this_month,
        avg_value: Math.round(avg_transaction_value * 100) / 100,
        earn_count_this_month: earn_count,
        redeem_count_this_month: redeem_count,
      },
      vouchers: {
        active: total_vouchers_active,
        redeemed: total_redeemed,
        redemption_rate_percent:
          Math.round(redemption_rate * 100) / 100,
      },
      top_customers: {
        by_spend: top_5_by_spend,
        by_visits: top_5_by_visits,
      },
      time_patterns: {
        busiest_day_of_week,
        estimated_peak_hour: peak_hour,
      },
      staff: {
        total: total_staff,
        activities_logged: staff_activities_count,
      },
    }

    // ── Call OpenAI via 302.AI proxy ─────────────────────────────────
    if (!OPENAI_API_KEY) {
      return NextResponse.json({
        answer:
          "AI service is not configured. Here are the raw business metrics.",
        metrics: businessData,
        model: "JP&Co AI",
      })
    }

    const systemPrompt = `You are JP&Co's AI Business Intelligence Analyst — powered by 302.AI. You transform raw data into strategic decisions for a casual dining restaurant in SS2, Petaling Jaya, Malaysia.

## LIVE BUSINESS DATA
${JSON.stringify(businessData, null, 2)}

## ANALYSIS FRAMEWORK
When answering questions, apply these principles:

1. **Lead with the insight, not the data** — Start with what the numbers MEAN, then show the numbers
2. **Compare and contextualize** — Always compare to previous periods, calculate % change
3. **Identify anomalies** — Flag anything unusual (sudden drops, spikes, outliers)
4. **Segment when possible** — Break down by customer type, time period, or category
5. **End with actions** — Every answer must include 2-3 specific things the admin can do RIGHT NOW

## RESPONSE FORMAT
Structure every response as:
- **📊 Key Insight:** One-sentence headline finding
- **📈 Data Breakdown:** Specific numbers, percentages, and comparisons
- **🔍 What This Means:** Business interpretation in plain language
- **⚡ Action Items:** 2-3 immediate steps to take

## RULES
- Match the user's language (Chinese → Chinese, Malay → Malay, else English)
- Be specific — never say "revenue is good", say "revenue is RM X, up Y% from last month"
- For F&B context: mention peak hours, popular items, seasonal trends when relevant
- If data is insufficient for a confident answer, say what's missing and suggest how to collect it
- Think like a CFO + CMO hybrid — balance financial rigor with marketing opportunity`

    try {
      const aiResponse = await fetch(
        CHAT_ENDPOINT,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: question },
            ],
            temperature: 0.3,
          }),
        }
      )

      if (!aiResponse.ok) {
        const errText = await aiResponse.text()
        console.error("[AI Insights] OpenAI error:", errText)
        // Fallback: return raw metrics
        return NextResponse.json({
          answer:
            "AI analysis is temporarily unavailable. Here are the raw business metrics so you can review them directly.",
          metrics: businessData,
          model: "JP&Co AI",
        })
      }

      const rawText = await aiResponse.text()
      let aiData: any
      try { aiData = JSON.parse(rawText) } catch { aiData = rawText }
      const answer =
        (typeof aiData === "string" ? aiData : aiData.choices?.[0]?.message?.content) ||
        "No response generated. Please try again."

      return NextResponse.json({
        answer,
        metrics: businessData,
        model: "JP&Co AI",
      })
    } catch (aiError: any) {
      console.error("[AI Insights] AI call failed:", aiError.message)
      return NextResponse.json({
        answer:
          "AI analysis could not be completed. Here are the raw business metrics for your review.",
        metrics: businessData,
        model: "JP&Co AI",
      })
    }
  } catch (error: any) {
    console.error("[AI Insights] Error:", error)
    return NextResponse.json(
      { error: "Internal server error: " + (error.message || "Unknown error") },
      { status: 500 }
    )
  }
}
