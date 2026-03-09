import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { rateLimitResponse } from "@/lib/rate-limit"

export async function POST(request: Request) {
  // Rate limit: 10 req/min for auth
  const limited = rateLimitResponse(request, "auth")
  if (limited) return limited

  try {
    const { phone } = await request.json()

    if (!phone) {
      return NextResponse.json({ error: "Phone required" }, { status: 400 })
    }

    // Create admin client
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

    const cleanPhone = phone.replace(/\D/g, '')
    const fakeEmail = `user${cleanPhone}@jpco-member.com`

    console.log("Admin searching for:", { cleanPhone, fakeEmail })

    // Method 1: Search profiles by phone (various formats)
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, phone, email")
    
    console.log("All profiles:", profiles)

    // Find matching profile
    let profile = profiles?.find(p => {
      // Match by phone (any format)
      if (p.phone) {
        const pClean = p.phone.replace(/\D/g, '')
        if (pClean.includes(cleanPhone) || cleanPhone.includes(pClean)) {
          return true
        }
      }
      // Match by fake email
      if (p.email && p.email.includes(cleanPhone)) {
        return true
      }
      return false
    })

    if (profile) {
      // Update phone if missing
      if (!profile.phone || !profile.phone.startsWith('+')) {
        const formattedPhone = cleanPhone.startsWith('01') 
          ? '+60' + cleanPhone.substring(1)
          : '+60' + cleanPhone
        
        await supabaseAdmin
          .from("profiles")
          .update({ 
            phone: formattedPhone,
            email: profile.email?.includes('@jpco-member.com') ? null : profile.email
          })
          .eq("id", profile.id)
        
        profile.phone = formattedPhone
      }
      
      return NextResponse.json({ profile })
    }

    // Method 2: Search auth.users by email
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
    
    const authUser = authUsers?.users?.find(u => 
      u.email === fakeEmail || u.email?.includes(cleanPhone)
    )

    if (authUser) {
      // Get or create profile
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single()

      if (existingProfile) {
        // Update phone
        const formattedPhone = cleanPhone.startsWith('01') 
          ? '+60' + cleanPhone.substring(1)
          : '+60' + cleanPhone

        await supabaseAdmin
          .from("profiles")
          .update({ phone: formattedPhone, email: null })
          .eq("id", authUser.id)

        return NextResponse.json({ 
          profile: { ...existingProfile, phone: formattedPhone } 
        })
      }
    }

    return NextResponse.json({ profile: null })

  } catch (error: any) {
    console.error("Find user error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
