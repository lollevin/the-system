import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { MenuManager } from "@/components/admin/menu-manager"

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
      <div>
        <h1 className="text-2xl font-bold">Menu Management</h1>
        <p className="text-muted-foreground">Add, edit, or remove menu items</p>
      </div>
      
      <MenuManager initialItems={menuItems || []} />
    </div>
  )
}
