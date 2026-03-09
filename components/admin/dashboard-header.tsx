"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { LogOut, Settings, Menu, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { AdminNotifications } from "@/components/admin/admin-notifications"
import { useLanguage } from "@/lib/i18n"

export function DashboardHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { t } = useLanguage()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { href: "/admin", label: t("admin", "overview") },
    { href: "/admin/ai", label: t("admin", "ai") },
  ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success(t("common", "success"))
    router.push("/")
  }

  return (
    <>
      <header className="flex items-center justify-between border-b border-border/50 bg-background px-4 md:px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-3">
            <Image
              src="/Logo/w768.png"
              alt="JP&Co Logo"
              width={40}
              height={40}
              className="rounded-xl shadow-md"
            />
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-foreground">JP&Co</h1>
              <p className="text-xs text-muted-foreground">{t("admin", "dashboard")}</p>
            </div>
          </Link>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-6 lg:flex">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/admin" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm transition-colors px-3 py-2 rounded-lg ${
                  isActive
                    ? "text-[#8b6f47] font-medium bg-[#8b6f47]/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          <AdminNotifications />
          <Link href="/admin/settings">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Settings className="h-5 w-5" />
              <span className="sr-only">{t("common", "settings")}</span>
            </Button>
          </Link>
          <Button 
            onClick={handleLogout}
            variant="ghost" 
            size="icon" 
            className="bg-[#8b6f47] text-white hover:bg-[#7a5f3a] rounded-lg"
          >
            <LogOut className="h-5 w-5" />
            <span className="sr-only">{t("common", "logout")}</span>
          </Button>
          {/* Mobile Menu Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-background border-b border-border/50 px-4 py-3">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== "/admin" && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-sm transition-colors px-4 py-3 rounded-lg ${
                    isActive
                      ? "text-[#8b6f47] font-medium bg-[#8b6f47]/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      )}
    </>
  )
}
