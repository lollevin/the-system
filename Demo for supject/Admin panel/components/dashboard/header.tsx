"use client"

import { AvatarFallback } from "@/components/ui/avatar"

import { AvatarImage } from "@/components/ui/avatar"

import { Avatar } from "@/components/ui/avatar"

import { Button } from "@/components/ui/button"
import { Bell, LogOut, Settings } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#A17755]">
            <span className="text-sm font-bold text-white">JP</span>
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
        <Button variant="ghost" size="icon" className="bg-[#A17755] text-white hover:bg-[#8A6548] rounded-lg">
          <LogOut className="h-5 w-5" />
          <span className="sr-only">Logout</span>
        </Button>
      </div>
    </header>
  )
}
