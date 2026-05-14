"use client"

import { useEffect, useState } from "react"
import type { Profile } from "@/lib/supabase/types"

interface AnimatedGreetingProps {
  profile: Profile
  vouchers?: any[]
  t: (category: "customer" | "admin" | "staff" | "ai" | "common" | "login" | "settings", key: string) => string
}

function getGreeting(): { text: string; emoji: string } {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return { text: "Good Morning", emoji: "sun" }
  if (hour >= 12 && hour < 18) return { text: "Good Afternoon", emoji: "wave" }
  return { text: "Good Evening", emoji: "moon" }
}

export function AnimatedGreeting({ profile, vouchers = [], t }: AnimatedGreetingProps) {
  const [mounted, setMounted] = useState(false)
  const greeting = getGreeting()
  
  const firstName = profile.full_name?.split(" ")[0] || "there"
  const activeVouchers = vouchers.filter(v => !v.is_used).length
  
  useEffect(() => {
    // Trigger animation after mount
    const timer = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // Build subtext
  let subtext = ""
  if (activeVouchers > 0) {
    subtext = `You have ${activeVouchers} reward${activeVouchers > 1 ? "s" : ""} waiting`
  } else {
    subtext = `${profile.points_balance || 0} points available`
  }

  return (
    <div 
      className={`transition-all duration-700 ease-out ${
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      }`}
    >
      <div className="flex items-baseline gap-2">
        <h2 className="text-xl font-semibold text-foreground">
          {greeting.text},{" "}
          <span className="text-primary">{firstName}</span>
        </h2>
        <span className="text-xl">
          {greeting.emoji === "sun" && "☀️"}
          {greeting.emoji === "wave" && "👋"}
          {greeting.emoji === "moon" && "🌙"}
        </span>
      </div>
      <p
        className={`text-sm mt-0.5 transition-all duration-700 delay-200 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        } ${activeVouchers > 0 ? "text-muted-foreground" : "text-primary font-medium"}`}
      >
        {subtext}
      </p>
    </div>
  )
}
