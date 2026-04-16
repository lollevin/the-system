"use client"

import { usePathname } from "next/navigation"
import { AdminSidebar } from "./admin-sidebar"
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav"
import { DashboardHeader } from "@/components/admin/dashboard-header"

const FULL_SCREEN_ROUTES = [
  "/admin",
  "/admin/customer-management",
  "/admin/growth",
  "/admin/settings",
]

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  const isFullScreenRoute = FULL_SCREEN_ROUTES.includes(pathname)

  if (isFullScreenRoute) {
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    )
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
