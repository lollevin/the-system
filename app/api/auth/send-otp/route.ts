import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { rateLimitResponse } from "@/lib/rate-limit"
import crypto from "crypto"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  const limited = rateLimitResponse(request, "auth")
  if (limited) return limited

  try {
    const { phone } = await request.json()

    if (!phone || typeof phone !== "string") {
      return NextResponse.json({ error: "Phone is required" }, { status: 400 })
    }

    const cleanPhone = phone.replace(/\D/g, "")

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, phone, email")

    const profile = profiles?.find((p) => {
      if (p.phone) {
        const pClean = p.phone.replace(/\D/g, "")
        return pClean.includes(cleanPhone) || cleanPhone.includes(pClean.slice(-8))
      }
      if (p.email && p.email.includes(cleanPhone)) {
        return true
      }
      return false
    })

    if (!profile) {
      return NextResponse.json({ success: true })
    }

    const otp = crypto.randomInt(100000, 999999).toString()

    await supabaseAdmin
      .from("password_reset_otp")
      .upsert(
        {
          phone: cleanPhone,
          otp,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          used: false,
        },
        { onConflict: "phone" }
      )

    return NextResponse.json({
      success: true,
      userId: profile.id,
      otp,
    })
  } catch (error) {
    console.error("Send OTP error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
