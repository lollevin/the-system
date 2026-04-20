"use client"

import { usePathname } from "next/navigation"
import { AdminSidebar } from "@/app/admin/components/admin-sidebar"
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav"
import { DashboardHeader } from "@/components/admin/dashboard-header"

// Pages that should render full-screen without admin sidebar/header
const FULL_SCREEN_PAGES = ["/admin/shop"]

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isFullScreen = FULL_SCREEN_PAGES.some(p => pathname === p || pathname.startsWith(p + "/"))

  if (isFullScreen) {
    // Render children only - no sidebar, no header
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden lg:block">
        <AdminSidebar />
      </div>
      <div className="lg:pl-64 transition-all duration-300">
        <DashboardHeader />
        <main className="px-4 py-4 sm:px-6 lg:px-8 pb-24 lg:pb-4">
          {children}
        </main>
      </div>
      <div className="lg:hidden">
        <AdminMobileNav />
      </div>
    </div>
  )
}
