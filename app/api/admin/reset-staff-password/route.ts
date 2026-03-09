import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    // Use admin client
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Check admin role
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "权限不足" }, { status: 403 })
    }

    const { userId, newPassword } = await request.json()

    if (!userId || !newPassword) {
      return NextResponse.json({ error: "缺少参数" }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "密码至少6位" }, { status: 400 })
    }

    // Reset password using admin API
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    })

    if (error) {
      console.error("Password reset error:", error)
      return NextResponse.json({ error: "重置密码失败: " + error.message }, { status: 500 })
    }

    // Update notes with new password for display
    await supabaseAdmin
      .from("profiles")
      .update({ notes: `pwd:${newPassword}` })
      .eq("id", userId)

    return NextResponse.json({ 
      success: true, 
      message: "密码已重置" 
    })
  } catch (error: any) {
    console.error("Reset password error:", error)
    return NextResponse.json(
      { error: error.message || "重置失败" },
      { status: 500 }
    )
  }
}
