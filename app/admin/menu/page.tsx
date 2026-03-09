import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { MenuManager } from "@/components/admin/menu-manager"
import { PageHeader } from "@/components/admin/page-header"

export default async function AdminMenuPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "admin") {
    redirect("/")
  }

  // Fetch all menu items
  const { data: menuItems } = await supabase
    .from("menu_items")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true })

  return (
    <div className="space-y-6">
      <PageHeader titleKey="menuManagement" descKey="menuManagementDesc" />
      
      <MenuManager initialItems={menuItems || []} />
    </div>
  )
}
