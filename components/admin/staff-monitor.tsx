"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  AlertTriangle,
  Activity,
  Clock,
  TrendingUp,
  Shield,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Eye,
  Gift,
} from "lucide-react"
import { useLanguage } from "@/lib/i18n"

interface StaffLog {
  id: string
  staff_id: string
  action_type: string
  target_customer_id: string | null
  details: any
  created_at: string
  flagged: boolean
  flag_reason: string | null
  staff?: { full_name: string; email: string } | null
  customer?: { full_name: string; phone: string } | null
}

interface StaffSummary {
  staffId: string
  staffName: string
  totalActions: number
  pointsAdded: number
  vouchersRedeemed: number
  anomalies: number
  lastAction: string
}

export function StaffMonitor() {
  const [logs, setLogs] = useState<StaffLog[]>([])
  const [summaries, setSummaries] = useState<StaffSummary[]>([])
  const [anomalies, setAnomalies] = useState<StaffLog[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedStaff, setExpandedStaff] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<"today" | "week" | "month">("today")
  const { t } = useLanguage()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [timeRange])

  const getTimeFilter = () => {
    const now = new Date()
    if (timeRange === "today") {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    } else if (timeRange === "week") {
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    } else {
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const since = getTimeFilter()

      // Try to load from staff_activity_log first
      const { data: activityLogs, error: logError } = await supabase
        .from("staff_activity_log")
        .select(`
          *,
          staff:profiles!staff_activity_log_staff_id_fkey(full_name, email),
          customer:profiles!staff_activity_log_target_customer_id_fkey(full_name, phone)
        `)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(200)

      if (!logError && activityLogs) {
        setLogs(activityLogs)
        
        // Detect anomalies
        const flagged = detectAnomalies(activityLogs)
        setAnomalies(flagged)

        // Build staff summaries
        const staffMap = new Map<string, StaffSummary>()
        for (const log of activityLogs) {
          const sid = log.staff_id
          if (!staffMap.has(sid)) {
            staffMap.set(sid, {
              staffId: sid,
              staffName: log.staff?.full_name || log.staff?.email || t("admin", "smUnknown"),
              totalActions: 0,
              pointsAdded: 0,
              vouchersRedeemed: 0,
              anomalies: 0,
              lastAction: log.created_at,
            })
          }
          const s = staffMap.get(sid)!
          s.totalActions++
          if (log.action_type === "add_points") {
            s.pointsAdded += log.details?.points || 0
          }
          if (log.action_type === "redeem_voucher") {
            s.vouchersRedeemed++
          }
          if (log.flagged) {
            s.anomalies++
          }
        }
        setSummaries(Array.from(staffMap.values()))
      } else {
        // Fallback: load from transactions table
        const { data: txData } = await supabase
          .from("transactions")
          .select(`
            id, points, amount, reason, type, created_at,
            staff:profiles!transactions_staff_id_fkey(full_name, email),
            customer:profiles!transactions_user_id_fkey(full_name, phone)
          `)
          .not("staff_id", "is", null)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(200)

        if (txData) {
          const mappedLogs: StaffLog[] = txData.map((tx: any) => ({
            id: tx.id,
            staff_id: "",
            action_type: tx.type === "earn" ? "add_points" : "redeem_voucher",
            target_customer_id: null,
            details: { points: tx.points, amount: tx.amount, reason: tx.reason },
            created_at: tx.created_at,
            flagged: false,
            flag_reason: null,
            staff: tx.staff,
            customer: tx.customer,
          }))
          setLogs(mappedLogs)
          const flagged = detectAnomalies(mappedLogs)
          setAnomalies(flagged)
        }
      }
    } catch (err) {
      console.error("Staff monitor load error:", err)
    } finally {
      setLoading(false)
    }
  }

  // Anomaly detection rules
  const detectAnomalies = (allLogs: StaffLog[]): StaffLog[] => {
    const flagged: StaffLog[] = []

    // Group logs by staff
    const byStaff = new Map<string, StaffLog[]>()
    for (const log of allLogs) {
      const sid = log.staff_id
      if (!byStaff.has(sid)) byStaff.set(sid, [])
      byStaff.get(sid)!.push(log)
    }

    for (const [staffId, staffLogs] of byStaff) {
      // Rule 1: High amount transactions (> RM 500)
      for (const log of staffLogs) {
        if (log.action_type === "add_points" && log.details?.amount > 500) {
          log.flagged = true
          log.flag_reason = `High amount: RM ${log.details.amount}`
          flagged.push(log)
        }
      }

      // Rule 2: Rapid consecutive actions (< 2 min apart for same customer)
      const sorted = [...staffLogs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1]
        const curr = sorted[i]
        const timeDiff = new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime()
        if (timeDiff < 120000 && prev.target_customer_id === curr.target_customer_id && prev.target_customer_id) {
          curr.flagged = true
          curr.flag_reason = `Rapid repeat action on same customer (${Math.round(timeDiff / 1000)}s apart)`
          flagged.push(curr)
        }
      }

      // Rule 3: Unusually high number of actions in a short period
      if (staffLogs.length > 20) {
        const timeSpanMs = new Date(staffLogs[0].created_at).getTime() - new Date(staffLogs[staffLogs.length - 1].created_at).getTime()
        const hours = timeSpanMs / (1000 * 60 * 60)
        if (hours > 0 && staffLogs.length / hours > 15) {
          // More than 15 actions/hour is suspicious
          const first = staffLogs[0]
          if (!first.flagged) {
            first.flagged = true
            first.flag_reason = `High activity rate: ${Math.round(staffLogs.length / hours)} actions/hour`
            flagged.push(first)
          }
        }
      }
    }

    return flagged
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString("en-MY", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="size-6 text-[#8b6f47]" />
            {t("admin", "staffActivityMonitor")}
          </h2>
          <p className="text-muted-foreground text-sm">{t("admin", "staffMonitorDesc")}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-0.5">
            {(["today", "week", "month"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                  timeRange === r ? "bg-white shadow text-[#8b6f47] font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r === "today" ? t("admin", "smToday") : r === "week" ? t("admin", "sm7Days") : t("admin", "sm30Days")}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Anomaly Alert */}
      {anomalies.length > 0 && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-amber-700 dark:text-amber-400 flex items-center gap-2 text-lg">
              <AlertTriangle className="size-5" />
              {anomalies.length} {anomalies.length === 1 ? t("admin", "smSuspiciousDetected") : t("admin", "smSuspiciousActivities")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {anomalies.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-lg border border-amber-200">
                <div>
                  <p className="font-medium text-sm">
                    <span className="text-amber-600">{a.staff?.full_name || t("admin", "smStaff")}</span>
                    {" → "}
                    <span>{a.customer?.full_name || t("admin", "smCustomer")}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{a.flag_reason}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="border-amber-300 text-amber-600 text-xs">
                    {a.action_type === "add_points" ? t("admin", "smPoints") : t("admin", "smVoucher")}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">{formatTime(a.created_at)}</p>
                </div>
              </div>
            ))}
            {anomalies.length > 5 && (
              <p className="text-xs text-amber-600 text-center">+ {anomalies.length - 5} {t("admin", "smMore")}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Staff Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {summaries.map((s) => (
          <Card key={s.staffId} className={`transition-all ${s.anomalies > 0 ? "border-amber-300" : ""}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#8b6f47]/10 flex items-center justify-center">
                    <Users className="size-4 text-[#8b6f47]" />
                  </div>
                  <span className="font-semibold">{s.staffName}</span>
                </div>
                {s.anomalies > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {s.anomalies} {t("admin", "smFlags")}
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-foreground">{s.totalActions}</p>
                  <p className="text-[10px] text-muted-foreground">{t("admin", "smActions")}</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-emerald-500">+{s.pointsAdded}</p>
                  <p className="text-[10px] text-muted-foreground">{t("admin", "smPoints")}</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-blue-500">{s.vouchersRedeemed}</p>
                  <p className="text-[10px] text-muted-foreground">{t("admin", "smVouchers")}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-3 text-xs"
                onClick={() => setExpandedStaff(expandedStaff === s.staffId ? null : s.staffId)}
              >
                <Eye className="size-3 mr-1" />
                {expandedStaff === s.staffId ? t("admin", "smHide") : t("admin", "smViewDetails")}
                {expandedStaff === s.staffId ? <ChevronUp className="size-3 ml-1" /> : <ChevronDown className="size-3 ml-1" />}
              </Button>

              {expandedStaff === s.staffId && (
                <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
                  {logs
                    .filter((l) => l.staff_id === s.staffId || l.staff?.full_name === s.staffName)
                    .slice(0, 15)
                    .map((l) => (
                      <div
                        key={l.id}
                        className={`flex items-center justify-between text-xs p-2 rounded ${
                          l.flagged ? "bg-amber-50 border border-amber-200" : "bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {l.flagged && <AlertTriangle className="size-3 text-amber-500" />}
                          <span className="text-muted-foreground">
                            {l.action_type === "add_points" ? "+" : "🎫"}{" "}
                            {l.customer?.full_name || t("admin", "smCustomer")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {l.details?.points && (
                            <span className="text-emerald-600 font-medium">{l.details.points} {t("common", "pts")}</span>
                          )}
                          <span className="text-muted-foreground">{formatTime(l.created_at)}</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="size-5 text-[#8b6f47]" />
            {t("admin", "smActivityTimeline")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <RefreshCw className="size-5 animate-spin mr-2" />
              {t("common", "loading")}
            </div>
          ) : logs.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {logs.slice(0, 50).map((log) => (
                <div
                  key={log.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    log.flagged
                      ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20"
                      : "bg-secondary/30 border-border/30 hover:border-[#8b6f47]/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      log.flagged ? "bg-amber-100" : log.action_type === "add_points" ? "bg-emerald-100" : "bg-blue-100"
                    }`}>
                      {log.flagged ? (
                        <AlertTriangle className="size-4 text-amber-600" />
                      ) : log.action_type === "add_points" ? (
                        <TrendingUp className="size-4 text-emerald-600" />
                      ) : (
                        <Gift className="size-4 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        <span className="text-[#8b6f47]">{log.staff?.full_name || t("admin", "smStaff")}</span>
                        {" → "}
                        <span>{log.customer?.full_name || t("admin", "smCustomer")}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {log.action_type === "add_points"
                          ? `Added ${log.details?.points || 0} pts (RM ${log.details?.amount || 0})`
                          : `Redeemed: ${log.details?.voucher_name || t("admin", "smVoucher")}`}
                        {log.flagged && <span className="text-amber-500 ml-2">⚠ {log.flag_reason}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatTime(log.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="size-12 mx-auto mb-3 opacity-50" />
              <p>{t("admin", "smNoActivity")}</p>
              <p className="text-sm mt-1">{t("admin", "smActivitiesWillAppear")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
