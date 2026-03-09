"use client"

import { Button } from "@/components/ui/button"
import { LogOut, Settings } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { AdminNotifications } from "@/components/admin/admin-notifications"
import { useLanguage } from "@/lib/i18n"

export function DashboardHeader() {
  const router = useRouter()
  const supabase = createClient()
  const { t } = useLanguage()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success(t("common", "success"))
    router.push("/")
  }

  return (
    <header className="flex items-center justify-between border-b border-border/50 bg-background px-4 md:px-6 h-14">
      <Link href="/admin" className="flex items-center gap-3">
        <Image
          src="/Logo/w768.png"
          alt="JP&Co Logo"
          width={36}
          height={36}
          className="rounded-xl shadow-md"
        />
        <div>
          <h1 className="text-base font-bold text-foreground leading-tight">JP&Co</h1>
          <p className="text-[10px] text-muted-foreground leading-none">{t("admin", "dashboard")}</p>
        </div>
      </Link>

      <div className="flex items-center gap-2">
        <AdminNotifications />
        <Link href="/admin/settings">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-9 w-9">
            <Settings className="h-4.5 w-4.5" />
          </Button>
        </Link>
        <Button 
          onClick={handleLogout}
          variant="ghost" 
          size="icon" 
          className="bg-[#8b6f47] text-white hover:bg-[#7a5f3a] rounded-lg h-9 w-9"
        >
          <LogOut className="h-4.5 w-4.5" />
        </Button>
      </div>
    </header>
  )
}
