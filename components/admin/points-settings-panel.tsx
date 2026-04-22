"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Coins, Gift, Calendar, UserPlus, Heart, Cake, Flame, Crown } from "lucide-react"
import { toast } from "sonner"
import { useLanguage } from "@/lib/i18n"

interface RewardsConfig {
  daily_checkin: number
  refer_friend: number
  like_share: number
  birthday_gift: number
  streak_bonus: number
  rm_per_point: number
}

interface TierConfig {
  silver_spent: number
  gold_spent: number
  diamond_spent: number
}

const DEFAULT_REWARDS: RewardsConfig = {
  daily_checkin: 10,
  refer_friend: 50,
  like_share: 15,
  birthday_gift: 100,
  streak_bonus: 50,
  rm_per_point: 10,
}

const DEFAULT_TIER: TierConfig = {
  silver_spent: 1000,
  gold_spent: 3000,
  diamond_spent: 5000,
}

export function PointsSettingsPanel() {
  const supabase = createClient()
  const { t } = useLanguage()
  const [rewardsConfig, setRewardsConfig] = useState<RewardsConfig>(DEFAULT_REWARDS)
  const [tierConfig, setTierConfig] = useState<TierConfig>(DEFAULT_TIER)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const { data: rows } = await supabase
          .from("global_settings")
          .select("key, value")
          .in("key", ["rewards_config", "tier_config"])
        if (rows) {
          const r = rows.find((x: any) => x.key === "rewards_config")
          const ti = rows.find((x: any) => x.key === "tier_config")
          if (r?.value) setRewardsConfig({ ...DEFAULT_REWARDS, ...r.value })
          if (ti?.value) setTierConfig({ ...DEFAULT_TIER, ...ti.value })
        }
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const [rewRes, tierRes] = await Promise.all([
        supabase.from("global_settings").upsert({
          key: "rewards_config",
          value: rewardsConfig,
          updated_at: new Date().toISOString(),
        }),
        supabase.from("global_settings").upsert({
          key: "tier_config",
          value: tierConfig,
          updated_at: new Date().toISOString(),
        }),
      ])
      if (rewRes.error) throw rewRes.error
      if (tierRes.error) throw tierRes.error
      toast.success(t("admin", "sfRewardsSaved"))
    } catch (err: any) {
      toast.error(t("admin", "sfRewardsSaveFailed"), { description: err?.message })
    } finally {
      setIsSaving(false)
    }
  }

  const rewardItems: Array<{ key: keyof RewardsConfig; icon: any; titleKey: string; descKey: string; unitKey: string }> = [
    { key: "daily_checkin", icon: Calendar, titleKey: "sfRewardDailyCheckin", descKey: "sfRewardDailyCheckinDesc", unitKey: "sfUnitPerDay" },
    { key: "refer_friend", icon: UserPlus, titleKey: "sfRewardRefer", descKey: "sfRewardReferDesc", unitKey: "sfUnitPerReferral" },
    { key: "like_share", icon: Heart, titleKey: "sfRewardLikeShare", descKey: "sfRewardLikeShareDesc", unitKey: "sfUnitPerUse" },
    { key: "birthday_gift", icon: Cake, titleKey: "sfRewardBirthday", descKey: "sfRewardBirthdayDesc", unitKey: "sfUnitPerBirthday" },
    { key: "streak_bonus", icon: Flame, titleKey: "sfRewardStreak", descKey: "sfRewardStreakDesc", unitKey: "sfUnitPerStreak" },
  ]

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#8b6f47]" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* RM per point */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-[#8b6f47]" />
            {t("admin", "sfRmPerPoint")}
          </CardTitle>
          <CardDescription>{t("admin", "sfRmPerPointDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-background/40">
            <div className="text-sm font-semibold text-muted-foreground">{t("admin", "sfUnitRm")}</div>
            <Input
              type="number"
              min={1}
              max={9999}
              value={rewardsConfig.rm_per_point}
              onChange={(e) =>
                setRewardsConfig((prev) => ({
                  ...prev,
                  rm_per_point: Math.max(1, parseInt(e.target.value || "1", 10)),
                }))
              }
              className="w-24 text-center font-bold bg-background"
            />
            <div className="text-sm font-medium">= 1 {t("common", "pts")}</div>
          </div>
        </CardContent>
      </Card>

      {/* Earn points configuration */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-[#8b6f47]" />
            {t("admin", "sfEarnPointsConfig")}
          </CardTitle>
          <CardDescription>{t("admin", "sfEarnPointsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rewardItems.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/50 bg-background/40"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-[#8b6f47]/10">
                    <Icon className="h-4 w-4 text-[#8b6f47]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{t("admin", item.titleKey)}</p>
                    <p className="text-xs text-muted-foreground">{t("admin", item.descKey)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Input
                    type="number"
                    min={0}
                    max={9999}
                    value={rewardsConfig[item.key]}
                    onChange={(e) =>
                      setRewardsConfig((prev) => ({
                        ...prev,
                        [item.key]: Math.max(0, parseInt(e.target.value || "0", 10)),
                      }))
                    }
                    className="w-20 text-center font-bold bg-background"
                  />
                  <span className="text-xs text-muted-foreground w-20">{t("admin", item.unitKey)}</span>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Tier upgrade configuration */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-[#8b6f47]" />
            {t("admin", "psTierTitle")}
          </CardTitle>
          <CardDescription>{t("admin", "psTierDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {([
            { key: "silver_spent", label: "Silver", color: "text-gray-500", icon: "🥈" },
            { key: "gold_spent", label: "Gold", color: "text-amber-500", icon: "🥇" },
            { key: "diamond_spent", label: "Diamond", color: "text-blue-500", icon: "💎" },
          ] as const).map((tier) => (
            <div
              key={tier.key}
              className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/50 bg-background/40"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{tier.icon}</span>
                <div>
                  <p className={`text-sm font-bold ${tier.color}`}>{tier.label}</p>
                  <p className="text-xs text-muted-foreground">{t("admin", "psTierSpendRequired")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-semibold text-muted-foreground">RM</span>
                <Input
                  type="number"
                  min={0}
                  max={999999}
                  value={tierConfig[tier.key]}
                  onChange={(e) =>
                    setTierConfig((prev) => ({
                      ...prev,
                      [tier.key]: Math.max(0, parseInt(e.target.value || "0", 10)),
                    }))
                  }
                  className="w-28 text-center font-bold bg-background"
                />
              </div>
            </div>
          ))}
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 p-3 text-xs text-amber-800 dark:text-amber-200">
            {t("admin", "psTierHint")}
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-[#8b6f47] hover:bg-[#7a5f3d] text-white min-w-[140px]"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common", "save")}
        </Button>
      </div>
    </div>
  )
}
