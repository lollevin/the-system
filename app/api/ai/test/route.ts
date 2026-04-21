import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { pingAI, PRIMARY_MODEL, FALLBACK_MODELS } from "@/lib/ai-client"

export const maxDuration = 60
export const dynamic = "force-dynamic"

export async function GET(_request: NextRequest) {
  try {
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

    const hasKey = !!process.env.OPENAI_API_KEY
    const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"

    if (!hasKey) {
      return NextResponse.json({
        ok: false,
        configured: false,
        error: "OPENAI_API_KEY is not set",
        baseUrl,
        primaryModel: PRIMARY_MODEL,
        fallbackModels: FALLBACK_MODELS,
      })
    }

    const result = await pingAI()

    return NextResponse.json({
      ok: result.ok,
      configured: true,
      baseUrl,
      primaryModel: PRIMARY_MODEL,
      fallbackModels: FALLBACK_MODELS,
      workingModel: result.model,
      latencyMs: result.latencyMs,
      error: result.error,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[AI Test] Error:", error)
    return NextResponse.json(
      { ok: false, error: error.message || "Unknown error" },
      { status: 500 }
    )
  }
}
