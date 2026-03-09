"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Users, MousePointerClick, DollarSign, Gift, RefreshCw, Loader2 } from "lucide-react"
import { TrafficSalesChart } from "@/components/traffic-sales-chart"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n"

export default function AnalyticsPage() {
  const supabase = createClient()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({
    totalCustomers: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    totalPointsIssued: 0,
    avgTransactionValue: 0,
    avgPointsPerCustomer: 0,
    // Trend data (compared to last 30 days vs previous 30 days)
    customersTrend: 0,
    revenueTrend: 0,
    transactionsTrend: 0,
    pointsTrend: 0,
  })

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()

      // Fetch all data
      const [profilesRes, transactionsRes] = await Promise.all([
        supabase.from("profiles").select("id, created_at, role").eq("role", "customer"),
        supabase.from("transactions").select("id, type, points, amount, created_at"),
      ])

      const profiles = profilesRes.data || []
      const transactions = transactionsRes.data || []

      // Current totals
      const totalCustomers = profiles.length
      const totalTransactions = transactions.length
      const totalRevenue = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0)
      const totalPointsIssued = transactions.filter(tx => tx.type === "earn").reduce((sum, tx) => sum + tx.points, 0)
      const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0
      const avgPointsPerCustomer = totalCustomers > 0 ? totalPointsIssued / totalCustomers : 0

      // Calculate trends (last 30 days vs previous 30 days)
      const recentCustomers = profiles.filter(p => new Date(p.created_at) >= new Date(thirtyDaysAgo)).length
      const prevCustomers = profiles.filter(p => new Date(p.created_at) >= new Date(sixtyDaysAgo) && new Date(p.created_at) < new Date(thirtyDaysAgo)).length

      const recentTx = transactions.filter(tx => new Date(tx.created_at) >= new Date(thirtyDaysAgo))
      const prevTx = transactions.filter(tx => new Date(tx.created_at) >= new Date(sixtyDaysAgo) && new Date(tx.created_at) < new Date(thirtyDaysAgo))

      const recentRevenue = recentTx.reduce((s, tx) => s + (tx.amount || 0), 0)
      const prevRevenue = prevTx.reduce((s, tx) => s + (tx.amount || 0), 0)

      const recentPoints = recentTx.filter(tx => tx.type === "earn").reduce((s, tx) => s + tx.points, 0)
      const prevPoints = prevTx.filter(tx => tx.type === "earn").reduce((s, tx) => s + tx.points, 0)

      const calcTrend = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0
        return ((current - previous) / previous) * 100
      }

      setData({
        totalCustomers,
        totalTransactions,
        totalRevenue,
        totalPointsIssued,
        avgTransactionValue,
        avgPointsPerCustomer,
        customersTrend: calcTrend(recentCustomers, prevCustomers),
        revenueTrend: calcTrend(recentRevenue, prevRevenue),
        transactionsTrend: calcTrend(recentTx.length, prevTx.length),
        pointsTrend: calcTrend(recentPoints, prevPoints),
      })
    } catch (err) {
      console.error("Analytics load error:", err)
    } finally {
      setLoading(false)
    }
  }

  const formatTrend = (value: number) => {
    const sign = value >= 0 ? "+" : ""
    return `${sign}${value.toFixed(1)}%`
  }

  const analyticsCards = [
    {
      title: t("admin", "totalCustomers"),
      value: data.totalCustomers.toLocaleString(),
      trend: data.customersTrend,
      icon: Users,
    },
    {
      title: t("admin", "totalRevenue"),
      value: `RM ${data.totalRevenue.toLocaleString()}`,
      trend: data.revenueTrend,
      icon: DollarSign,
    },
    {
      title: t("admin", "totalTransactions"),
      value: data.totalTransactions.toLocaleString(),
      trend: data.transactionsTrend,
      icon: MousePointerClick,
    },
    {
      title: t("admin", "pointsIssued"),
      value: data.totalPointsIssued.toLocaleString(),
      trend: data.pointsTrend,
      icon: Gift,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t("admin", "analyticsTitle")}</h2>
          <p className="text-muted-foreground">{t("admin", "analyticsDesc")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAnalytics} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          {loading ? t("common", "loading") : "Refresh"}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {analyticsCards.map((item) => (
              <Card key={item.title} className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {item.title}
                  </CardTitle>
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{item.value}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {item.trend >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span className={`text-xs ${item.trend >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {formatTrend(item.trend)}
                    </span>
                    <span className="text-xs text-muted-foreground">{t("admin", "vsLastMonth")}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Additional Stats */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("admin", "avgTransactionValue")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  RM {data.avgTransactionValue.toFixed(2)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{t("admin", "perTransaction")}</p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("admin", "avgPointsPerCustomer")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {data.avgPointsPerCustomer.toFixed(0)} pts
                </div>
                <p className="text-sm text-muted-foreground mt-1">{t("admin", "perMember")}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle>{t("admin", "trafficSalesOverview")}</CardTitle>
            </CardHeader>
            <CardContent>
              <TrafficSalesChart />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
