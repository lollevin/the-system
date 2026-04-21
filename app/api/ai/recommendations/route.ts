import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"
import { callAI } from "@/lib/ai-client"

export const maxDuration = 60

interface AIRecommendationResponse {
  type: "personal" | "global"
  title: string
  description: string
  segment: string
  targetCustomerIds: string[]
  suggestedVoucher: {
    name: string
    code: string
    discount_type: "percentage" | "fixed"
    discount_value: number
    valid_days: number
    points_required: number
  }
  estimatedImpact: string
  reasoning: string
}

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const admin = createAdminClient()

    const { data: customers } = await admin
      .from("profiles")
      .select("id, full_name, phone, points_balance, total_spent, visit_count, last_visit, birthday, created_at")
      .eq("role", "customer")

    const allCustomers = customers || []

    const { data: recentTx } = await admin
      .from("transactions")
      .select("user_id, amount, type, created_at")
      .gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())

    const transactions = recentTx || []

    const today = new Date()
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

    const segments = {
      total: allCustomers.length,
      dormant: allCustomers.filter(
        (c: any) => !c.last_visit || new Date(c.last_visit) < thirtyDaysAgo
      ),
      newCustomers: allCustomers.filter(
        (c: any) => new Date(c.created_at) > sevenDaysAgo
      ),
      vip: allCustomers.filter((c: any) => (c.total_spent || 0) >= 1000),
      upcomingBirthdays: allCustomers.filter((c: any) => {
        if (!c.birthday) return false
        const bday = new Date(c.birthday)
        const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate())
        const diff = (thisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        return diff >= -1 && diff <= 14
      }),
      highValue: allCustomers
        .filter((c: any) => (c.total_spent || 0) > 0)
        .sort((a: any, b: any) => (b.total_spent || 0) - (a.total_spent || 0))
        .slice(0, 10),
    }

    const totalRevenue = allCustomers.reduce(
      (sum: number, c: any) => sum + (c.total_spent || 0),
      0
    )
    const avgSpend =
      allCustomers.length > 0 ? totalRevenue / allCustomers.length : 0
    const activeCustomers = allCustomers.filter(
      (c: any) => c.last_visit && new Date(c.last_visit) >= thirtyDaysAgo
    ).length

    const businessContext = {
      totalCustomers: segments.total,
      activeCustomers,
      dormantCount: segments.dormant.length,
      newCustomersCount: segments.newCustomers.length,
      vipCount: segments.vip.length,
      upcomingBirthdaysCount: segments.upcomingBirthdays.length,
      totalRevenueRM: Math.round(totalRevenue),
      avgSpendPerCustomerRM: Math.round(avgSpend),
      recentTransactionCount: transactions.length,
    }

    const sampleCustomers = {
      dormantSample: segments.dormant.slice(0, 5).map((c: any) => ({
        name: c.full_name,
        totalSpent: c.total_spent,
        visits: c.visit_count,
        daysSinceLastVisit: c.last_visit
          ? Math.floor(
              (today.getTime() - new Date(c.last_visit).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null,
      })),
      newSample: segments.newCustomers.slice(0, 5).map((c: any) => ({
        name: c.full_name,
        visits: c.visit_count,
      })),
      vipSample: segments.vip.slice(0, 5).map((c: any) => ({
        name: c.full_name,
        totalSpent: c.total_spent,
        visits: c.visit_count,
      })),
      birthdaySample: segments.upcomingBirthdays.slice(0, 5).map((c: any) => ({
        name: c.full_name,
        birthday: c.birthday,
      })),
    }

    const prompt = `You are JP&Co's AI marketing strategist for a Malaysian F&B business (coffee shop / cafe).

Business snapshot:
${JSON.stringify(businessContext, null, 2)}

Customer segment samples:
${JSON.stringify(sampleCustomers, null, 2)}

Analyze this data and generate 3-5 HIGH-IMPACT marketing recommendations. Each recommendation MUST:
- Target a real customer segment from the data above
- Include a specific voucher strategy (discount type/value, validity days, points cost)
- Be realistic for a Malaysian cafe (amounts in RM, typical F&B margins)
- Include a clear business reasoning

Return ONLY valid JSON in this exact format (no markdown, no code fences):
{
  "recommendations": [
    {
      "type": "personal" | "global",
      "title": "short catchy title",
      "description": "1-2 sentence description of the campaign",
      "segment": "one of: dormant | newCustomers | vip | upcomingBirthdays | highValue | all",
      "suggestedVoucher": {
        "name": "voucher name",
        "code": "VOUCHER_CODE_${Date.now().toString().slice(-4)}",
        "discount_type": "percentage" | "fixed",
        "discount_value": number,
        "valid_days": number,
        "points_required": number
      },
      "estimatedImpact": "one-sentence impact estimate with numbers",
      "reasoning": "why this will work, reference the data"
    }
  ]
}

IMPORTANT: Only include recommendations where the target segment actually has customers (non-zero count). Be strategic — not every segment needs a recommendation.`

    let aiRaw: string
    try {
      const result = await callAI({
        messages: [
          {
            role: "system",
            content:
              "You are an expert F&B marketing strategist for Malaysian cafes. You analyze real customer data and recommend high-ROI campaigns. Always respond with valid JSON only.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        maxTokens: 2000,
        maxRetries: 2,
        timeoutMs: 20000,
        jsonMode: true,
      })
      aiRaw = result.content
    } catch (err: any) {
      return NextResponse.json({
        recommendations: [],
        aiError: err.message || "AI service unavailable",
        businessContext,
      })
    }

    let parsed: { recommendations: AIRecommendationResponse[] }
    try {
      parsed = JSON.parse(aiRaw)
    } catch {
      const match = aiRaw.match(/\{[\s\S]*\}/)
      if (!match) {
        return NextResponse.json({
          recommendations: [],
          aiError: "AI returned invalid JSON",
          rawResponse: aiRaw.slice(0, 500),
          businessContext,
        })
      }
      try {
        parsed = JSON.parse(match[0])
      } catch {
        return NextResponse.json({
          recommendations: [],
          aiError: "Failed to parse AI response",
          rawResponse: aiRaw.slice(0, 500),
          businessContext,
        })
      }
    }

    const enriched = (parsed.recommendations || []).map((rec) => {
      let targetCustomers: any[] = []
      switch (rec.segment) {
        case "dormant":
          targetCustomers = segments.dormant
          break
        case "newCustomers":
          targetCustomers = segments.newCustomers
          break
        case "vip":
          targetCustomers = segments.vip
          break
        case "upcomingBirthdays":
          targetCustomers = segments.upcomingBirthdays
          break
        case "highValue":
          targetCustomers = segments.highValue
          break
        case "all":
        default:
          targetCustomers = allCustomers
          break
      }

      return {
        ...rec,
        targetCustomers: targetCustomers.slice(0, 10),
        targetCustomerIds: targetCustomers.map((c: any) => c.id),
        targetCount: targetCustomers.length,
      }
    })

    return NextResponse.json({
      recommendations: enriched,
      businessContext,
      aiEnhanced: true,
    })
  } catch (error: any) {
    console.error("[AI Recommendations] Error:", error)
    return NextResponse.json(
      { error: "Failed to generate AI recommendations: " + (error.message || "unknown") },
      { status: 500 }
    )
  }
}
