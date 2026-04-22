"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, RefreshCw, Coins, Trash2, Gift, Activity } from "lucide-react"
import { useLanguage } from "@/lib/i18n"

type LogRow = {
  id: string
  staff_id: string
  action_type: string
  target_customer_id: string | null
  details: any
  created_at: string
  staff?: { full_name: string | null; email: string | null }
  customer?: { full_name: string | null; phone: string | null }
}

const ACTION_META: Record<string, { key: string; icon: any; color: string }> = {
  add_points: { key: "alActionAddPoints", icon: Coins, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  delete_points: { key: "alActionDeletePoints", icon: Trash2, color: "text-red-600 bg-red-50 border-red-200" },
  redeem_voucher: { key: "alActionRedeemVoucher", icon: Gift, color: "text-amber-600 bg-amber-50 border-amber-200" },
}

export default function AuditLogPage() {
  const { t, language } = useLanguage()
  const supabase = createClient()
  const [logs, setLogs] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "add_points" | "delete_points" | "redeem_voucher">("all")

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from("staff_activity_log")
        .select(`
          *,
          staff:profiles!staff_activity_log_staff_id_fkey(full_name, email),
          customer:profiles!staff_activity_log_target_customer_id_fkey(full_name, phone)
        `)
        .order("created_at", { ascending: false })
        .limit(300)

      if (filter !== "all") query = query.eq("action_type", filter)

      const { data } = await query
      setLogs((data as any) || [])
    } finally {
      setLoading(false)
    }
  }, [filter, supabase])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(
        language === "zh" ? "zh-CN" : language === "ms" ? "ms-MY" : "en-MY",
        { dateStyle: "short", timeStyle: "short" }
      )
    } catch {
      return iso
    }
  }

  const describeDetails = (row: LogRow) => {
    const d = row.details || {}
    if (row.action_type === "add_points") {
      return `RM ${d.amount ?? "—"} → +${d.points ?? 0} ${t("common", "pts")}`
    }
    if (row.action_type === "delete_points") {
      return `−${d.points_reversed ?? 0} ${t("common", "pts")} (RM ${d.amount_reversed ?? 0})`
    }
    if (row.action_type === "redeem_voucher") {
      return `${d.voucher_name || "—"}${d.voucher_code ? ` (${d.voucher_code})` : ""}`
    }
    return JSON.stringify(d)
  }

  const filters: Array<{ id: typeof filter; labelKey: string }> = [
    { id: "all", labelKey: "alFilterAll" },
    { id: "add_points", labelKey: "alFilterAdd" },
    { id: "delete_points", labelKey: "alFilterDelete" },
    { id: "redeem_voucher", labelKey: "alFilterRedeem" },
  ]

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-[#8b6f47]" />
            {t("admin", "alTitle")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("admin", "alDesc")}</p>
        </div>
        <Button onClick={loadLogs} variant="outline" className="gap-2" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {t("admin", "alRefresh")}
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <Button
            key={f.id}
            variant={filter === f.id ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.id)}
            className={filter === f.id ? "bg-[#8b6f47] hover:bg-[#7a5f3a]" : ""}
          >
            {t("admin", f.labelKey)}
          </Button>
        ))}
      </div>

      {loading && logs.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          {t("admin", "alLoading")}
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t("admin", "alNoLogs")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((row) => {
            const meta = ACTION_META[row.action_type] || {
              key: row.action_type,
              icon: Activity,
              color: "text-zinc-600 bg-zinc-50 border-zinc-200",
            }
            const Icon = meta.icon
            return (
              <Card key={row.id} className="overflow-hidden">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={`p-2 rounded-lg border ${meta.color} shrink-0`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={meta.color}>
                        {t("admin", meta.key) || row.action_type}
                      </Badge>
                      <span className="text-sm font-medium">{describeDetails(row)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        {t("admin", "alStaff")}:{" "}
                        <span className="font-medium">
                          {row.staff?.full_name || row.staff?.email || row.staff_id.slice(0, 8)}
                        </span>
                      </span>
                      {row.customer && (
                        <span>
                          {t("admin", "alCustomer")}:{" "}
                          <span className="font-medium">
                            {row.customer.full_name || row.customer.phone || "—"}
                          </span>
                        </span>
                      )}
                      <span className="ml-auto">{formatTime(row.created_at)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
