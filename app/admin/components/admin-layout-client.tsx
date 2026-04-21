"use client"

import { usePathname } from "next/navigation"
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav"
import { DashboardHeader } from "@/components/admin/dashboard-header"

// Pages that should render full-screen without admin header
const FULL_SCREEN_PAGES = ["/admin", "/admin/shop"]

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isFullScreen = FULL_SCREEN_PAGES.some(p => pathname === p || pathname.startsWith(p + "/"))

  if (isFullScreen) {
    // Render children only - no sidebar, no header (page handles its own layout)
    return <>{children}</>
  }

  // All other admin pages: top header + content (NO left sidebar - navigation is via map overview)
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="px-4 py-4 sm:px-6 lg:px-8 pb-24 lg:pb-6">
        {children}
      </main>
      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden">
        <AdminMobileNav />
      </div>
    </div>
  )
}
