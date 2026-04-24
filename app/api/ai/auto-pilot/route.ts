import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"
import { getVoucherLink, getPointsLink, getMenuLink, getReferralLink } from "@/lib/pwa-links"
import { callAI } from "@/lib/ai-client"
import {
  buildLanguageDirective,
  resolveLocaleFromRequest,
} from "@/lib/i18n/language-directive"
import { getMalaysiaNow } from "@/lib/malaysia-time"
import { getRelevantSkills } from "@/lib/ai-skills"

export const maxDuration = 60

export interface AutoPilotAlert {
  id: string
  type:
    | "birthday"
    | "going_inactive"
    | "dormant"
    | "new_not_returned"
    | "vip_drop"
    | "points_milestone"
    | "high_value_risk"
    | "referral_opportunity"
  severity: "urgent" | "warning" | "info"
  title: string
  description: string
  customer: {
    id: string
    name: string
    phone: string | null
    points: number
    totalSpent: number
    visits: number
    lastVisit: string | null
    birthday: string | null
    tier: string
  }
  suggestedAction: string
  actionType: "send_message" | "create_voucher" | "send_and_voucher"
  messageTemplate: string
  voucherSuggestion?: {
    name: string
    discount_type: "percentage" | "fixed"
    discount_value: number
    reason: string
  }
}

function getTier(totalSpent: number): string {
  if (totalSpent >= 5000) return "Diamond"
  if (totalSpent >= 3000) return "Gold"
  if (totalSpent >= 1000) return "Silver"
  return "Bronze"
}

function daysBetween(d1: Date, d2: Date): number {
  return Math.floor(
    (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)
  )
}

export async function GET(request: NextRequest) {
  try {
    // Resolve the user's active locale from ?locale, X-Locale header, or cookie.
    const urlLocale = new URL(request.url).searchParams.get("locale")
    const userLocale = resolveLocaleFromRequest(request, urlLocale)
    const languageDirective = buildLanguageDirective(userLocale.tag)

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Use admin client for all data queries
    let adminSupabase
    try {
      adminSupabase = createAdminClient()
    } catch (envError: any) {
      console.error("[Auto-Pilot] Admin client error:", envError.message)
      return NextResponse.json(
        { error: "Server configuration error: " + envError.message },
        { status: 500 }
      )
    }

    // Fetch all customers (profiles where role=customer)
    const { data: customers, error: customersError } = await adminSupabase
      .from("profiles")
      .select("*")
      .eq("role", "customer")

    if (customersError) {
      console.error("[Auto-Pilot] Failed to fetch customers:", customersError)
      return NextResponse.json(
        { error: "Failed to fetch customer data" },
        { status: 500 }
      )
    }

    const allCustomers = customers || []

    // Fetch recent transactions (90 days) — use Malaysia local time
    const today = getMalaysiaNow().date
    const ninetyDaysAgo = new Date(
      today.getTime() - 90 * 24 * 60 * 60 * 1000
    )

    const { data: recentTransactions } = await adminSupabase
      .from("transactions")
      .select("*")
      .gte("created_at", ninetyDaysAgo.toISOString())
      .order("created_at", { ascending: false })

    const transactions = recentTransactions || []

    // Fetch referrals (try/catch since table may not exist)
    let referrals: any[] = []
    try {
      const { data: referralData } = await adminSupabase
        .from("referrals")
        .select("*")
      referrals = referralData || []
    } catch {
      // Table may not exist - ignore
    }

    // Fetch global active vouchers (for points milestone threshold)
    const { data: activeVouchers } = await adminSupabase
      .from("vouchers")
      .select("*")
      .eq("is_active", true)
      .eq("voucher_type", "global")

    const globalVouchers = activeVouchers || []

    // Build transaction map per customer for recent 30-day spending
    const thirtyDaysAgo = new Date(
      today.getTime() - 30 * 24 * 60 * 60 * 1000
    )
    const txMapRecent30: Record<string, number> = {}

    for (const tx of transactions) {
      if (
        tx.type === "earn" &&
        tx.amount &&
        new Date(tx.created_at) >= thirtyDaysAgo
      ) {
        txMapRecent30[tx.user_id] =
          (txMapRecent30[tx.user_id] || 0) + tx.amount
      }
    }

    // Calculate top 10% spender threshold
    const allTotalSpent = allCustomers
      .map((c: any) => c.total_spent || 0)
      .filter((v: number) => v > 0)
      .sort((a: number, b: number) => b - a)

    const top10Index = Math.max(
      0,
      Math.floor(allTotalSpent.length * 0.1) - 1
    )
    const top10Threshold =
      allTotalSpent.length > 0 ? allTotalSpent[top10Index] : Infinity

    // Find lowest reward threshold from active global vouchers
    const lowestRewardThreshold =
      globalVouchers.length > 0
        ? Math.min(...globalVouchers.map((v: any) => v.points_required || Infinity))
        : null

    // Referrer set: customer IDs who have referred someone
    const referrerIds = new Set(
      referrals.map((r: any) => r.referrer_id).filter(Boolean)
    )

    // Detect alerts
    const alerts: AutoPilotAlert[] = []

    for (const customer of allCustomers) {
      const name = customer.full_name || "Unknown"
      const phone = customer.phone || null
      const points = customer.points_balance || 0
      const totalSpent = customer.total_spent || 0
      const visits = customer.visit_count || 0
      const lastVisit = customer.last_visit || null
      const birthday = customer.birthday || null
      const createdAt = customer.created_at
      const tier = getTier(totalSpent)

      const customerObj = {
        id: customer.id,
        name,
        phone,
        points,
        totalSpent,
        visits,
        lastVisit,
        birthday,
        tier,
      }

      const daysInactive = lastVisit
        ? daysBetween(new Date(lastVisit), today)
        : null
      const daysSinceJoined = daysBetween(new Date(createdAt), today)

      // 1. Birthday (urgent if <=1 day, warning otherwise)
      if (birthday) {
        const bday = new Date(birthday)
        const thisYearBday = new Date(
          today.getFullYear(),
          bday.getMonth(),
          bday.getDate()
        )

        let daysUntilBirthday = daysBetween(today, thisYearBday)

        // Handle year rollover: if birthday already passed this year, check next year
        if (daysUntilBirthday < 0) {
          const nextYearBday = new Date(
            today.getFullYear() + 1,
            bday.getMonth(),
            bday.getDate()
          )
          daysUntilBirthday = daysBetween(today, nextYearBday)
        }

        if (daysUntilBirthday >= 0 && daysUntilBirthday <= 7) {
          const severity = daysUntilBirthday <= 1 ? "urgent" : "warning"
          const dayLabel =
            daysUntilBirthday === 0
              ? "today"
              : daysUntilBirthday === 1
                ? "tomorrow"
                : `in ${daysUntilBirthday} days`

          alerts.push({
            id: `birthday-${customer.id}`,
            type: "birthday",
            severity,
            title: `${name}'s birthday is ${dayLabel}`,
            description: `${name} has a birthday coming up ${dayLabel}. They have ${points} points and are a ${tier} member with RM${totalSpent.toFixed(0)} total spent.`,
            customer: customerObj,
            suggestedAction: `Send a birthday greeting and a special birthday voucher to ${name}.`,
            actionType: "send_and_voucher",
            messageTemplate: `Hi ${name}, happy birthday from all of us at JP&Co! We hope your special day is filled with joy. As a thank you for being a valued ${tier} member with ${points} points, we have a special birthday treat waiting for you. Come celebrate with us!\n\n📱 View points & rewards: ${getPointsLink()}\n\n- JP&Co Team`,
            voucherSuggestion: {
              name: "Birthday Gift",
              discount_type: "percentage",
              discount_value: 20,
              reason: `Birthday celebration for ${name} (${dayLabel})`,
            },
          })
        }
      }

      // 2. Going Inactive (warning): 14-29 days inactive, 2+ visits
      if (
        daysInactive !== null &&
        daysInactive >= 14 &&
        daysInactive <= 29 &&
        visits >= 2
      ) {
        alerts.push({
          id: `going_inactive-${customer.id}`,
          type: "going_inactive",
          severity: "warning",
          title: `${name} is going inactive (${daysInactive} days)`,
          description: `${name} has not visited in ${daysInactive} days. They usually visit regularly with ${visits} total visits and RM${totalSpent.toFixed(0)} spent.`,
          customer: customerObj,
          suggestedAction: `Send a friendly check-in message to ${name} to encourage a return visit.`,
          actionType: "send_message",
          messageTemplate: `Hi ${name}, we have not seen you at JP&Co in a while and we miss you! With ${points} points in your ${tier} account, you are closer than ever to great rewards. We would love to see you again soon. Drop by anytime!\n\n🍽️ See our menu: ${getMenuLink()}\n📱 View points & rewards: ${getPointsLink()}\n\n- JP&Co Team`,
        })
      }

      // 3. Dormant (urgent): 30+ days inactive, 1+ visit
      if (
        daysInactive !== null &&
        daysInactive >= 30 &&
        visits >= 1
      ) {
        const discountValue = daysInactive >= 60 ? 15 : 10

        alerts.push({
          id: `dormant-${customer.id}`,
          type: "dormant",
          severity: "urgent",
          title: `${name} is dormant (${daysInactive} days)`,
          description: `${name} has been away for ${daysInactive} days. They previously had ${visits} visits and spent RM${totalSpent.toFixed(0)}. Immediate win-back action recommended.`,
          customer: customerObj,
          suggestedAction: `Send a win-back message with a special voucher to bring ${name} back.`,
          actionType: "send_and_voucher",
          messageTemplate: `Hi ${name}, it has been a while since your last visit to JP&Co and we truly miss having you! You still have ${points} points as a ${tier} member. We have prepared a special welcome-back offer just for you because you are important to us. We hope to see you again soon!\n\n🍽️ See our menu: ${getMenuLink()}\n📱 View points & rewards: ${getPointsLink()}\n\n- JP&Co Team`,
          voucherSuggestion: {
            name: "Win-Back Offer",
            discount_type: "percentage",
            discount_value: discountValue,
            reason: `Win-back for ${name} (inactive ${daysInactive} days)`,
          },
        })
      }

      // 4. New Not Returned (warning): <=1 visit, 7-29 days inactive, joined within 30 days
      if (
        visits <= 1 &&
        daysInactive !== null &&
        daysInactive >= 7 &&
        daysInactive <= 29 &&
        daysSinceJoined <= 30
      ) {
        alerts.push({
          id: `new_not_returned-${customer.id}`,
          type: "new_not_returned",
          severity: "warning",
          title: `New customer ${name} hasn't returned`,
          description: `${name} joined ${daysSinceJoined} days ago but has only visited ${visits} time(s). Last seen ${daysInactive} days ago. A welcome-back nudge could help build loyalty.`,
          customer: customerObj,
          suggestedAction: `Send a welcome-back message with a small incentive to bring ${name} back for a second visit.`,
          actionType: "send_and_voucher",
          messageTemplate: `Hi ${name}, thank you for visiting JP&Co recently! We noticed you have not been back yet and we would love to welcome you again. As a new member with ${points} points, there is so much more to explore on our menu. Here is a little something to make your next visit even better!\n\n🍽️ See our menu: ${getMenuLink()}\n\n- JP&Co Team`,
          voucherSuggestion: {
            name: "Welcome Back",
            discount_type: "percentage",
            discount_value: 10,
            reason: `Welcome-back incentive for new customer ${name}`,
          },
        })
      }

      // 5. VIP Drop (urgent): total_spent >= 1000, recent30 spending < 50% of avg monthly, avgMonthly > 50
      if (totalSpent >= 1000) {
        // Calculate average monthly spending based on account age
        const monthsActive = Math.max(1, daysSinceJoined / 30)
        const avgMonthly = totalSpent / monthsActive
        const recent30Spending = txMapRecent30[customer.id] || 0

        if (avgMonthly > 50 && recent30Spending < avgMonthly * 0.5) {
          alerts.push({
            id: `vip_drop-${customer.id}`,
            type: "vip_drop",
            severity: "urgent",
            title: `${tier} member ${name}'s spending dropped`,
            description: `${name} (${tier}) averaged RM${avgMonthly.toFixed(0)}/month but only spent RM${recent30Spending.toFixed(0)} in the last 30 days. That is a ${((1 - recent30Spending / avgMonthly) * 100).toFixed(0)}% drop.`,
            customer: customerObj,
            suggestedAction: `Send an exclusive ${tier} offer to re-engage ${name} before they become dormant.`,
            actionType: "send_and_voucher",
            messageTemplate: `Hi ${name}, as one of our valued ${tier} members at JP&Co, we want to make sure you are getting the best experience. With ${points} points and RM${totalSpent.toFixed(0)} total spent, you are one of our most appreciated customers. We have an exclusive ${tier}-level treat waiting for you. Come see us soon!\n\n📱 View points & rewards: ${getPointsLink()}\n\n- JP&Co Team`,
            voucherSuggestion: {
              name: `${tier} Exclusive Offer`,
              discount_type: "percentage",
              discount_value: 15,
              reason: `VIP spending drop recovery for ${name} (${tier})`,
            },
          })
        }
      }

      // 6. Points Milestone (info): points > 0 and within 20% of lowest reward threshold
      if (
        lowestRewardThreshold !== null &&
        points > 0 &&
        points < lowestRewardThreshold &&
        points >= lowestRewardThreshold * 0.8
      ) {
        const pointsNeeded = lowestRewardThreshold - points

        alerts.push({
          id: `points_milestone-${customer.id}`,
          type: "points_milestone",
          severity: "info",
          title: `${name} is close to a reward (${pointsNeeded} points away)`,
          description: `${name} has ${points} points and only needs ${pointsNeeded} more to reach the ${lowestRewardThreshold}-point reward threshold. A quick encouragement could drive a visit.`,
          customer: customerObj,
          suggestedAction: `Send an encouraging message to ${name} about being close to a reward.`,
          actionType: "send_message",
          messageTemplate: `Hi ${name}, great news from JP&Co! You have ${points} points and you are only ${pointsNeeded} points away from unlocking a reward. As a ${tier} member, every visit brings you closer. Why not drop by soon and treat yourself? You are almost there!\n\n📱 View points & rewards: ${getPointsLink()}\n\n- JP&Co Team`,
        })
      }

      // 7. High Value Risk (urgent): top 10% spender + inactive 14-29 days
      if (
        totalSpent >= top10Threshold &&
        daysInactive !== null &&
        daysInactive >= 14 &&
        daysInactive <= 29
      ) {
        // Remove any duplicate going_inactive alert for the same customer
        const goingInactiveIdx = alerts.findIndex(
          (a) =>
            a.type === "going_inactive" && a.customer.id === customer.id
        )
        if (goingInactiveIdx !== -1) {
          alerts.splice(goingInactiveIdx, 1)
        }

        alerts.push({
          id: `high_value_risk-${customer.id}`,
          type: "high_value_risk",
          severity: "urgent",
          title: `High-value customer ${name} at risk`,
          description: `${name} is a top 10% spender (RM${totalSpent.toFixed(0)}) and has been inactive for ${daysInactive} days. Losing this customer would significantly impact revenue.`,
          customer: customerObj,
          suggestedAction: `Send a priority VIP message with a generous voucher to retain ${name}.`,
          actionType: "send_and_voucher",
          messageTemplate: `Hi ${name}, you are one of JP&Co's most valued customers and we have noticed it has been ${daysInactive} days since your last visit. With ${points} points and ${tier} status, you deserve the very best. We have prepared a VIP priority offer exclusively for you. We truly value your loyalty and hope to welcome you back soon!\n\n📱 View points & rewards: ${getPointsLink()}\n\n- JP&Co Team`,
          voucherSuggestion: {
            name: "VIP Priority Offer",
            discount_type: "percentage",
            discount_value: 20,
            reason: `High-value customer retention for ${name} (top 10% spender, ${daysInactive} days inactive)`,
          },
        })
      }

      // 8. Referral Opportunity (info): active (<=14 days), 3+ visits, never referred anyone
      if (
        (daysInactive === null || daysInactive <= 14) &&
        visits >= 3 &&
        !referrerIds.has(customer.id)
      ) {
        alerts.push({
          id: `referral_opportunity-${customer.id}`,
          type: "referral_opportunity",
          severity: "info",
          title: `${name} is a great referral candidate`,
          description: `${name} is an active customer with ${visits} visits and has never referred anyone. Happy customers are the best source of new customers.`,
          customer: customerObj,
          suggestedAction: `Send a referral reminder to ${name} to encourage them to bring friends.`,
          actionType: "send_message",
          messageTemplate: `Hi ${name}, thank you for being such a loyal JP&Co customer with ${visits} visits! Did you know you can share the love? Refer a friend to JP&Co and you will both earn bonus points on top of your ${points} existing points. It is our way of saying thanks for being part of the ${tier} family!\n\n📱 Check your rewards: ${getPointsLink()}\n\n- JP&Co Team`,
        })
      }
    }

    // Sort alerts by severity: urgent first, then warning, then info
    const severityOrder: Record<string, number> = {
      urgent: 0,
      warning: 1,
      info: 2,
    }
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

    // ─── AI ENHANCEMENT LAYER ──────────────────────────────────────────
    // Use AI to generate a strategic overview + personalize the top 5 most
    // important alert messages. This makes Auto-Pilot truly AI-driven.
    let aiOverview: string | null = null
    let aiEnhanced = false
    let aiError: string | null = null

    if (alerts.length > 0) {
      try {
        const topAlerts = alerts.slice(0, 5)
        const alertsForAI = topAlerts.map((a) => ({
          id: a.id,
          type: a.type,
          severity: a.severity,
          title: a.title,
          customer: {
            name: a.customer.name,
            tier: a.customer.tier,
            points: a.customer.points,
            totalSpent: a.customer.totalSpent,
            visits: a.customer.visits,
            lastVisit: a.customer.lastVisit,
          },
        }))

        const businessSnapshot = {
          totalCustomers: allCustomers.length,
          totalAlerts: alerts.length,
          urgent: alerts.filter((a) => a.severity === "urgent").length,
          warning: alerts.filter((a) => a.severity === "warning").length,
          top10SpendThreshold: top10Threshold === Infinity ? 0 : top10Threshold,
        }

        const aiPrompt = `${languageDirective}

You are the JP&Co marketing strategist for a Malaysian F&B business.

Today's business snapshot:
${JSON.stringify(businessSnapshot, null, 2)}

Top 5 customer alerts requiring attention:
${JSON.stringify(alertsForAI, null, 2)}

Your task:
1. Write a 2-3 sentence strategic overview of what the admin should focus on today (in ${userLocale.label})
2. For each of the top 5 alerts, write a personalized, warm WhatsApp message (max 80 words each) in ${userLocale.label} that:
   - Uses the customer's name
   - References specific behavior (visits, spending, tier)
   - Has a clear call-to-action
   - Is warm and human, NOT robotic

The JSON KEYS stay in English ("overview", "messages", "id", "message"), but every STRING VALUE you write MUST be in ${userLocale.label}.

Respond in STRICT JSON format:
{
  "overview": "strategic overview text in ${userLocale.label}",
  "messages": [
    { "id": "alert-id-here", "message": "personalized message in ${userLocale.label}" }
  ]
}

Only return JSON. No markdown, no code fences.

${languageDirective}`

        const aiResult = await callAI({
          messages: [
            { role: "system", content: `${languageDirective}\n\nCurrent date: ${getMalaysiaNow().long} (${getMalaysiaNow().iso}) — Asia/Kuala_Lumpur. Use this as the authoritative "today".\n\nYou are an expert F&B marketing strategist. Respond only with valid JSON. All user-facing string values MUST be in ${userLocale.label} (${userLocale.tag}).\n\n${getRelevantSkills("write a marketing message campaign", "marketing-framework")}` },
            { role: "user", content: aiPrompt },
          ],
          temperature: 0.7,
          maxTokens: 1200,
          maxRetries: 1,
          timeoutMs: 25000,
          totalBudgetMs: 45000,
          jsonMode: true,
        })

        const parsed = JSON.parse(aiResult.content)
        aiOverview = parsed.overview || null

        if (Array.isArray(parsed.messages)) {
          const messageMap = new Map<string, string>()
          for (const m of parsed.messages) {
            if (m.id && m.message) messageMap.set(m.id, m.message)
          }

          for (const alert of alerts) {
            const aiMsg = messageMap.get(alert.id)
            if (aiMsg) {
              const linkSuffix = alert.actionType === "send_and_voucher"
                ? `\n\n📱 View rewards: ${getPointsLink()}\n\n- JP&Co Team`
                : `\n\n📱 View menu: ${getMenuLink()}\n\n- JP&Co Team`
              alert.messageTemplate = aiMsg + linkSuffix
            }
          }
          aiEnhanced = true
        }
      } catch (err: any) {
        console.error("[Auto-Pilot] AI enhancement failed:", err.message)
        aiError = err.message
      }
    }

    // Build summary
    const summary = {
      total: alerts.length,
      urgent: alerts.filter((a) => a.severity === "urgent").length,
      warning: alerts.filter((a) => a.severity === "warning").length,
      info: alerts.filter((a) => a.severity === "info").length,
      byType: {
        birthday: alerts.filter((a) => a.type === "birthday").length,
        going_inactive: alerts.filter((a) => a.type === "going_inactive")
          .length,
        dormant: alerts.filter((a) => a.type === "dormant").length,
        new_not_returned: alerts.filter(
          (a) => a.type === "new_not_returned"
        ).length,
        vip_drop: alerts.filter((a) => a.type === "vip_drop").length,
        points_milestone: alerts.filter(
          (a) => a.type === "points_milestone"
        ).length,
        high_value_risk: alerts.filter(
          (a) => a.type === "high_value_risk"
        ).length,
        referral_opportunity: alerts.filter(
          (a) => a.type === "referral_opportunity"
        ).length,
      },
    }

    return NextResponse.json({
      alerts,
      summary,
      aiOverview,
      aiEnhanced,
      aiError,
    })
  } catch (error: any) {
    console.error("[Auto-Pilot] Error:", error)
    return NextResponse.json(
      { error: "Failed to analyze customers: " + (error.message || "Unknown error") },
      { status: 500 }
    )
  }
}
