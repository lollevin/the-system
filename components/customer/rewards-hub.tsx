"use client"

import { useEffect, useMemo, useState } from "react"
import { Calendar, UserPlus, Heart, Cake, Flame, Ticket, ChevronRight, Crown, Award, Star, Gem, Loader2, Info } from "lucide-react"
import { useLanguage } from "@/lib/i18n"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { Profile } from "@/lib/supabase/types"

interface RewardsHubProps {
  profile: Profile
  vouchers: any[]
  onShowVouchers: () => void
  onShowCheckIn: () => void
  onShowReferral: () => void
  onEditProfile?: () => void
  onPointsEarned?: (newBalance: number) => void
}

interface RewardsConfig {
  daily_checkin: number
  refer_friend: number
  like_share: number
  birthday_gift: number
  streak_bonus: number
}

const DEFAULT_REWARDS: RewardsConfig = {
  daily_checkin: 10,
  refer_friend: 50,
  like_share: 15,
  birthday_gift: 100,
  streak_bonus: 50,
}

const TIERS = [
  { name: "Bronze", min: 0, max: 1000, icon: Award, color: "text-amber-600" },
  { name: "Silver", min: 1000, max: 3000, icon: Star, color: "text-slate-500" },
  { name: "Gold", min: 3000, max: 5000, icon: Crown, color: "text-yellow-600" },
  { name: "Diamond", min: 5000, max: Infinity, icon: Gem, color: "text-cyan-500" },
]

const SHARE_URL =
  "https://readyshare.ai/app/#/user-share?store_token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzM4NCJ9.eyJzdWIiOiJtZW1iZXIiLCJpZCI6MTUyfQ.W1Rvl3rPRw8W8a-MD8fsO4vfwseF0tAYGNBf9SGWI4Aj8_2wIklspX0Vk8IvUCW"

export function RewardsHub({
  profile,
  vouchers,
  onShowVouchers,
  onShowCheckIn,
  onShowReferral,
  onEditProfile,
  onPointsEarned,
}: RewardsHubProps) {
  const { t } = useLanguage()
  const supabase = createClient()

  const [config, setConfig] = useState<RewardsConfig>(DEFAULT_REWARDS)
  const [isClaimingLikeShare, setIsClaimingLikeShare] = useState(false)

  // Fetch rewards config set by admin
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from("global_settings")
        .select("value")
        .eq("key", "rewards_config")
        .maybeSingle()
      if (data?.value) {
        setConfig({ ...DEFAULT_REWARDS, ...data.value })
      }
    })()
  }, [])

  const points = profile.points_balance || 0
  const totalSpent = profile.total_spent || 0
  const hasBirthday = Boolean(profile.birthday)

  const currentTier = useMemo(
    () => TIERS.find((tier) => totalSpent >= tier.min && totalSpent < tier.max) || TIERS[0],
    [totalSpent]
  )
  const nextTier = useMemo(() => TIERS.find((tier) => tier.min > totalSpent), [totalSpent])
  const progress = nextTier
    ? ((totalSpent - currentTier.min) / (nextTier.min - currentTier.min)) * 100
    : 100
  const pointsToNext = nextTier ? nextTier.min - totalSpent : 0
  const TierIcon = currentTier.icon

  // Handle Like & Share click - opens link AND claims points
  const handleLikeShare = async () => {
    if (isClaimingLikeShare) return
    if (config.like_share <= 0) {
      window.open(SHARE_URL, "_blank")
      return
    }

    setIsClaimingLikeShare(true)
    // Open share link first (user sees immediate action)
    window.open(SHARE_URL, "_blank")

    try {
      const res = await fetch("/api/customer/claim-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "like_share" }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        toast.success(`+${data.points} ${t("customer", "pointsUnit")}!`, {
          description: t("customer", "taskLikeShareDesc"),
        })
        onPointsEarned?.(data.new_balance)
      } else if (data.error === "cooldown") {
        toast.info(data.message || "Please try again later")
      } else {
        // Silent fail - they still got to share the link
      }
    } catch {
      // Silent fail
    } finally {
      setIsClaimingLikeShare(false)
    }
  }

  // Handle birthday click when no birthday set
  const handleBirthdayClick = () => {
    if (!hasBirthday) {
      toast.info("Please fill in your birthday to unlock this reward", {
        action: onEditProfile
          ? { label: "Set now", onClick: () => onEditProfile() }
          : undefined,
      })
      return
    }
  }

  const tasks = [
    {
      id: "checkin",
      icon: Calendar,
      title: t("customer", "taskDailyCheckIn"),
      desc: t("customer", "taskDailyCheckInDesc"),
      reward: `+${config.daily_checkin} ${t("customer", "perDay")}`,
      bg: "bg-purple-500/10",
      iconColor: "text-purple-600",
      onClick: onShowCheckIn,
      disabled: config.daily_checkin <= 0,
    },
    {
      id: "refer",
      icon: UserPlus,
      title: t("customer", "taskReferFriend"),
      desc: t("customer", "taskReferFriendDesc"),
      reward: `+${config.refer_friend} ${t("customer", "perReferral")}`,
      bg: "bg-blue-500/10",
      iconColor: "text-blue-600",
      onClick: onShowReferral,
      disabled: config.refer_friend <= 0,
    },
    {
      id: "like-share",
      icon: Heart,
      title: t("customer", "taskLikeShare"),
      desc: t("customer", "taskLikeShareDesc"),
      reward: `+${config.like_share} ${t("customer", "perUse")}`,
      bg: "bg-rose-500/10",
      iconColor: "text-rose-600",
      onClick: handleLikeShare,
      loading: isClaimingLikeShare,
      disabled: config.like_share <= 0,
    },
    {
      id: "birthday",
      icon: Cake,
      title: t("customer", "taskBirthday"),
      desc: hasBirthday
        ? t("customer", "taskBirthdayDesc")
        : "Please fill in your birthday first",
      reward: `+${config.birthday_gift} ${t("customer", "birthdayGift")}`,
      bg: hasBirthday ? "bg-pink-500/10" : "bg-muted",
      iconColor: hasBirthday ? "text-pink-600" : "text-muted-foreground",
      onClick: handleBirthdayClick,
      needsBirthday: !hasBirthday,
      disabled: config.birthday_gift <= 0,
    },
    {
      id: "streak",
      icon: Flame,
      title: t("customer", "taskStreak"),
      desc: t("customer", "taskStreakDesc"),
      reward: `+${config.streak_bonus} ${t("customer", "bonus")}`,
      bg: "bg-orange-500/10",
      iconColor: "text-orange-600",
      onClick: onShowCheckIn,
      disabled: config.streak_bonus <= 0,
    },
  ]

  // Filter out disabled tasks (admin set to 0)
  const visibleTasks = tasks.filter((task) => !task.disabled)

  return (
    <div className="flex flex-col gap-4 px-4 py-3">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("customer", "rewardsCenter")}</h1>
      </div>

      {/* Points Card - Big gradient card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#8b6f47] via-[#a07d50] to-[#c8a775] p-5 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

        <div className="relative">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-white/80">
                {t("customer", "myPoints")}
              </p>
              <p className="mt-1 text-4xl font-extrabold tabular-nums">
                {points.toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 backdrop-blur-sm">
              <TierIcon className="h-4 w-4" strokeWidth={2.5} />
              <span className="text-xs font-bold uppercase tracking-wider">{currentTier.name}</span>
            </div>
          </div>

          {nextTier ? (
            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full rounded-full bg-white transition-all duration-700 ease-out"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-white/90">
                RM {pointsToNext.toLocaleString()} {t("customer", "moreTo")} {nextTier.name}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-xs text-white/90">{t("customer", "highestTier")}</p>
          )}
        </div>
      </div>

      {/* My Vouchers Section */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">{t("customer", "myVouchersShort")}</h2>
          {vouchers.length > 0 && (
            <button
              onClick={onShowVouchers}
              className="flex items-center gap-0.5 text-xs font-medium text-[#8b6f47] hover:underline"
            >
              {t("customer", "viewAll")}
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>

        {vouchers.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Ticket className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{t("customer", "noVouchers")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("customer", "earnPointsToRedeem")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {vouchers.slice(0, 2).map((voucher) => (
              <button
                key={voucher.id}
                onClick={onShowVouchers}
                className="group relative flex items-stretch overflow-hidden rounded-2xl border border-border bg-card text-left transition-all hover:border-[#8b6f47]/40 hover:shadow-md active:scale-[0.99]"
              >
                <div className="relative w-24 shrink-0 overflow-hidden bg-gradient-to-br from-[#8b6f47] to-[#a07d50]">
                  {voucher.image_url ? (
                    <img
                      src={voucher.image_url}
                      alt={voucher.name}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                      <span className="text-2xl font-extrabold leading-none">
                        {voucher.discount_percent
                          ? `${voucher.discount_percent}%`
                          : voucher.discount_amount
                          ? `RM${voucher.discount_amount}`
                          : ""}
                      </span>
                      <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider">
                        OFF
                      </span>
                    </div>
                  )}
                  <div className="absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 translate-x-1/2 rounded-full bg-card" />
                </div>

                <div className="flex flex-1 items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {voucher.name || voucher.description || "Voucher"}
                    </p>
                    {voucher.expires_at && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t("customer", "expiresOn")}: {new Date(voucher.expires_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            ))}
            {vouchers.length > 2 && (
              <button
                onClick={onShowVouchers}
                className="flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border bg-card/50 py-3 text-sm font-medium text-[#8b6f47] transition-colors hover:bg-card"
              >
                {t("customer", "moreRewards")}
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Earn Points Tasks */}
      {visibleTasks.length > 0 && (
        <div>
          <h2 className="mb-2 text-base font-bold text-foreground">{t("customer", "earnPoints")}</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {visibleTasks.map((task) => {
              const Icon = task.icon
              const isBirthdayLocked = task.id === "birthday" && task.needsBirthday
              return (
                <button
                  key={task.id}
                  onClick={task.onClick}
                  disabled={task.loading}
                  className={`group relative flex flex-col items-start rounded-2xl border p-3.5 text-left transition-all hover:shadow-md active:scale-[0.98] disabled:cursor-wait ${
                    isBirthdayLocked
                      ? "border-border/50 bg-card/40 opacity-75"
                      : "border-border bg-card hover:border-[#8b6f47]/40"
                  }`}
                >
                  {task.loading && (
                    <div className="absolute right-2 top-2">
                      <Loader2 className="h-4 w-4 animate-spin text-[#8b6f47]" />
                    </div>
                  )}
                  {isBirthdayLocked && (
                    <div className="absolute right-2 top-2">
                      <Info className="h-4 w-4 text-amber-500" />
                    </div>
                  )}
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${task.bg}`}
                  >
                    <Icon
                      className={`h-5 w-5 ${task.iconColor} ${
                        isBirthdayLocked ? "opacity-60" : ""
                      }`}
                      strokeWidth={2.2}
                    />
                  </div>
                  <p
                    className={`mt-2.5 text-sm font-semibold ${
                      isBirthdayLocked ? "text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    {task.title}
                  </p>
                  <p
                    className={`mt-0.5 line-clamp-2 text-[11px] leading-snug ${
                      isBirthdayLocked ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground"
                    }`}
                  >
                    {task.desc}
                  </p>
                  <div
                    className={`mt-2.5 inline-flex rounded-full px-2.5 py-1 ${
                      isBirthdayLocked ? "bg-muted" : "bg-[#8b6f47]/10"
                    }`}
                  >
                    <span
                      className={`text-[11px] font-bold ${
                        isBirthdayLocked ? "text-muted-foreground" : "text-[#8b6f47]"
                      }`}
                    >
                      {task.reward}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
