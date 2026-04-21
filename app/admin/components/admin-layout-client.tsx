"use client"

import { usePathname } from "next/navigation"
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav"
import { DashboardHeader } from "@/components/admin/dashboard-header"

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // Only /admin (map overview) and /admin/shop are full-screen pages.
  // All other admin pages need the header with back button + page title.
  const isFullScreen =
    pathname === "/admin" ||
    pathname === "/admin/shop" ||
    pathname.startsWith("/admin/shop/")

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
