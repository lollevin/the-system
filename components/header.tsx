"use client"

import { Button } from "@/components/ui/button"
import { Bell, LogOut, History, Settings } from "lucide-react"
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

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-baseline gap-1">
          <h1 className="text-2xl font-serif font-semibold tracking-wide text-primary">
            JP&Co
          </h1>
          <span className="text-[6px] text-primary/60 tracking-wider align-top relative -top-2">TM</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={onNotificationClick}
            className="relative p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5 text-primary" />
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-accent text-[10px] font-bold flex items-center justify-center text-accent-foreground">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>
          <button
            onClick={onAvatarClick}
            className="p-2 rounded-full hover:bg-secondary transition-colors"
            aria-label="History"
          >
            <History className="h-5 w-5 text-muted-foreground" />
          </button>
          <button 
            onClick={handleLogout}
            className="p-2 rounded-full hover:bg-secondary transition-colors"
            aria-label="Logout"
          >
            <LogOut className="h-5 w-5 text-muted-foreground hover:text-foreground" />
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
