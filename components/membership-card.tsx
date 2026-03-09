"use client"

import { useEffect, useState, useRef } from "react"
import { Crown, Gem, Award, Star } from "lucide-react"
import type { Profile } from "@/lib/supabase/types"
import { useLanguage } from "@/lib/i18n"

interface MembershipCardProps {
  profile: Profile
}

const TIERS = [
  { name: "Bronze", min: 0, max: 1000, gradient: "from-amber-700 via-amber-600 to-yellow-700", icon: Award, accent: "bg-amber-300/90" },
  { name: "Silver", min: 1000, max: 3000, gradient: "from-slate-500 via-slate-400 to-gray-400", icon: Star, accent: "bg-slate-200/90" },
  { name: "Gold", min: 3000, max: 5000, gradient: "from-yellow-600 via-amber-500 to-yellow-500", icon: Crown, accent: "bg-yellow-200/90" },
  { name: "Diamond", min: 5000, max: Infinity, gradient: "from-cyan-500 via-blue-500 to-indigo-500", icon: Gem, accent: "bg-cyan-200/90" },
]

function useCountUp(target: number, duration = 1000) {
  const [count, setCount] = useState(0)
  const frame = useRef(0)
  const start = useRef<number | null>(null)

  useEffect(() => {
    if (target === 0) { setCount(0); return }
    start.current = null
    const animate = (ts: number) => {
      if (!start.current) start.current = ts
      const p = Math.min((ts - start.current) / duration, 1)
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * target))
      if (p < 1) frame.current = requestAnimationFrame(animate)
      else setCount(target)
    }
    frame.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame.current)
  }, [target, duration])

  return count
}

export function MembershipCard({ profile }: MembershipCardProps) {
  const totalSpent = profile.total_spent || 0
  const { t } = useLanguage()
  const animatedPoints = useCountUp(profile.points_balance || 0)
  
  const currentTier = TIERS.find(t => totalSpent >= t.min && totalSpent < t.max) || TIERS[0]
  const nextTier = TIERS.find(t => t.min > totalSpent)
  const progress = nextTier 
    ? ((totalSpent - currentTier.min) / (nextTier.min - currentTier.min)) * 100
    : 100
  const amountToNext = nextTier ? nextTier.min - totalSpent : 0
  const TierIcon = currentTier.icon

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${currentTier.gradient} shadow-lg`}>
      {/* Subtle decorations */}
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/8" />
      <div className="absolute -left-4 -bottom-4 w-20 h-20 rounded-full bg-white/6" />
      <div className="absolute right-16 bottom-8 w-12 h-12 rounded-full bg-white/4" />
      
      <div className="relative z-10 p-5">
        {/* Top row */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className={`h-5 w-5 rounded-full ${currentTier.accent} flex items-center justify-center`}>
                <TierIcon className="h-3 w-3 text-black/60" />
              </div>
              <p className="text-[11px] font-bold text-white/80 uppercase tracking-widest">
                {currentTier.name} {t("customer", "member")}
              </p>
            </div>
            <h3 className="text-3xl font-bold text-white tabular-nums leading-none">
              {animatedPoints.toLocaleString()}
              <span className="text-sm font-medium ml-1 text-white/60">pts</span>
            </h3>
          </div>
          <div className="text-right bg-black/10 rounded-xl px-3 py-1.5 backdrop-blur-sm">
            <p className="text-[9px] text-white/60 uppercase tracking-wider">{t("customer", "totalSpent")}</p>
            <p className="text-base font-bold text-white leading-tight">RM {totalSpent.toFixed(0)}</p>
          </div>
        </div>
        
        {/* Progress */}
        {nextTier && (
          <div>
            <div className="flex justify-between text-[10px] text-white/70 mb-1 font-medium">
              <span>{currentTier.name}</span>
              <span>{nextTier.name}</span>
            </div>
            <div className="h-1.5 bg-white/15 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white/80 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-white/50 mt-1 text-center">
              RM {amountToNext.toFixed(0)} {t("customer", "moreTo")} {nextTier.name}
            </p>
          </div>
        )}
        
        {!nextTier && (
          <p className="text-[11px] text-white/70 text-center mt-1">
            {t("customer", "highestTier")}
          </p>
        )}
      </div>
    </div>
  )
}
