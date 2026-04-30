import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { rateLimitResponse } from "@/lib/rate-limit"
import type { SurveyAnswer, SurveyConfig } from "@/lib/supabase/types"

type SubmitBody = {
  answers?: Record<string, string>
}

const DEFAULT_SURVEY: SurveyConfig = {
  enabled: false,
  title: "Tell us what you like",
  description: "Complete this quick survey and receive a voucher.",
  voucher_id: "",
  survey_version: "default",
  questions: [],
}

function normalizeSurveyConfig(value: any): SurveyConfig {
  const merged = { ...DEFAULT_SURVEY, ...(value || {}) }
  return {
    ...merged,
    enabled: Boolean(merged.enabled),
    voucher_id: String(merged.voucher_id || ""),
    survey_version: String(merged.survey_version || "default"),
    questions: Array.isArray(merged.questions)
      ? merged.questions
          .map((q: any) => ({
            id: String(q.id || ""),
            prompt: String(q.prompt || "").trim(),
            options: Array.isArray(q.options)
              ? q.options.map((o: any) => String(o || "").trim()).filter(Boolean)
              : [],
          }))
          .filter((q: any) => q.id && q.prompt && q.options.length >= 2)
      : [],
  }
}

function generateVoucherCode() {
  const time = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase()
  return `SV${time}${rand}`
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

  let body: SubmitBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: setting, error: settingError } = await admin
    .from("global_settings")
    .select("value")
    .eq("key", "survey_config")
    .maybeSingle()

  if (settingError) {
    return NextResponse.json({ error: "Failed to load survey", detail: settingError.message }, { status: 500 })
  }

  const config = normalizeSurveyConfig(setting?.value)
  if (!config.enabled) {
    return NextResponse.json({ error: "survey_disabled", message: "Survey is not available now." }, { status: 400 })
  }
  if (!config.voucher_id) {
    return NextResponse.json({ error: "missing_voucher", message: "Survey reward voucher is not configured." }, { status: 400 })
  }
  if (config.questions.length === 0) {
    return NextResponse.json({ error: "missing_questions", message: "Survey questions are not configured." }, { status: 400 })
  }

  const answers = body.answers || {}
  const normalizedAnswers: SurveyAnswer[] = []

  for (const question of config.questions) {
    const answer = String(answers[question.id] || "").trim()
    if (!answer) {
      return NextResponse.json({ error: "incomplete", message: "Please answer all questions." }, { status: 400 })
    }
    if (!question.options.includes(answer)) {
      return NextResponse.json({ error: "invalid_answer", message: "Please choose a valid survey answer." }, { status: 400 })
    }
    normalizedAnswers.push({
      question_id: question.id,
      prompt: question.prompt,
      answer,
    })
  }

  const { data: existing } = await admin
    .from("survey_responses")
    .select("id")
    .eq("user_id", user.id)
    .eq("survey_version", config.survey_version)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: "already_submitted", message: "You have already completed this survey." },
      { status: 409 }
    )
  }

  const { data: voucher, error: voucherError } = await admin
    .from("vouchers")
    .select("id, code, name, valid_until, is_active, max_uses, uses_count")
    .eq("id", config.voucher_id)
    .maybeSingle()

  if (voucherError || !voucher) {
    return NextResponse.json({ error: "voucher_not_found", message: "Reward voucher was not found." }, { status: 400 })
  }
  if (!voucher.is_active) {
    return NextResponse.json({ error: "voucher_inactive", message: "Reward voucher is not active." }, { status: 400 })
  }
  if (new Date(voucher.valid_until).getTime() <= Date.now()) {
    return NextResponse.json({ error: "voucher_expired", message: "Reward voucher has expired." }, { status: 400 })
  }
  if (voucher.max_uses && (voucher.uses_count || 0) >= voucher.max_uses) {
    return NextResponse.json({ error: "voucher_limit", message: "Reward voucher limit has been reached." }, { status: 400 })
  }

  const { data: responseRow, error: responseError } = await admin
    .from("survey_responses")
    .insert({
      user_id: user.id,
      voucher_id: voucher.id,
      survey_version: config.survey_version,
      answers: normalizedAnswers,
    })
    .select("id")
    .single()

  if (responseError) {
    const isDuplicate = responseError.code === "23505"
    return NextResponse.json(
      {
        error: isDuplicate ? "already_submitted" : "response_failed",
        message: isDuplicate
          ? "You have already completed this survey."
          : "Failed to save survey response.",
        detail: responseError.message,
      },
      { status: isDuplicate ? 409 : 500 }
    )
  }

  const code = generateVoucherCode()
  const { data: userVoucher, error: issueError } = await admin
    .from("user_vouchers")
    .insert({
      user_id: user.id,
      voucher_id: voucher.id,
      code,
      expires_at: voucher.valid_until,
    })
    .select("id, code, expires_at")
    .single()

  if (issueError) {
    await admin.from("survey_responses").delete().eq("id", responseRow.id)
    return NextResponse.json(
      { error: "voucher_issue_failed", message: "Failed to issue reward voucher.", detail: issueError.message },
      { status: 500 }
    )
  }

  await admin
    .from("vouchers")
    .update({ uses_count: (voucher.uses_count || 0) + 1 })
    .eq("id", voucher.id)

  await admin.from("transactions").insert({
    user_id: user.id,
    type: "earn",
    points: 0,
    reason: `survey_voucher_reward: ${voucher.name}`,
  })

  return NextResponse.json({
    success: true,
    voucher: {
      id: userVoucher.id,
      code: userVoucher.code,
      expires_at: userVoucher.expires_at,
      name: voucher.name,
    },
  })
}
