"use client"

import { Button } from "@/components/ui/button"
import { Bell, LogOut, Settings } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/supabase/types"

// ============================================
// Customer Header (for PWA)
// ============================================
interface HeaderProps {
  profile: Profile
  notificationCount?: number
  onNotificationClick?: () => void
  onAvatarClick?: () => void
}

export function Header({ profile, notificationCount = 0, onNotificationClick, onAvatarClick }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const initial = profile.full_name
    ? profile.full_name[0].toUpperCase()
    : (profile.email?.[0] || "U").toUpperCase()

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-baseline">
          <h1 className="text-xl font-extrabold tracking-tighter" style={{ color: "#9A7B4F" }}>
            JP&amp;Co
          </h1>
          <span className="text-[10px] ml-0.5 align-top" style={{ color: "#9A7B4F" }}>™</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onNotificationClick}
            className="relative p-2 bg-gray-50 rounded-full"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5 text-gray-600" />
            {notificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center text-white">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </button>
          <button
            onClick={onAvatarClick}
            className="p-2 bg-gray-50 rounded-full"
            aria-label="Profile"
          >
            <div
              className="h-5 w-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold"
              style={{ borderColor: "#9A7B4F", color: "#9A7B4F" }}
            >
              {initial}
            </div>
          </button>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-400"
            aria-label="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  )
}

// ============================================
// Dashboard Header (for Admin)
// ============================================
export function DashboardHeader() {
  const pathname = usePathname()

  const navItems = [
    { href: "/", label: "Overview" },
    { href: "/analytics", label: "Analytics" },
    { href: "/campaigns", label: "Campaigns" },
    { href: "/members", label: "Members" },
    { href: "/settings", label: "Settings" },
  ]

  return (
    <header className="flex items-center justify-between border-b border-border/50 bg-background px-6 py-4">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
            <span className="text-sm font-bold text-background">JP</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">JP&CO</h1>
            <p className="text-xs text-muted-foreground">Manager Dashboard</p>
          </div>
        </Link>
      </div>

      <nav className="hidden items-center gap-6 md:flex">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm transition-colors ${
                isActive
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <LogOut className="h-5 w-5" />
          <span className="sr-only">Logout</span>
        </Button>
      </div>
    </header>
  )
}
