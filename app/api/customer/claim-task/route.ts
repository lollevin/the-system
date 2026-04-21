import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { rateLimitResponse } from "@/lib/rate-limit"
import { NextResponse } from "next/server"

type TaskType = "like_share" | "daily_checkin" | "birthday_gift"

const TASK_CONFIG: Record<TaskType, { reason: string; cooldownHours: number; defaultPoints: number }> = {
  like_share: { reason: "like_share_bonus", cooldownHours: 24, defaultPoints: 15 },
  daily_checkin: { reason: "Daily Check-in", cooldownHours: 24, defaultPoints: 10 },
  // Birthday: cooldown = 1 year (365 days = 8760 hours) so can only claim once per year
  birthday_gift: { reason: "Birthday Gift", cooldownHours: 24 * 365, defaultPoints: 100 },
}

export async function POST(request: Request) {
  const limited = rateLimitResponse(request, "api")
  if (limited) return limited

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { task?: TaskType }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const task = body.task
  if (!task || !TASK_CONFIG[task]) {
    return NextResponse.json({ error: "Invalid task" }, { status: 400 })
  }

  const admin = createAdminClient()
  const cfg = TASK_CONFIG[task]

  // Extra validation for birthday claim: user must have a birthday set and it must be their actual birthday month
  if (task === "birthday_gift") {
    const { data: profile } = await admin
      .from("profiles")
      .select("birthday")
      .eq("id", user.id)
      .single()

    if (!profile?.birthday) {
      return NextResponse.json(
        {
          error: "no_birthday",
          message: "Please set your birthday first before claiming this reward.",
        },
        { status: 400 }
      )
    }

    // Check birthday month/day matches today (within 7-day window around birthday)
    const bday = new Date(profile.birthday)
    const today = new Date()
    const thisYearBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate())
    const diffDays = Math.abs(
      (today.getTime() - thisYearBday.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (diffDays > 7) {
      return NextResponse.json(
        {
          error: "not_birthday",
          message: `Your birthday gift will be available within 7 days of your birthday (${bday.toLocaleDateString(undefined, { month: "long", day: "numeric" })}).`,
        },
        { status: 400 }
      )
    }
  }

  // Check cooldown - was this task claimed recently?
  const cutoff = new Date(Date.now() - cfg.cooldownHours * 60 * 60 * 1000).toISOString()
  const { data: recent } = await admin
    .from("transactions")
    .select("id, created_at")
    .eq("user_id", user.id)
    .eq("reason", cfg.reason)
    .gte("created_at", cutoff)
    .limit(1)

  if (recent && recent.length > 0) {
    const hoursLeft = cfg.cooldownHours >= 24 * 30
      ? "until next year"
      : cfg.cooldownHours >= 24
        ? "tomorrow"
        : `in ${cfg.cooldownHours}h`
    return NextResponse.json(
      {
        error: "cooldown",
        message: `You've already claimed this. Come back ${hoursLeft}.`,
      },
      { status: 429 }
    )
  }

  // Fetch configured point value from admin settings
  let pointsToAward = cfg.defaultPoints
  try {
    const { data: settingsData } = await admin
      .from("global_settings")
      .select("value")
      .eq("key", "rewards_config")
      .maybeSingle()
    if (settingsData?.value && typeof settingsData.value[task] === "number") {
      pointsToAward = settingsData.value[task]
    }
  } catch {
    // Fall back to default points
  }

  if (pointsToAward <= 0) {
    return NextResponse.json({ error: "Task disabled by admin" }, { status: 400 })
  }

  // Fetch current points
  const { data: profile } = await admin
    .from("profiles")
    .select("points_balance")
    .eq("id", user.id)
    .single()

  const currentPoints = profile?.points_balance || 0
  const newBalance = currentPoints + pointsToAward

  // Record transaction
  const { error: txError } = await admin.from("transactions").insert({
    user_id: user.id,
    type: "earn",
    points: pointsToAward,
    reason: cfg.reason,
  })

  if (txError) {
    return NextResponse.json(
      { error: "Failed to record transaction", detail: txError.message },
      { status: 500 }
    )
  }

  // Update profile
  const { error: updateError } = await admin
    .from("profiles")
    .update({ points_balance: newBalance })
    .eq("id", user.id)

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update points", detail: updateError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    points: pointsToAward,
    new_balance: newBalance,
  })
}
