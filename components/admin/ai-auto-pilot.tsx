"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import {
  Loader2,
  AlertTriangle,
  Clock,
  Cake,
  UserMinus,
  TrendingDown,
  Star,
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

// Re-define locally since we can't import server-side types in client components
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

const severityColors: Record<string, string> = {
  urgent: "bg-red-500",
  warning: "bg-orange-500",
  info: "bg-blue-500",
}

const severityBadgeVariants: Record<string, string> = {
  urgent: "bg-red-500/15 text-red-600 border-red-500/30",
  warning: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  info: "bg-blue-500/15 text-blue-600 border-blue-500/30",
}

const tierColors: Record<string, string> = {
  Diamond: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  Gold: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  Silver: "bg-gray-400/15 text-gray-600 border-gray-400/30",
  Bronze: "bg-amber-600/15 text-amber-700 border-amber-600/30",
}

export default function AIAutoPilot() {
  const [alerts, setAlerts] = useState<AutoPilotAlert[]>([])
  const [summary, setSummary] = useState<AlertSummary>({
    total: 0,
    urgent: 0,
    warning: 0,
    info: 0,
    byType: {},
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set())
  const [sendingAlerts, setSendingAlerts] = useState<Set<string>>(new Set())
  const [filterType, setFilterType] = useState<string>("all")
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [aiOverview, setAiOverview] = useState<string | null>(null)
  const [aiEnhanced, setAiEnhanced] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  useEffect(() => {
    fetchAlerts()
  }, [])

  async function fetchAlerts() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/ai/auto-pilot")
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to fetch alerts")
      }
      const data = await response.json()
      setAlerts(data.alerts || [])
      setSummary(
        data.summary || {
          total: 0,
          urgent: 0,
          warning: 0,
          info: 0,
          byType: {},
        }
      )
      setAiOverview(data.aiOverview || null)
      setAiEnhanced(!!data.aiEnhanced)
      setAiError(data.aiError || null)
      setLastRefresh(new Date())
    } catch (err: any) {
      setError(err.message || "Failed to fetch alerts")
      toast.error("Failed to load auto-pilot alerts")
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
      toast.error(
        "WhatsApp is not connected. Please connect first using the WhatsApp button."
      )
      return
    }

    setSendingAlerts((prev) => new Set(prev).add(alert.id))

    try {
      // Send WhatsApp message
      const phone = formatPhone(alert.customer.phone)
      const msgResponse = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          message: alert.messageTemplate,
        }),
      })

      if (!msgResponse.ok) {
        const msgData = await msgResponse.json()
        throw new Error(msgData.error || "Failed to send message")
      }

      toast.success(`Message sent to ${alert.customer.name}`)

      // Remove alert from list after successful send
      setAlerts((prev) => prev.filter((a) => a.id !== alert.id))
      setSummary((prev) => ({
        ...prev,
        total: prev.total - 1,
        [alert.severity]:
          (prev[alert.severity as keyof AlertSummary] as number) - 1,
        byType: {
          ...prev.byType,
          [alert.type]: (prev.byType[alert.type] || 1) - 1,
        },
      }))
    } catch (err: any) {
      toast.error(err.message || "Failed to send message")
    } finally {
      setSendingAlerts((prev) => {
        const next = new Set(prev)
        next.delete(alert.id)
        return next
      })
    }
  }

  function toggleExpand(alertId: string) {
    setExpandedAlerts((prev) => {
      const next = new Set(prev)
      if (next.has(alertId)) {
        next.delete(alertId)
      } else {
        next.add(alertId)
      }
      return next
    })
  }

  const filteredAlerts = alerts.filter((alert) => {
    if (filterType === "all") return true
    if (filterType === "urgent") return alert.severity === "urgent"
    if (filterType === "warning") return alert.severity === "warning"
    if (filterType === "info") return alert.severity === "info"
    return alert.type === filterType
  })

  const filterOptions = [
    { key: "all", label: "All", count: summary.total },
    { key: "urgent", label: "Urgent", count: summary.urgent },
    { key: "warning", label: "Warning", count: summary.warning },
    { key: "info", label: "Info", count: summary.info },
  ]

  const typeFilterOptions = Object.entries(summary.byType)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => ({
      key: type,
      label: typeLabels[type] || type,
      count,
    }))

  return (
    <div className="space-y-4">
      {/* Summary Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-card/50 backdrop-blur-sm border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <Brain className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.total}</p>
                <p className="text-xs text-muted-foreground">Total Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/15 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.urgent}</p>
                <p className="text-xs text-muted-foreground">Urgent</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/15 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.warning}</p>
                <p className="text-xs text-muted-foreground">Warnings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.info}</p>
                <p className="text-xs text-muted-foreground">Opportunities</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Strategic Overview */}
      {!loading && (aiOverview || aiError) && (
        <Card className={`backdrop-blur-sm ${aiError ? "border-red-500/30 bg-red-500/5" : "border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/5"}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${aiError ? "bg-red-500/15" : "bg-amber-500/20"}`}>
                <Brain className={`w-5 h-5 ${aiError ? "text-red-600" : "text-amber-600"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold text-sm">
                    {aiError ? "AI Analysis Unavailable" : "JP&Co AI Strategic Overview"}
                  </h3>
                  {aiEnhanced && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-700 border-green-500/30">
                      AI ENHANCED
                    </Badge>
                  )}
                </div>
                {aiOverview && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{aiOverview}</p>
                )}
                {aiError && (
                  <p className="text-xs text-red-600 leading-relaxed">
                    AI enhancement failed: {aiError}. Rule-based alerts still work. Try refresh.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Bar */}
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex flex-wrap gap-2 flex-1">
              {filterOptions.map((opt) => (
                <Button
                  key={opt.key}
                  variant={filterType === opt.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType(opt.key)}
                  className={
                    filterType === opt.key
                      ? "bg-[#8b6f47] hover:bg-[#7a6140] text-white"
                      : ""
                  }
                >
                  {opt.label}
                  {opt.count > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-1.5 h-5 min-w-[20px] px-1.5 text-xs"
                    >
                      {opt.count}
                    </Badge>
                  )}
                </Button>
              ))}

              {typeFilterOptions.length > 0 && (
                <div className="w-px h-6 bg-border self-center hidden sm:block" />
              )}

              {typeFilterOptions.map((opt) => (
                <Button
                  key={opt.key}
                  variant={filterType === opt.key ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilterType(opt.key)}
                  className={
                    filterType === opt.key
                      ? "bg-[#8b6f47] hover:bg-[#7a6140] text-white"
                      : "text-muted-foreground"
                  }
                >
                  {opt.label}
                  <Badge
                    variant="secondary"
                    className="ml-1.5 h-5 min-w-[20px] px-1.5 text-xs"
                  >
                    {opt.count}
                  </Badge>
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {lastRefresh && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  Updated {lastRefresh.toLocaleTimeString()}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAlerts}
                disabled={loading}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card className="bg-card/50 backdrop-blur-sm min-h-[calc(100vh-380px)]">
          <CardContent className="flex flex-col items-center justify-center h-full min-h-[400px]">
            <Loader2 className="w-12 h-12 animate-spin text-[#8b6f47] mb-4" />
            <p className="text-base text-muted-foreground">
              Analyzing customer data...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card className="bg-card/50 backdrop-blur-sm border-red-500/20">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="w-10 h-10 text-red-500 mb-4" />
            <p className="text-red-600 font-medium mb-2">
              Failed to load alerts
            </p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchAlerts}>
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && filteredAlerts.length === 0 && (
        <Card className="bg-card/50 backdrop-blur-sm min-h-[calc(100vh-380px)]">
          <CardContent className="flex flex-col items-center justify-center h-full min-h-[400px]">
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
              <Shield className="w-10 h-10 text-green-500" />
            </div>
            <p className="text-xl font-semibold mb-2">All clear!</p>
            <p className="text-base text-muted-foreground text-center max-w-md">
              {filterType === "all"
                ? "No alerts right now. Your customers are happy. Auto-Pilot will notify you when action is needed."
                : `No ${filterType} alerts found. Try a different filter.`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Alert Cards List */}
      {!loading && !error && filteredAlerts.length > 0 && (
        <ScrollArea className="h-[calc(100vh-340px)] min-h-[450px]">
          <div className="space-y-3 pr-4">
            {filteredAlerts.map((alert) => {
              const TypeIcon = typeIcons[alert.type] || AlertTriangle
              const isExpanded = expandedAlerts.has(alert.id)
              const isSending = sendingAlerts.has(alert.id)

              return (
                <Card
                  key={alert.id}
                  className="bg-card/50 backdrop-blur-sm overflow-hidden"
                >
                  <div className="flex">
                    {/* Left color bar */}
                    <div
                      className={`w-1.5 shrink-0 ${severityColors[alert.severity]}`}
                    />

                    <div className="flex-1 p-4">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-lg shrink-0 flex items-center justify-center ${
                              alert.severity === "urgent"
                                ? "bg-red-500/15"
                                : alert.severity === "warning"
                                  ? "bg-orange-500/15"
                                  : "bg-blue-500/15"
                            }`}
                          >
                            <TypeIcon
                              className={`w-5 h-5 ${
                                alert.severity === "urgent"
                                  ? "text-red-600"
                                  : alert.severity === "warning"
                                    ? "text-orange-600"
                                    : "text-blue-600"
                              }`}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-sm leading-tight">
                                {alert.title}
                              </h4>
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 ${severityBadgeVariants[alert.severity]}`}
                              >
                                {alert.severity.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {alert.description}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Customer info line */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground ml-12 mb-2">
                        <span className="font-medium text-foreground">
                          {alert.customer.name}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${tierColors[alert.customer.tier] || ""}`}
                        >
                          {alert.customer.tier}
                        </Badge>
                        <span>{alert.customer.points} pts</span>
                        <span>
                          RM{alert.customer.totalSpent.toFixed(0)} spent
                        </span>
                        <span>{alert.customer.visits} visits</span>
                        {alert.customer.lastVisit && (
                          <span>
                            Last:{" "}
                            {new Date(
                              alert.customer.lastVisit
                            ).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {/* Expand/collapse toggle */}
                      <button
                        onClick={() => toggleExpand(alert.id)}
                        className="flex items-center gap-1 text-xs text-[#8b6f47] hover:text-[#7a6140] ml-12 mb-2 transition-colors"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            Hide details
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            Show details
                          </>
                        )}
                      </button>

                      {/* Expandable section */}
                      {isExpanded && (
                        <div className="ml-12 space-y-3 mb-3">
                          {/* Suggested action */}
                          <div className="p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Eye className="w-3.5 h-3.5 text-[#8b6f47]" />
                              <span className="text-xs font-medium">
                                Suggested Action
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {alert.suggestedAction}
                            </p>
                          </div>

                          {/* Message preview */}
                          <div className="p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-1.5 mb-1">
                              <MessageSquare className="w-3.5 h-3.5 text-[#8b6f47]" />
                              <span className="text-xs font-medium">
                                Message Preview
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                              {alert.messageTemplate}
                            </p>
                          </div>

                          {/* Voucher suggestion */}
                          {alert.voucherSuggestion && (
                            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                              <div className="flex items-center gap-1.5 mb-2">
                                <Gift className="w-3.5 h-3.5 text-amber-600" />
                                <span className="text-xs font-medium text-amber-700">
                                  Voucher Suggestion
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-muted-foreground">
                                    Name:{" "}
                                  </span>
                                  <span className="font-medium">
                                    {alert.voucherSuggestion.name}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">
                                    Discount:{" "}
                                  </span>
                                  <span className="font-medium">
                                    {alert.voucherSuggestion.discount_type ===
                                    "percentage"
                                      ? `${alert.voucherSuggestion.discount_value}%`
                                      : `RM${alert.voucherSuggestion.discount_value}`}
                                  </span>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-muted-foreground">
                                    Reason:{" "}
                                  </span>
                                  <span>
                                    {alert.voucherSuggestion.reason}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 ml-12">
                        <Button
                          size="sm"
                          onClick={() => handleAction(alert)}
                          disabled={isSending || !alert.customer.phone}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {isSending ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          {isSending ? "Sending..." : "Send Message"}
                        </Button>
                        {!alert.customer.phone && (
                          <span className="text-xs text-red-500">
                            No phone number
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
