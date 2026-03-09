import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CustomerApp } from "@/components/customer-app"

export default async function PWAPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get customer profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  // If profile doesn't exist, create a basic one
  let customerProfile = profile
  if (!profile) {
    // Try to create profile for new user
    const { data: newProfile, error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        email: user.email,
        role: "customer",
        points_balance: 0,
        total_spent: 0,
        visit_count: 0,
      })
      .select()
      .single()
    
    if (error) {
      redirect("/login")
    }
    customerProfile = newProfile
  }

  // If user is admin or staff, redirect them to their portal
  if (customerProfile?.role === "admin") {
    redirect("/admin")
  }
  if (customerProfile?.role === "staff") {
    redirect("/staff")
  }

  return (
    <Suspense>
      <CustomerApp user={user} profile={customerProfile!} />
    </Suspense>
  )
}
