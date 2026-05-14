"use client"

import { Home, UtensilsCrossed, Gift, User } from "lucide-react"
import { useLanguage } from "@/lib/i18n"

export type MainTab = "home" | "menu" | "rewards" | "me"

interface BottomTabBarProps {
  activeTab: MainTab
  onTabChange: (tab: MainTab) => void
}

export function BottomTabBar({ activeTab, onTabChange }: BottomTabBarProps) {
  const { t } = useLanguage()

  const tabs: { id: MainTab; icon: typeof Home; label: string }[] = [
    { id: "home", icon: Home, label: t("customer", "home") },
    { id: "menu", icon: UtensilsCrossed, label: t("customer", "menu") },
    { id: "rewards", icon: Gift, label: t("customer", "rewards") },
    { id: "me", icon: User, label: t("customer", "me") },
  ]

  return (
    <>
      {/* Spacer to prevent content from being hidden behind the nav bar */}
      <div className="h-20" aria-hidden />

      <nav
        className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 bg-white border-t border-gray-100 sm:max-w-lg"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex justify-between items-end px-6 py-4">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="flex flex-col items-center gap-1 transition-all active:scale-95"
              >
                {isActive ? (
                  <div
                    className="p-2 rounded-xl"
                    style={{ background: "#9A7B4F", boxShadow: "0 4px 6px -1px rgba(154,123,79,0.2)" }}
                  >
                    <Icon className="h-5 w-5 text-white" strokeWidth={2.5} />
                  </div>
                ) : (
                  <Icon className="h-6 w-6 text-gray-400" strokeWidth={2} />
                )}
                <span
                  className="text-[10px] font-bold uppercase"
                  style={{ color: isActive ? "#9A7B4F" : "#9ca3af" }}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full mt-0.5" style={{ background: "#9A7B4F" }} />
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
