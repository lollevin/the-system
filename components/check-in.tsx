"use client"

import { useState, useEffect } from "react"
import { MapPin, Check } from "lucide-react"
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
      const res = await fetch("/api/customer/claim-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "daily_checkin" }),
      })
      const data = await res.json().catch(() => ({}))

      if (res.ok && data.success) {
        setIsCheckedIn(true)
        toast.success(t("customer", "checkInSuccess"), {
          description: `+${data.points} ${t("customer", "pointsUnit") || "points"}`,
        })
        fetchWeeklyStreak()
        onCheckIn?.()
      } else if (data.error === "cooldown") {
        setIsCheckedIn(true)
        toast.info(data.message || "Already checked in today")
      } else {
        toast.error(t("customer", "checkInFailed"), {
          description: data.error || "Please try again",
        })
      }
    } catch {
      toast.error(t("customer", "checkInFailed"))
    } finally {
      setIsLoading(false)
    }
  }

  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"]
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

  return (
    <div className="flex flex-col gap-4">
      {/* Check-in row — no card background, floating */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div
            className="p-3 rounded-2xl border"
            style={{ background: "#FDFCF7", borderColor: "rgba(154,123,79,0.2)" }}
          >
            <MapPin className="h-6 w-6" style={{ color: "#9A7B4F" }} />
          </div>
          <div>
            <h3 className="font-bold text-sm" style={{ color: "#2D2926" }}>{t("customer", "dailyCheckIn")}</h3>
            <p className="text-xs text-gray-500">
              {isCheckedIn ? t("customer", "earnedPointsToday") : t("customer", "earn10Points")}
            </p>
          </div>
        </div>

        <Button
          onClick={handleCheckIn}
          disabled={isCheckedIn || isLoading}
          size="sm"
          className={`rounded-xl px-6 py-2.5 h-auto text-sm font-bold flex items-center gap-2 transition-all active:scale-95 ${
            isCheckedIn ? "bg-green-600 hover:bg-green-600 text-white" : "text-white"
          }`}
          style={!isCheckedIn ? {
            background: "#9A7B4F",
            boxShadow: "0 10px 15px -3px rgba(154,123,79,0.3)",
          } : {}}
        >
          {isLoading ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : isCheckedIn ? (
            <><Check className="h-4 w-4" />{t("customer", "checkInDone")}</>
          ) : (
            <>☀️ {t("customer", "checkInBtn")}</>
          )}
        </Button>
      </div>

      {/* Streak card */}
      <div className="bg-white/50 rounded-3xl p-4 border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <span className="text-[10px] uppercase font-extrabold text-gray-400 tracking-wider">THIS WEEK</span>
          <span className="text-[10px] font-bold flex items-center gap-1.5" style={{ color: "#9A7B4F" }}>
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            {streak} {t("customer", "dayStreak")}
          </span>
        </div>
        <div className="flex justify-between">
          {dayLabels.map((day, index) => {
            const isDone = weeklyCheckIns[index] || (index === todayIndex && isCheckedIn)
            const isToday = index === todayIndex
            return (
              <div key={day + index} className="flex flex-col items-center gap-2">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                  style={
                    isDone
                      ? { background: "#9A7B4F", color: "white", boxShadow: "0 4px 6px -1px rgba(154,123,79,0.4)" }
                      : isToday
                      ? { background: "white", border: "2px solid rgba(154,123,79,0.3)", color: "#9A7B4F", position: "relative" }
                      : { background: "white", border: "1px solid #f3f4f6", color: "#d1d5db" }
                  }
                >
                  {isDone ? <Check className="h-5 w-5" /> : day}
                  {isToday && !isDone && (
                    <span
                      className="absolute -bottom-1 w-1 h-1 rounded-full"
                      style={{ background: "#9A7B4F" }}
                    />
                  )}
                </div>
                <span
                  className="text-[10px] font-bold"
                  style={{ color: isToday && !isDone ? "#9A7B4F" : "#9ca3af" }}
                >
                  {day}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
