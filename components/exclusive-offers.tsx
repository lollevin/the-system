"use client"

import { Button } from "@/components/ui/button"
import { Gift, ChevronRight, Ticket } from "lucide-react"
import type { Profile } from "@/lib/supabase/types"
import { useLanguage } from "@/lib/i18n"

interface ExclusiveOffersProps {
  profile: Profile
  vouchers: any[]
  rewards: any[]
  onShowVouchers: () => void
}

export function ExclusiveOffers({ profile, vouchers, rewards, onShowVouchers }: ExclusiveOffersProps) {
  const activeVouchers = vouchers?.filter(v => !v.is_used) || []
  const availableRewards = rewards?.filter(r => (profile.points_balance || 0) >= r.points_required) || []
  const { t } = useLanguage()
  
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-foreground">{t("customer", "justForYou")}</h2>
      
      {/* Glassmorphism Rewards Hub */}
      <div 
        className="glass rounded-2xl cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
        onClick={onShowVouchers}
      >
        <div className="p-4">
          {/* Two columns */}
          <div className="grid grid-cols-2 gap-3">
            {/* Left: Vouchers */}
            <div className="flex flex-col items-center text-center gap-2 p-3 rounded-xl bg-gradient-to-br from-amber-500/8 to-orange-500/5">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                <Ticket className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground tabular-nums">{activeVouchers.length}</p>
                <p className="text-[11px] text-muted-foreground">
                  {activeVouchers.length !== 1 ? t("customer", "vouchers") : t("customer", "voucher")}
                </p>
              </div>
              {activeVouchers.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-green-500 pulse-dot" />
                  <span className="text-[10px] font-medium text-green-600">{t("customer", "readyToUse")}</span>
                </div>
              )}
            </div>

            {/* Right: Points & Rewards */}
            <div className="flex flex-col items-center text-center gap-2 p-3 rounded-xl bg-gradient-to-br from-emerald-500/8 to-teal-500/5">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                <Gift className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground tabular-nums">{profile.points_balance || 0}</p>
                <p className="text-[11px] text-muted-foreground">{t("customer", "points")}</p>
              </div>
              {availableRewards.length > 0 && (
                <span className="text-[10px] font-medium text-emerald-600">
                  {t("customer", "canRedeem")} {availableRewards.length}
                </span>
              )}
            </div>
          </div>

          {/* CTA */}
          <Button 
            onClick={(e) => {
              e.stopPropagation()
              onShowVouchers()
            }}
            className="w-full mt-3 rounded-full bg-gradient-to-r from-[#8b6f47] to-[#a07d50] text-white hover:from-[#7a5f3a] hover:to-[#8b6f47] font-medium gap-1.5 shadow-sm h-10"
          >
            {t("customer", "viewRewards")}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  )
}
