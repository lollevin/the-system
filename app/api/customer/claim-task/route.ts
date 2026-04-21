import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { rateLimitResponse } from "@/lib/rate-limit"
import { NextResponse } from "next/server"

type TaskType = "like_share"

const TASK_CONFIG: Record<TaskType, { reason: string; cooldownHours: number; defaultPoints: number }> = {
  like_share: { reason: "like_share_bonus", cooldownHours: 24, defaultPoints: 15 },
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
    return NextResponse.json(
      {
        error: "cooldown",
        message: `You can claim this again in ${cfg.cooldownHours}h`,
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
