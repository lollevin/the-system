"use client"

import { Button } from "@/components/ui/button"
import { Ticket, ChevronRight, Clock } from "lucide-react"
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
  const { t } = useLanguage()

  // No vouchers - show CTA card to earn more
  if (activeVouchers.length === 0) {
    return (
      <section>
        <div
          onClick={onShowVouchers}
          className="relative overflow-hidden p-8 cursor-pointer flex items-center group transition-all duration-500 active:scale-[0.99]"
          style={{
            background: "#9A7B4F",
            borderRadius: "30% 70% 70% 30% / 30% 30% 70% 70%",
          }}
        >
          {/* Decoration circle */}
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-white/10 rounded-l-full translate-x-12" />
          {/* Icon */}
          <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md flex-shrink-0">
            <Ticket className="h-8 w-8 text-white" />
          </div>
          {/* Text */}
          <div className="ml-6 flex-1 relative z-10">
            <h3 className="text-white font-bold text-xl">{t("customer", "noVouchers") || "No vouchers yet"}</h3>
            <p className="text-white/70 text-sm mt-0.5">Earn points to unlock rewards</p>
          </div>
          {/* Arrow */}
          <div className="relative z-10 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
            <ChevronRight className="h-6 w-6 text-white" />
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-2.5">
      {/* Beautiful Voucher Cards */}
      <div className="space-y-2.5">
        {activeVouchers.slice(0, 3).map((item, idx) => {
          const voucher = item.voucher || item
          const expiresAt = item.expires_at ? new Date(item.expires_at) : null
          const daysLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null
          const isExpiringSoon = daysLeft !== null && daysLeft <= 7
          
          return (
            <div
              key={item.id || idx}
              onClick={onShowVouchers}
              className="group relative overflow-hidden rounded-2xl bg-card border border-border hover:border-primary/40 cursor-pointer hover:shadow-lg transition-all duration-300 active:scale-[0.99]"
            >
              <div className="flex items-stretch">
                {/* Image Side or Gradient Placeholder */}
                <div className="relative w-28 sm:w-32 flex-shrink-0 overflow-hidden bg-gradient-to-br from-amber-100 to-orange-200">
                  {voucher?.image_url ? (
                    <img 
                      src={voucher.image_url} 
                      alt={voucher.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#8b6f47]/80 to-[#a07d50]/80">
                      <Ticket className="h-10 w-10 text-white" />
                    </div>
                  )}
                  {/* Glass overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  {/* Discount badge */}
                  {voucher?.discount_value && (
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm shadow-sm">
                      <span className="text-[11px] font-bold text-[#8b6f47]">
                        {voucher.discount_type === "percentage" ? `${voucher.discount_value}% OFF` : `RM ${voucher.discount_value} OFF`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content Side */}
                <div className="flex-1 p-3.5 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-foreground line-clamp-1">{voucher?.name || "Voucher"}</h4>
                      {voucher?.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{voucher.description}</p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10">
                      <span className="flex h-1.5 w-1.5 rounded-full bg-green-500 pulse-dot" />
                      <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">Active</span>
                    </div>
                    {daysLeft !== null && (
                      <div className={`flex items-center gap-1 text-[10px] ${isExpiringSoon ? "text-red-500 font-semibold" : "text-muted-foreground"}`}>
                        <Clock className="h-3 w-3" />
                        <span>{daysLeft === 0 ? "Expires today" : `${daysLeft}d left`}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* View All Button */}
      {activeVouchers.length > 0 && (
        <Button 
          onClick={onShowVouchers}
          variant="outline"
          className="w-full rounded-full border-primary/30 text-primary hover:bg-primary/5 font-medium gap-1.5 h-10"
        >
          {activeVouchers.length > 3 ? `View All ${activeVouchers.length} Vouchers` : t("customer", "viewRewards")}
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </section>
  )
}
