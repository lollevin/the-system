import { Metadata, Viewport } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/admin/dashboard-header";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";

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
      <DashboardHeader />
      <main className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8 pb-24 lg:pb-4">
        {children}
      </main>
      <AdminMobileNav />
    </div>
  );
}
