import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { rateLimitResponse } from "@/lib/rate-limit"

// Use service role to bypass RLS for session tracking
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  const limited = rateLimitResponse(request, "session")
  if (limited) return limited
  try {
    const body = await request.json()
    
    const { user_id, started_at, ended_at, duration_seconds } = body

    if (!user_id || !duration_seconds || !UUID_RE.test(user_id)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    if (typeof duration_seconds !== "number" || duration_seconds < 0 || duration_seconds > 86400) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    // Insert session record
    const { error } = await supabase
      .from("user_sessions")
      .insert({
        user_id,
        started_at,
        ended_at,
        duration_seconds: Math.min(duration_seconds, 86400), // Cap at 24h
      })

    if (error) {
      // Table might not exist - that's ok
      console.log("Session tracking error (table may not exist):", error.message)
      return NextResponse.json({ ok: true, note: "session table not ready" })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: true }) // Don't fail on session tracking
  }
}
