"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Icon3D } from "./3d-icons"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/i18n"

interface KPICardProps {
  title: string
  value: string
  trend: string
  trendPositive?: boolean
  iconType: "dollar" | "users" | "sparkles"
}

function KPICard({ title, value, trend, trendPositive = true, iconType }: KPICardProps) {
  return (
    <Card className="bg-card border-border/50 hover:border-[#8b6f47]/30 transition-all hover:shadow-md group">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-semibold tracking-tight text-foreground">{value}</p>
            <p className={cn(
              "text-sm",
              trendPositive ? "text-emerald-500" : "text-muted-foreground"
            )}>
              {trend}
            </p>
          </div>
          <div className="group-hover:scale-110 transition-transform">
            <Icon3D type={iconType} size={56} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface KPICardsProps {
  totalRevenue?: number
  activeMembers?: number
  totalPoints?: number
}

export function KPICards({ totalRevenue = 0, activeMembers = 0, totalPoints = 0 }: KPICardsProps) {
  const { t } = useLanguage()
  
  const kpis: Array<{
    title: string
    value: string
    trend: string
    trendPositive: boolean
    iconType: "dollar" | "users" | "sparkles"
  }> = [
    {
      title: t("admin", "totalRevenue"),
      value: `RM ${totalRevenue.toLocaleString()}`,
      trend: `+12% ${t("admin", "vsLastMonth")}`,
      trendPositive: true,
      iconType: "dollar",
    },
    {
      title: t("admin", "activeMembers"),
      value: activeMembers.toLocaleString(),
      trend: `+58 ${t("admin", "thisWeek")}`,
      trendPositive: true,
      iconType: "users",
    },
    {
      title: t("admin", "pointsIssued"),
      value: totalPoints.toLocaleString(),
      trend: "Auto-Promos",
      trendPositive: true,
      iconType: "sparkles",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {kpis.map((kpi) => (
        <KPICard key={kpi.title} {...kpi} />
      ))}
    </div>
  )
}
