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
      // Get user profile to determine redirect
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile) {
        const redirectPath = getRedirectPath(profile.role);
        return NextResponse.redirect(new URL(redirectPath, request.url));
      }
    }
    return response;
  }

  // Protected routes - require authentication
  if (!user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Get user profile for role-based access
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // If profile doesn't exist or error, default to customer access
  // This allows new users to access /pwa even if profile isn't fully created yet
  const role = profile?.role || "customer";
  
  console.log("Middleware - User:", user.id, "Profile:", profile, "Error:", profileError, "Role:", role);

  // Role-based route protection
  if (pathname.startsWith("/admin") && role !== "admin") {
    // Non-admin trying to access admin routes
    const redirectPath = getRedirectPath(role);
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  if (pathname.startsWith("/staff") && role !== "staff" && role !== "admin") {
    // Non-staff trying to access staff routes (admin can access staff routes)
    const redirectPath = getRedirectPath(role);
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  // Allow everyone to access /pwa - the page will handle role-based redirects if needed
  // This prevents redirect loops for new users

  return response;
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
