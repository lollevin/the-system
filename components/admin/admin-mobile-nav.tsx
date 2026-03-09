"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Bot, MessageSquare, Users, Gift, Settings } from "lucide-react"
import { useLanguage } from "@/lib/i18n"

export function AdminMobileNav() {
  const pathname = usePathname()
  const { t } = useLanguage()

  const navItems = [
    { href: "/admin", icon: LayoutDashboard, label: t("admin", "overview") },
    { href: "/admin/ai", icon: Bot, label: t("admin", "ai") },
    { href: "/admin/customers", icon: Users, label: t("admin", "staffManagement").split(" ")[0] },
    { href: "/admin/rewards", icon: Gift, label: t("admin", "rewards") },
    { href: "/admin/settings", icon: Settings, label: t("common", "settings") },
  ]

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-inset-bottom">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/admin" && pathname.startsWith(item.href))
          const Icon = item.icon
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                isActive 
                  ? "text-[#8b6f47]" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "text-[#8b6f47]" : ""}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#8b6f47]" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
