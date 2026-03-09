"use client"

import { UtensilsCrossed, Ticket, History, Headphones, User, Gift, Share2 } from "lucide-react"
import { useLanguage } from "@/lib/i18n"

interface QuickActionsProps {
  onShowQR?: () => void
  onShowVouchers?: () => void
  onShowHistory?: () => void
  onShowProfile?: () => void
  onShowMenu?: () => void
  onShowSupport?: () => void
  onShowReferral?: () => void
}

const actionConfig = [
  { key: "menu", icon: UtensilsCrossed, color: "from-amber-500/15 to-orange-500/10", iconColor: "text-amber-600" },
  { key: "vouchers", icon: Ticket, color: "from-emerald-500/15 to-teal-500/10", iconColor: "text-emerald-600" },
  { key: "history", icon: History, color: "from-blue-500/15 to-indigo-500/10", iconColor: "text-blue-600" },
  { key: "support", icon: Headphones, color: "from-violet-500/15 to-purple-500/10", iconColor: "text-violet-600" },
  { key: "me", icon: User, color: "from-rose-500/15 to-pink-500/10", iconColor: "text-rose-600" },
]

export function QuickActions({ onShowQR, onShowVouchers, onShowHistory, onShowProfile, onShowMenu, onShowSupport, onShowReferral }: QuickActionsProps) {
  const { t } = useLanguage()

  const handlers: Record<string, (() => void) | undefined> = {
    menu: onShowMenu,
    vouchers: onShowVouchers,
    history: onShowHistory,
    support: onShowSupport,
    me: onShowProfile,
  }

  return (
    <div className="space-y-2.5">
      {/* 5-icon row - compact, clean */}
      <div className="grid grid-cols-5 gap-2">
        {actionConfig.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.key}
              onClick={handlers[action.key]}
              className="flex flex-col items-center gap-1.5 group py-1"
            >
              <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center group-hover:scale-105 group-active:scale-95 transition-transform duration-150 shadow-sm`}>
                <Icon className={`h-5 w-5 ${action.iconColor}`} />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors leading-tight">
                {t("customer", action.key)}
              </span>
            </button>
          )
        })}
      </div>
      
      {/* Share & Earn banner */}
      <button 
        onClick={onShowReferral}
        className="flex items-center justify-between w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-primary via-[#9a7a4d] to-[#a07d50] hover:opacity-95 transition-all duration-200 shadow-sm active:scale-[0.99]"
      >
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
            <Gift className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-white">{t("customer", "shareEarn")}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-white/70">Earn rewards</span>
          <Share2 className="h-3.5 w-3.5 text-white/70" />
        </div>
      </button>
    </div>
  )
}
