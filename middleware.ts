import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);

  const { pathname } = request.nextUrl;

  // Public routes that don't need authentication
  const publicRoutes = ["/", "/login", "/auth/callback", "/auth/confirm"];
  
  // Welcome page - always allow access
  if (pathname === "/") {
    return response;
  }
  
  if (publicRoutes.some((route) => pathname.startsWith(route) && route !== "/")) {
    // If user is already logged in and tries to access login page
    if (user && pathname === "/login") {
      const role = await getUserRole(user, supabase);
      const redirectPath = getRedirectPath(role);
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }
    return response;
  }

  // Protected routes - require authentication
  if (!user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 优化：优先从 app_metadata 读取角色，避免每次查询数据库
  const role = await getUserRole(user, supabase);

  // Role-based route protection
  if (pathname.startsWith("/admin") && role !== "admin") {
    const redirectPath = getRedirectPath(role);
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  if (pathname.startsWith("/staff") && role !== "staff" && role !== "admin") {
    const redirectPath = getRedirectPath(role);
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  return response;
}

/**
 * 优化的角色获取函数
 * 1. 优先从 user.app_metadata.role 读取（无数据库查询）
 * 2. 如果没有，查询数据库并同步到 app_metadata
 */
async function getUserRole(user: any, supabase: any): Promise<string> {
  // 1. 优先从 app_metadata 读取
  const cachedRole = user.app_metadata?.role;
  if (cachedRole && ["admin", "staff", "customer"].includes(cachedRole)) {
    return cachedRole;
  }

  // 2. 后备：查询数据库
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role || "customer";

  // 3. 异步同步到 app_metadata（下次请求就不需要查询了）
  // 注意：这是后台操作，不阻塞当前请求
  if (role !== cachedRole) {
    supabase.auth.admin.updateUserById(user.id, {
      app_metadata: { role }
    }).catch(() => {
      // 忽略错误（可能没有 admin 权限）
      // 在这种情况下，我们使用 service role 在服务端同步
    });
  }

  return role;
}

function getRedirectPath(role: string): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "staff":
      return "/staff";
    case "customer":
    default:
      return "/pwa";
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|site.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
