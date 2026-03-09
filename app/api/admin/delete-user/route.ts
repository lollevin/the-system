import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { rateLimitResponse } from "@/lib/rate-limit"

export async function POST(request: Request) {
  const limited = rateLimitResponse(request, "api")
  if (limited) return limited

  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error("Auth error:", authError)
    }
    
    if (!user) {
      return NextResponse.json({ error: "未授权 - 请重新登录" }, { status: 401 })
    }

    // Use admin client to check role (bypass RLS)
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Check admin role using admin client
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError) {
      console.error("Profile check error:", profileError)
      return NextResponse.json({ error: "无法验证权限: " + profileError.message }, { status: 500 })
    }

    if (!profile || (profile.role !== "admin")) {
      console.log("User role:", profile?.role, "Expected: admin")
      return NextResponse.json({ error: `权限不足 (当前角色: ${profile?.role || "未知"})` }, { status: 403 })
    }

    const { userId, deleteType } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "缺少用户ID" }, { status: 400 })
    }

    // Prevent self-deletion
    if (userId === user.id) {
      return NextResponse.json({ error: "不能删除自己的账号" }, { status: 400 })
    }

    if (deleteType === "soft") {
      // Soft delete - change role to customer
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ role: "customer" })
        .eq("id", userId)

      if (error) throw error

      return NextResponse.json({ 
        success: true, 
        message: "已将员工降级为客户" 
      })
    } else {
      // Hard delete - completely remove user
      // Delete from profiles first (due to foreign key)
      const { error: deleteProfileError } = await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", userId)

      if (deleteProfileError) {
        console.error("Profile delete error:", deleteProfileError)
        // Continue anyway to try to delete auth user
      }

      // Delete from auth.users
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId)

      if (deleteAuthError) {
        console.error("Auth delete error:", deleteAuthError)
        return NextResponse.json({ 
          error: "删除认证账号失败: " + deleteAuthError.message 
        }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        message: "账号已完全删除" 
      })
    }
  } catch (error: any) {
    console.error("Delete user error:", error)
    return NextResponse.json(
      { error: error.message || "删除失败" },
      { status: 500 }
    )
  }
}
