"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Users,
  UserRound,
  Bot,
  Settings,
  LogOut,
  Sparkles,
  BarChart3,
  Gift,
  History,
  Menu,
  X,
  Shield,
  Share2,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/supabase/types";

interface AdminSidebarProps {
  user: User;
  profile: Profile;
}

const navItems = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/admin",
  },
  {
    label: "Analytics",
    icon: BarChart3,
    href: "/admin/analytics",
  },
  {
    label: "Customers",
    icon: UserRound,
    href: "/admin/customer-list",
  },
  {
    label: "Staff Management",
    icon: Users,
    href: "/admin/customers",
  },
  {
    label: "Rewards",
    icon: Gift,
    href: "/admin/rewards",
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
    label: "Share & Earn",
    icon: Share2,
    href: "/admin/referrals",
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

export default function AdminSidebar({ user, profile }: AdminSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleNavClick = (href: string) => {
    router.push(href);
    setIsOpen(false); // Close mobile menu after navigation
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#8b6f47] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-bold text-foreground">JP&co</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 z-40 h-screen w-64 bg-background border-r border-border flex flex-col
        transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:block
      `}>
        {/* Logo - Hidden on mobile (shown in header) */}
        <div className="p-6 hidden lg:block">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8b6f47] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground">JP&co</h1>
              <p className="text-xs text-muted-foreground">Admin Dashboard</p>
            </div>
          </div>
        </div>

        {/* Spacer for mobile header */}
        <div className="h-14 lg:hidden" />

        <Separator className="bg-border hidden lg:block" />

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <button
                key={item.href}
                onClick={() => handleNavClick(item.href)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-[#8b6f47]/10 text-[#8b6f47]"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
                {item.label === "AI Copilot" && (
                  <span className="ml-auto px-2 py-0.5 text-xs bg-[#8b6f47] text-white rounded-full font-semibold">
                    NEW
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <Separator className="bg-border" />

        {/* User Info & Logout */}
        <div className="p-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
            <div className="w-10 h-10 rounded-full bg-[#8b6f47] flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {profile.full_name?.charAt(0) || user.email?.charAt(0) || "A"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate text-foreground">
                {profile.full_name || "Admin"}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
