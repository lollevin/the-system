import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { StaffTerminal } from "@/components/staff-terminal"

export default async function StaffPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get staff profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile || (profile.role !== "staff" && profile.role !== "admin")) {
    redirect("/pwa")
  }

  return <StaffTerminal user={user} profile={profile} />
}
