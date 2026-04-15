"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  Users, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  UserRound,
  History,
  Bot,
  BookOpen,
  Shield,
  Megaphone,
  Heart,
  Store
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";

export function AdminSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const menuItems = [
    {
      label: "Overview Maps",
      icon: LayoutDashboard,
      href: "/admin",
    },
    {
      label: "Customer Hub",
      icon: Heart,
      href: "/admin/growth",
    },
    {
      label: "Customer List",
      icon: UserRound,
      href: "/admin/customer-list",
    },
    {
      label: "Menu Management",
      icon: UtensilsCrossed,
      href: "/admin/menu",
    },
    {
      label: "App Banner",
      icon: Megaphone,
      href: "/admin/banner",
    },
    {
      label: "Staff Management",
      icon: Users,
      href: "/admin/customers",
    },
    {
      label: "Transactions",
      icon: History,
      href: "/admin/transactions",
    },
    {
      label: "AI Copilot",
      icon: Bot,
      href: "/admin/ai",
    },
    {
      label: "Knowledge Base",
      icon: BookOpen,
      href: "/admin/knowledge-base",
    },
    {
      label: "Staff Monitor",
      icon: Shield,
      href: "/admin/staff",
    },
    {
      label: "Settings",
      icon: Settings,
      href: "/admin/settings",
    },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    router.push("/login");
  };

  return (
    <>
      <aside 
        className={`fixed left-0 top-0 z-40 h-screen border-r border-border bg-card transition-all duration-300 ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo Section */}
          <div className="flex items-center gap-3 p-6">
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-xl shadow-lg shadow-primary/20">
              <Image
                src="/Logo/w768.png"
                alt="JP&Co"
                fill
                className="object-cover"
              />
            </div>
            {!isCollapsed && (
              <span className="text-xl font-extrabold tracking-tight text-foreground">
                JP&Co
              </span>
            )}
          </div>

          {/* Navigation Section */}
          <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto overflow-x-hidden">
            {menuItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all group ${
                    isActive
                      ? "bg-[#8b6f47] text-white shadow-lg shadow-[#8b6f47]/20"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <item.icon className={`h-5 w-5 shrink-0 ${isActive ? "" : "group-hover:scale-110 transition-transform"}`} />
                  {!isCollapsed && (
                    <span className="text-sm font-semibold tracking-wide whitespace-nowrap">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer Section */}
          <div className="border-t border-border p-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </Button>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate text-foreground">Administrator</p>
                  <p className="text-xs text-muted-foreground truncate">Admin Panel</p>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="shrink-0 text-muted-foreground hover:text-red-500 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
