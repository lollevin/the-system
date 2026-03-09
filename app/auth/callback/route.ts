import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Update last_visit on login
      await supabase
        .from("profiles")
        .update({ last_visit: new Date().toISOString() })
        .eq("id", data.user.id);

      // Get user profile to determine redirect
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      let redirectPath = "/pwa";
      if (profile) {
        redirectPath =
          profile.role === "admin"
            ? "/admin"
            : profile.role === "staff"
            ? "/staff"
            : "/pwa";
      }

      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
