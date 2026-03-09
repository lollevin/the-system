"use client"

import { useState, useEffect } from "react"
import { MapPin, Check, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useLanguage } from "@/lib/i18n"

interface CheckInProps {
  userId: string
  onCheckIn?: () => void
}

export function CheckIn({ userId, onCheckIn }: CheckInProps) {
  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [streak, setStreak] = useState(0)
  const [weeklyCheckIns, setWeeklyCheckIns] = useState<boolean[]>([false, false, false, false, false, false, false])
  
  const supabase = createClient()
  const { t } = useLanguage()

  useEffect(() => {
    checkTodayStatus()
    fetchWeeklyStreak()
  }, [userId])

  const checkTodayStatus = async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { data } = await supabase
      .from("transactions")
      .select("id")
      .eq("user_id", userId)
      .eq("reason", "Daily Check-in")
      .gte("created_at", today.toISOString())
      .limit(1)
    
    if (data && data.length > 0) {
      setIsCheckedIn(true)
    }
  }

  const fetchWeeklyStreak = async () => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    monday.setHours(0, 0, 0, 0)

    const { data } = await supabase
      .from("transactions")
      .select("created_at")
      .eq("user_id", userId)
      .eq("reason", "Daily Check-in")
      .gte("created_at", monday.toISOString())
      .order("created_at", { ascending: true })

    if (data) {
      const checkInDays = new Array(7).fill(false)
      let currentStreak = 0
      
      data.forEach((tx) => {
        const date = new Date(tx.created_at)
        const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1
        checkInDays[dayIndex] = true
      })

      for (let i = 0; i < checkInDays.length; i++) {
        if (checkInDays[i]) currentStreak++
        else break
      }

      setWeeklyCheckIns(checkInDays)
      setStreak(currentStreak)
    }
  }

  const handleCheckIn = async () => {
    if (isCheckedIn) return
    setIsLoading(true)
    
    try {
      const { error: txError } = await supabase.from("transactions").insert({
        user_id: userId,
        type: "earn",
        points: 10,
        amount: 0,
        reason: "Daily Check-in",
      })

      if (txError) {
        toast.error(t("customer", "checkInFailed"), { description: txError.message })
        setIsLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("points_balance")
        .eq("id", userId)
        .single()

      if (profile) {
        await supabase
          .from("profiles")
          .update({ points_balance: profile.points_balance + 10 })
          .eq("id", userId)
      }

      setIsCheckedIn(true)
      toast.success(t("customer", "checkInSuccess"), { description: t("customer", "checkInEarned") })
      fetchWeeklyStreak()
      onCheckIn?.()
    } catch (err) {
      toast.error(t("customer", "checkInFailed"))
    } finally {
      setIsLoading(false)
    }
  }

  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"]
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">{t("customer", "dailyCheckIn")}</h3>
            <p className="text-xs text-muted-foreground">
              {isCheckedIn ? t("customer", "earnedPointsToday") : t("customer", "earn10Points")}
            </p>
          </div>
        </div>
        
        <Button
          onClick={handleCheckIn}
          disabled={isCheckedIn || isLoading}
          size="sm"
          className={`rounded-full px-4 h-9 text-xs font-medium ${
            isCheckedIn 
              ? "bg-green-600 hover:bg-green-600 text-white" 
              : "bg-primary hover:bg-primary/90 text-primary-foreground"
          }`}
        >
          {isLoading ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : isCheckedIn ? (
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" />
              {t("customer", "checkInDone")}
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              {t("customer", "checkInBtn")}
            </span>
          )}
        </Button>
      </div>

      {/* Streak dots */}
      <div className="mt-3 pt-3 border-t border-border/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-muted-foreground">{t("customer", "thisWeek")}</span>
          <span className="text-[11px] font-semibold text-primary">{streak} {t("customer", "dayStreak")}</span>
        </div>
        <div className="flex gap-1.5 justify-between">
          {dayLabels.map((day, index) => {
            const isDone = weeklyCheckIns[index] || (index === todayIndex && isCheckedIn)
            const isToday = index === todayIndex
            return (
              <div key={day + index} className="flex flex-col items-center gap-1">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-medium transition-all duration-300 ${
                    isDone
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : isToday
                        ? "bg-primary/10 text-primary ring-2 ring-primary/30"
                        : "bg-secondary/60 text-muted-foreground"
                  }`}
                >
                  {isDone ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    day
                  )}
                </div>
                {isToday && !isDone && (
                  <span className="h-1 w-1 rounded-full bg-primary pulse-dot" />
                )}
                {!isToday && <span className="h-1" />}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
