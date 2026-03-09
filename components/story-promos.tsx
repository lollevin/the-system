"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Share2, Gift, Sparkles, Star, PartyPopper, Tag } from "lucide-react"
import { useLanguage } from "@/lib/i18n"

interface StoryPromosProps {
  onShowReferral?: () => void
  onShowVouchers?: () => void
}

interface PromoItem {
  id: string
  label: string
  icon: any
  gradient: string
  onClick?: () => void
}

export function StoryPromos({ onShowReferral, onShowVouchers }: StoryPromosProps) {
  const [promos, setPromos] = useState<PromoItem[]>([])
  const supabase = createClient()
  const { t } = useLanguage()

  useEffect(() => {
    loadPromos()
  }, [])

  const loadPromos = async () => {
    const items: PromoItem[] = []

    items.push({
      id: "referral",
      label: t("customer", "shareEarn"),
      icon: Share2,
      gradient: "from-amber-500 to-orange-500",
      onClick: onShowReferral,
    })

    const { data: campaigns } = await supabase
      .from("referral_campaigns")
      .select("id, name")
      .eq("is_active", true)
      .limit(2)

    if (campaigns) {
      campaigns.forEach(c => {
        items.push({
          id: `camp-${c.id}`,
          label: c.name,
          icon: PartyPopper,
          gradient: "from-pink-500 to-rose-500",
          onClick: onShowReferral,
        })
      })
    }

    const { data: vouchers } = await supabase
      .from("vouchers")
      .select("id, name")
      .eq("is_active", true)
      .eq("voucher_type", "global")
      .limit(2)

    if (vouchers) {
      vouchers.forEach(v => {
        items.push({
          id: `voucher-${v.id}`,
          label: v.name,
          icon: Tag,
          gradient: "from-emerald-500 to-teal-500",
          onClick: onShowVouchers,
        })
      })
    }

    const staticPromos: PromoItem[] = [
      { id: "rewards", label: t("customer", "rewards"), icon: Gift, gradient: "from-violet-500 to-purple-500", onClick: onShowVouchers },
      { id: "new", label: "What's New", icon: Sparkles, gradient: "from-blue-500 to-cyan-500" },
      { id: "vip", label: "VIP Perks", icon: Star, gradient: "from-yellow-500 to-amber-500" },
    ]

    for (const sp of staticPromos) {
      if (items.length >= 7) break
      if (!items.find(i => i.id === sp.id)) items.push(sp)
    }

    setPromos(items)
  }

  if (promos.length === 0) return null

  return (
    <div className="py-1">
      <div className={`flex gap-2 ${promos.length <= 5 ? 'justify-around' : 'overflow-x-auto no-scrollbar -mx-4 px-4'}`}>
        {promos.map((promo) => {
          const Icon = promo.icon
          return (
            <button
              key={promo.id}
              onClick={promo.onClick}
              className={`flex flex-col items-center gap-1 group ${promos.length > 5 ? 'shrink-0' : ''}`}
            >
              <div className="rounded-full p-[2px] bg-gradient-to-br from-primary/60 to-primary/20">
                <div className={`h-[50px] w-[50px] rounded-full bg-gradient-to-br ${promo.gradient} flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-sm`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground max-w-[56px] text-center leading-tight truncate">
                {promo.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
