"use client"

import { Button } from "@/components/ui/button"
import { LogOut, Settings, ArrowLeft } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { AdminNotifications } from "@/components/admin/admin-notifications"
import { useLanguage } from "@/lib/i18n"

export function DashboardHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const { t } = useLanguage()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success(t("common", "success"))
    router.push("/")
  }

  // Map pathname → page title
  const pageTitle = (() => {
    if (pathname === "/admin") return null
    if (pathname.startsWith("/admin/ai")) return t("admin", "ai")
    if (pathname.startsWith("/admin/customer-management")) return t("admin", "customerManagement")
    if (pathname.startsWith("/admin/settings")) return t("admin", "settings")
    if (pathname.startsWith("/admin/customer-list")) return t("admin", "customers")
    if (pathname.startsWith("/admin/rewards")) return t("admin", "rewards")
    if (pathname.startsWith("/admin/referrals")) return "Share & Earn"
    return null
  })()

  const isSubPage = pageTitle !== null

  return (
    <header className="flex items-center justify-between border-b border-border/50 bg-background px-4 md:px-6 h-14 sticky top-0 z-40">
      <div className="flex items-center gap-2 min-w-0">
        {isSubPage ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/admin")}
              className="h-9 w-9 rounded-lg hover:bg-[#8b6f47]/10 shrink-0"
              title={t("admin", "overview")}
            >
              <ArrowLeft className="h-5 w-5 text-[#8b6f47]" />
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              <Image
                src="/Logo/w768.png"
                alt="JP&Co Logo"
                width={28}
                height={28}
                className="rounded-lg shadow-sm hidden sm:block"
              />
              <h1 className="text-base sm:text-lg font-bold text-foreground leading-tight truncate">
                {pageTitle}
              </h1>
            </div>
          </>
        ) : (
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
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <AdminNotifications />
        {pathname !== "/admin/settings" && (
          <Link href="/admin/settings">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-9 w-9">
              <Settings className="h-4.5 w-4.5" />
            </Button>
          </Link>
        )}
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
