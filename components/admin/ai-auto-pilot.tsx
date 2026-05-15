"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  Loader2,
  AlertTriangle,
  Clock,
  Cake,
  UserMinus,
  TrendingDown,
  Target,
  Users,
  Send,
  Gift,
  RefreshCw,
  Zap,
  Shield,
  Brain,
  ChevronDown,
  ChevronUp,
  Eye,
  MessageSquare,
} from "lucide-react"
import { checkWhatsAppConnected } from "@/components/admin/floating-whatsapp"
import { useLanguage } from "@/lib/i18n"

interface AutoPilotAlert {
  id: string
  type:
    | "birthday"
    | "going_inactive"
    | "dormant"
    | "new_not_returned"
    | "vip_drop"
    | "points_milestone"
    | "high_value_risk"
    | "referral_opportunity"
  severity: "urgent" | "warning" | "info"
  title: string
  description: string
  customer: {
    id: string
    name: string
    phone: string | null
    points: number
    totalSpent: number
    visits: number
    lastVisit: string | null
    birthday: string | null
    tier: string
  }
  suggestedAction: string
  actionType: "send_message" | "create_voucher" | "send_and_voucher"
  messageTemplate: string
  voucherSuggestion?: {
    name: string
    discount_type: "percentage" | "fixed"
    discount_value: number
    reason: string
  }
}

interface AlertSummary {
  total: number
  urgent: number
  warning: number
  info: number
  byType: Record<string, number>
}

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "")
  if (cleaned.startsWith("60")) return cleaned
  if (cleaned.startsWith("0")) return "60" + cleaned.slice(1)
  return "60" + cleaned
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "1d ago"
  if (diffDays < 30) return `${diffDays}d ago`
  const diffMonths = Math.floor(diffDays / 30)
  return `${diffMonths}mo ago`
}

const typeIcons: Record<string, React.ElementType> = {
  birthday: Cake,
  going_inactive: UserMinus,
  dormant: UserMinus,
  new_not_returned: Clock,
  vip_drop: TrendingDown,
  points_milestone: Target,
  high_value_risk: Shield,
  referral_opportunity: Users,
}

const typeLabels: Record<string, string> = {
  birthday: "Birthday",
  going_inactive: "Inactive",
  dormant: "Dormant",
  new_not_returned: "New - Not Returned",
  vip_drop: "VIP Drop",
  points_milestone: "Milestone",
  high_value_risk: "High Value Risk",
  referral_opportunity: "Referral",
}

const severityBadgeVariants: Record<string, string> = {
  urgent: "bg-red-500/15 text-red-600 border-red-500/30",
  warning: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  info: "bg-[#8b6f47]/10 text-[#8b6f47] border-[#8b6f47]/25",
}

const tierColors: Record<string, string> = {
  Diamond: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  Gold: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  Silver: "bg-gray-400/15 text-gray-600 border-gray-400/30",
  Bronze: "bg-amber-600/15 text-amber-700 border-amber-600/30",
}

export default function AIAutoPilot() {
  const [alerts, setAlerts] = useState<AutoPilotAlert[]>([])
  const [summary, setSummary] = useState<AlertSummary>({ total: 0, urgent: 0, warning: 0, info: 0, byType: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set())
  const [sendingAlerts, setSendingAlerts] = useState<Set<string>>(new Set())
  const [filterType, setFilterType] = useState<string>("all")
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [aiOverview, setAiOverview] = useState<string | null>(null)
  const [aiEnhanced, setAiEnhanced] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const { languageRef } = useLanguage()

  useEffect(() => { fetchAlerts() }, [])

  async function fetchAlerts() {
    setLoading(true)
    setError(null)
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 55000)
      const localeAtFetch = languageRef.current
      const response = await fetch(`/api/ai/auto-pilot?locale=${encodeURIComponent(localeAtFetch)}`, {
        signal: controller.signal,
        cache: "no-store",
        headers: { "X-Locale": localeAtFetch },
      })
      clearTimeout(timeoutId)

      const contentType = response.headers.get("content-type") || ""
      if (!contentType.includes("application/json")) {
        const text = await response.text().catch(() => "")
        throw new Error(
          response.status === 504
            ? "Server timeout. Please try again."
            : `Unexpected ${response.status}: ${text.slice(0, 80)}`
        )
      }

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to fetch alerts")

      setAlerts(data.alerts || [])
      setSummary(data.summary || { total: 0, urgent: 0, warning: 0, info: 0, byType: {} })
      setAiOverview(data.aiOverview || null)
      setAiEnhanced(!!data.aiEnhanced)
      setAiError(data.aiError || null)
      setLastRefresh(new Date())
    } catch (err: any) {
      const msg = err?.name === "AbortError"
        ? "Request timed out after 55s. Please try again."
        : err?.message || "Failed to fetch alerts"
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleAction(alert: AutoPilotAlert) {
    if (!alert.customer.phone) {
      toast.error("This customer has no phone number on file")
      return
    }
    const connected = await checkWhatsAppConnected()
    if (!connected) {
      toast.error("WhatsApp is not connected. Please connect first using the WhatsApp button.")
      return
    }

    setSendingAlerts(prev => new Set(prev).add(alert.id))
    try {
      const phone = formatPhone(alert.customer.phone)
      const msgResponse = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, message: alert.messageTemplate }),
      })
      if (!msgResponse.ok) {
        const msgData = await msgResponse.json()
        throw new Error(msgData.error || "Failed to send message")
      }
      toast.success(`Message sent to ${alert.customer.name}`)
      setAlerts(prev => prev.filter(a => a.id !== alert.id))
      setSummary(prev => ({
        ...prev,
        total: prev.total - 1,
        [alert.severity]: (prev[alert.severity as keyof AlertSummary] as number) - 1,
        byType: { ...prev.byType, [alert.type]: (prev.byType[alert.type] || 1) - 1 },
      }))
    } catch (err: any) {
      toast.error(err.message || "Failed to send message")
    } finally {
      setSendingAlerts(prev => { const next = new Set(prev); next.delete(alert.id); return next })
    }
  }

  function toggleExpand(alertId: string) {
    setExpandedAlerts(prev => {
      const next = new Set(prev)
      next.has(alertId) ? next.delete(alertId) : next.add(alertId)
      return next
    })
  }

  const filteredAlerts = alerts.filter(alert => {
    if (filterType === "all") return true
    if (filterType === "urgent") return alert.severity === "urgent"
    if (filterType === "warning") return alert.severity === "warning"
    if (filterType === "info") return alert.severity === "info"
    return alert.type === filterType
  })

  const typeFilterOptions = Object.entries(summary.byType)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => ({ key: type, label: typeLabels[type] || type, count }))

  const filterOptions = [
    { key: "all", label: "All", count: summary.total },
    { key: "urgent", label: "Urgent", count: summary.urgent },
    { key: "warning", label: "Warning", count: summary.warning },
    { key: "info", label: "Info", count: summary.info },
    ...typeFilterOptions,
  ]

  return (
    <div className="space-y-6">

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Alerts */}
        <div className="p-6 rounded-xl border flex flex-col gap-2"
          style={{ background: "rgba(164,58,58,0.07)", borderColor: "rgba(164,58,58,0.18)" }}>
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#a43a3a" }}>Total Alerts</span>
            <AlertTriangle className="w-4 h-4" style={{ color: "#a43a3a" }} />
          </div>
          <div className="text-4xl font-extrabold" style={{ color: "#a43a3a" }}>{summary.total}</div>
          <p className="text-xs text-gray-400">Immediate action required</p>
        </div>

        {/* Urgent */}
        <div className="p-6 rounded-xl border flex flex-col gap-2"
          style={{ background: "rgba(133,83,0,0.07)", borderColor: "rgba(133,83,0,0.18)" }}>
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#855300" }}>Urgent</span>
            <AlertTriangle className="w-4 h-4" style={{ color: "#855300" }} />
          </div>
          <div className="text-4xl font-extrabold" style={{ color: "#855300" }}>{summary.urgent}</div>
          <p className="text-xs text-gray-400">Critical attention needed</p>
        </div>

        {/* Warnings */}
        <div className="p-6 rounded-xl border flex flex-col gap-2"
          style={{ background: "rgba(234,88,12,0.07)", borderColor: "rgba(234,88,12,0.18)" }}>
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600">Warnings</span>
            <Clock className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-4xl font-extrabold text-orange-600">{summary.warning}</div>
          <p className="text-xs text-gray-400">Monitor closely</p>
        </div>

        {/* Opportunities */}
        <div className="p-6 rounded-xl border border-gray-200 flex flex-col gap-2"
          style={{ background: "#e8f0e9" }}>
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Opportunities</span>
            <Zap className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-4xl font-extrabold text-gray-700">{summary.info}</div>
          <p className="text-xs text-gray-400">AI automation impact</p>
        </div>
      </div>

      {/* ── AI Error Notice (compact, no raw JSON) ── */}
      {!loading && aiError && !aiOverview && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800">
          <span className="text-base shrink-0">⚠️</span>
          <span>
            {aiError.includes("balance") || aiError.includes("10004")
              ? "AI 账户余额不足，请充值 302.AI 账户。下方规则警报仍然正常工作。"
              : aiError.includes("401") || aiError.includes("API key")
              ? "AI API Key 无效，请检查服务器 .env 文件。下方规则警报仍然正常工作。"
              : "AI 增强功能暂时不可用。下方规则警报仍然正常工作。"}
          </span>
        </div>
      )}

      {/* ── Strategic Overview Banner ── */}
      {!loading && aiOverview && (
        <div className="relative rounded-xl overflow-hidden border px-8 py-6 flex items-center"
          style={{
            background: "linear-gradient(135deg, rgba(139,111,71,0.07) 0%, rgba(253,252,247,1) 55%, rgba(254,166,25,0.05) 100%)",
            borderColor: "rgba(139,111,71,0.15)",
          }}>
          <div className="flex items-start gap-4 max-w-3xl">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "rgba(139,111,71,0.1)" }}>
              <Brain className="w-5 h-5" style={{ color: "#8b6f47" }} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <h3 className="font-semibold text-sm" style={{ color: "#8b6f47" }}>
                  JP&Co AI Strategic Overview
                </h3>
                {aiEnhanced && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full text-white"
                    style={{ background: "#8b6f47" }}>
                    AI ENHANCED
                  </span>
                )}
              </div>
              {aiOverview && (
                <p className="text-sm text-gray-600 leading-relaxed">{aiOverview}</p>
              )}
              {aiError && (
                <p className="text-xs text-red-500 leading-relaxed">
                  {aiError.includes("balance") || aiError.includes("10004")
                    ? "⚠️ AI 账户余额不足，请充值 302.AI 账户。规则警报仍然正常运行。"
                    : aiError.includes("401") || aiError.includes("API key")
                    ? "⚠️ AI API Key 无效，请检查 .env 配置。规则警报仍然正常运行。"
                    : "⚠️ AI 分析暂时不可用，规则警报仍然正常运行。点击刷新重试。"}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Customer Intelligence Alerts ── */}
      <div>
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Customer Intelligence Alerts</h3>
            <p className="text-sm text-gray-400 mt-0.5">
              Critical behavioral triggers requiring manual review or personalized messaging.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {lastRefresh && (
              <span className="text-xs text-gray-400">Updated {lastRefresh.toLocaleTimeString()}</span>
            )}
            <Button variant="outline" size="sm" onClick={fetchAlerts} disabled={loading}
              className="border-gray-200 text-gray-600">
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {filterOptions.map(opt => (
            <button key={opt.key}
              onClick={() => setFilterType(opt.key)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                filterType === opt.key
                  ? "text-white border-transparent"
                  : "text-gray-500 border-gray-200 bg-white hover:border-gray-300 hover:text-gray-700"
              }`}
              style={filterType === opt.key ? { background: "#8b6f47", borderColor: "#8b6f47" } : {}}>
              {opt.label}
              {opt.count > 0 && (
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                  filterType === opt.key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                }`}>{opt.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-gray-100">
            <Loader2 className="w-10 h-10 animate-spin mb-3" style={{ color: "#8b6f47" }} />
            <p className="text-sm text-gray-400">Analyzing customer data...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-red-100">
            <AlertTriangle className="w-10 h-10 text-red-400 mb-3" />
            <p className="font-semibold text-red-600 mb-1">Failed to load alerts</p>
            <p className="text-sm text-gray-400 mb-4">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchAlerts}>
              <RefreshCw className="w-4 h-4 mr-1.5" />Try Again
            </Button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filteredAlerts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-gray-100">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: "rgba(139,111,71,0.08)" }}>
              <Shield className="w-8 h-8" style={{ color: "#8b6f47" }} />
            </div>
            <p className="text-lg font-bold text-gray-800 mb-1">All clear!</p>
            <p className="text-sm text-gray-400 text-center max-w-sm">
              {filterType === "all"
                ? "No alerts right now. Your customers are happy. Auto-Pilot will notify you when action is needed."
                : `No ${filterType} alerts found. Try a different filter.`}
            </p>
          </div>
        )}

        {/* Alert Cards */}
        {!loading && !error && filteredAlerts.length > 0 && (
          <div className="space-y-3">
            {filteredAlerts.map(alert => {
              const TypeIcon = typeIcons[alert.type] || AlertTriangle
              const isExpanded = expandedAlerts.has(alert.id)
              const isSending = sendingAlerts.has(alert.id)
              const initial = alert.customer.name[0]?.toUpperCase() || "?"

              const [avatarBg, avatarColor, avatarBorder] =
                alert.severity === "urgent"
                  ? ["rgba(164,58,58,0.12)", "#a43a3a", "rgba(164,58,58,0.35)"]
                  : alert.severity === "warning"
                  ? ["rgba(133,83,0,0.10)", "#855300", "rgba(133,83,0,0.35)"]
                  : ["rgba(139,111,71,0.08)", "#8b6f47", "rgba(139,111,71,0.35)"]

              return (
                <div key={alert.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  {/* Main row */}
                  <div className="flex items-center gap-5 p-5">

                    {/* Avatar + Identity */}
                    <div className="flex items-center gap-3 shrink-0" style={{ minWidth: 200 }}>
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2"
                          style={{ background: avatarBg, color: avatarColor, borderColor: avatarBorder }}>
                          {initial}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white"
                          style={{ background: avatarColor }}>
                          <TypeIcon className="w-2.5 h-2.5 text-white" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-sm text-gray-900">{alert.customer.name}</span>
                          <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full border uppercase tracking-wide ${tierColors[alert.customer.tier] || ""}`}>
                            {alert.customer.tier}
                          </span>
                        </div>
                        <span className={`inline-block mt-0.5 px-2 py-0.5 text-[10px] font-bold rounded-full border ${severityBadgeVariants[alert.severity]}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* AI Description */}
                    <div className="flex-1 pl-5 border-l border-gray-100 min-w-0">
                      <p className="text-sm text-gray-500 italic leading-relaxed line-clamp-2">
                        {alert.description}
                      </p>
                      <button onClick={() => toggleExpand(alert.id)}
                        className="flex items-center gap-1 text-xs mt-1.5 font-semibold transition-colors"
                        style={{ color: "#8b6f47" }}>
                        {isExpanded
                          ? <><ChevronUp className="w-3.5 h-3.5" />Hide details</>
                          : <><ChevronDown className="w-3.5 h-3.5" />Show details</>}
                      </button>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-12 bg-gray-100 shrink-0" />

                    {/* Stats */}
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-x-5 gap-y-1 shrink-0" style={{ minWidth: 240 }}>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold">Points</p>
                        <p className="text-sm font-semibold text-gray-800">{alert.customer.points.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold">Spent</p>
                        <p className="text-sm font-semibold text-gray-800">RM{alert.customer.totalSpent.toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold">Visits</p>
                        <p className="text-sm font-semibold text-gray-800">{alert.customer.visits}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold">Last</p>
                        <p className="text-sm font-semibold text-gray-800">
                          {alert.customer.lastVisit ? formatRelativeDate(alert.customer.lastVisit) : "—"}
                        </p>
                      </div>
                    </div>

                    {/* Send Button */}
                    <button
                      onClick={() => handleAction(alert)}
                      disabled={isSending || !alert.customer.phone}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold whitespace-nowrap transition-all active:scale-[0.98] disabled:opacity-40 shrink-0"
                      style={{ background: "#8b6f47" }}>
                      {isSending
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Send className="w-4 h-4" />}
                      Send Message
                    </button>
                  </div>

                  {/* Expandable Details */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-gray-50 space-y-3"
                      style={{ background: "#f9fbf9" }}>
                      <div className="p-3 rounded-lg bg-white border border-gray-100">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Eye className="w-3.5 h-3.5" style={{ color: "#8b6f47" }} />
                          <span className="text-xs font-semibold text-gray-700">Suggested Action</span>
                        </div>
                        <p className="text-xs text-gray-500">{alert.suggestedAction}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white border border-gray-100">
                        <div className="flex items-center gap-1.5 mb-1">
                          <MessageSquare className="w-3.5 h-3.5" style={{ color: "#8b6f47" }} />
                          <span className="text-xs font-semibold text-gray-700">Message Preview</span>
                        </div>
                        <p className="text-xs text-gray-500 whitespace-pre-wrap">{alert.messageTemplate}</p>
                      </div>
                      {alert.voucherSuggestion && (
                        <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Gift className="w-3.5 h-3.5 text-amber-600" />
                            <span className="text-xs font-semibold text-amber-700">Voucher Suggestion</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-400">Name: </span>
                              <span className="font-medium">{alert.voucherSuggestion.name}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Discount: </span>
                              <span className="font-medium">
                                {alert.voucherSuggestion.discount_type === "percentage"
                                  ? `${alert.voucherSuggestion.discount_value}%`
                                  : `RM${alert.voucherSuggestion.discount_value}`}
                              </span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-400">Reason: </span>
                              <span>{alert.voucherSuggestion.reason}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
