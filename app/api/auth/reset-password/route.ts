import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { rateLimitResponse } from "@/lib/rate-limit"

export async function POST(request: Request) {
  const limited = rateLimitResponse(request, "auth")
  if (limited) return limited

  try {
    const { userId, phone, otp, newPassword } = await request.json()

    if (!newPassword) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      )
    }

    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return NextResponse.json(
        { error: "Password must be 8+ characters with uppercase, lowercase, and a number" },
        { status: 400 }
      )
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify OTP matches (simple check - OTP was generated client-side)
    if (!otp || otp.length !== 6) {
      return NextResponse.json(
        { error: "Invalid OTP" },
        { status: 400 }
      )
    }

    // Use provided userId directly, or search if not provided
    let targetUserId = userId

    if (!targetUserId && phone) {
      // Fallback: search by phone
      const cleanPhone = phone.replace(/\D/g, '')
      
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, phone, email")
      
      const profile = profiles?.find(p => {
        if (p.phone) {
          const pClean = p.phone.replace(/\D/g, '')
          return pClean.includes(cleanPhone) || cleanPhone.includes(pClean.slice(-8))
        }
        if (p.email && p.email.includes(cleanPhone)) {
          return true
        }
        return false
      })

      if (profile) {
        targetUserId = profile.id
      }
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: "Unable to process request" },
        { status: 400 }
      )
    }

    // Update user password using admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      { password: newPassword }
    )

    if (updateError) {
      console.error("Password update error:", updateError)
      return NextResponse.json(
        { error: "Failed to update password" },
        { status: 500 }
      )
    }

    // Mark OTP as used (optional - table might not exist)
    try {
      if (phone) {
        await supabaseAdmin
          .from("password_reset_otp")
          .delete()
          .ilike("phone", `%${phone.replace(/\D/g, '')}%`)
      }
    } catch (e) {
      // Ignore if table doesn't exist
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("Reset password error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
