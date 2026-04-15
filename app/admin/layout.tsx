import { Metadata, Viewport } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/app/admin/components/admin-sidebar";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { DashboardHeader } from "@/components/admin/dashboard-header";

export const metadata: Metadata = {
  title: "JP&Co - Admin Dashboard",
  description: "Admin dashboard for JP&Co loyalty system",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar for Desktop */}
      <div className="hidden lg:block">
        <AdminSidebar />
      </div>

      {/* Main Content Area - adjusted for sidebar padding on desktop */}
      <div className="lg:pl-64 transition-all duration-300">
        {/* Header - now used for mobile or as a top utility bar */}
        <DashboardHeader />
        
        <main className="px-4 py-4 sm:px-6 lg:px-8 pb-24 lg:pb-4">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden">
        <AdminMobileNav />
      </div>
    </div>
  );
}
