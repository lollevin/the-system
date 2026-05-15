"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
// Tabs replaced with custom sidebar navigation
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  Bot,
  Send,
  Loader2,
  Sparkles,
  MessageSquare,
  Users,
  Zap,
  Target,
  Brain,
  Gift,
  CheckCircle2,
  User,
  Phone,
  Edit,
  Copy,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { SmartAICopilot } from "@/components/admin/smart-ai-copilot"
import { AICustomerAnalyzer } from "@/components/admin/ai-customer-analyzer"
import AIAutoPilot from "@/components/admin/ai-auto-pilot"
import { FloatingWhatsApp, checkWhatsAppConnected } from "@/components/admin/floating-whatsapp"
import { KnowledgeBase } from "@/components/admin/knowledge-base"
import { createClient } from "@/lib/supabase/client"
import { useLanguage } from "@/lib/i18n"
import { History as HistoryIcon, Radar, BarChart3, BookOpen, Activity, CheckCircle, AlertCircle } from "lucide-react"

interface CustomerAction {
  id: string
  name: string
  phone: string
  message: string
  reason: string
  selected: boolean
  sent: boolean
  editing: boolean
}

interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  customerActions?: CustomerAction[]
  metadata?: {
    targetCount?: number
    campaign?: {
      name: string
      status: string
    }
  }
}

export default function AICopilotPage() {
  const { t, language, languageRef } = useLanguage()

  // Quick prompts - Marketing + Business Insights
  const quickPrompts = [
    { icon: Users, label: t("ai", "findBirthdayCustomers"), prompt: "Find all customers with upcoming birthdays and create personalized birthday messages for each of them" },
    { icon: Target, label: t("ai", "wakeUpDormant"), prompt: "Show me all dormant customers who haven't visited in 30+ days, and create comeback offers for them" },
    { icon: Zap, label: t("ai", "vipExclusiveOffer"), prompt: "Create a special VIP exclusive offer for our top spending customers" },
    { icon: Sparkles, label: t("ai", "welcomeNewMembers"), prompt: "Find new customers who joined this week and create welcome messages" },
  ]

  // Business insight quick prompts
  const insightPrompts = [
    { icon: BarChart3, label: t("ai", "revenueToday"), prompt: "How much revenue did we make today and this month? Compare with last month." },
    { icon: Users, label: t("ai", "customerHealth"), prompt: "Give me a customer health report - how many active vs dormant, what's the trend?" },
    { icon: Brain, label: t("ai", "weeklyReport"), prompt: "Give me a complete weekly business report - revenue, customer activity, top performers, and recommendations." },
    { icon: Target, label: t("ai", "topCustomers"), prompt: "Who are our top 10 customers by spending and by visits? Any VIPs at risk?" },
  ]

  const [activeTab, setActiveTab] = useState("autopilot")
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sendingCustomers, setSendingCustomers] = useState<Set<string>>(new Set())
  const [messageStats, setMessageStats] = useState({ todaySent: 0, totalSent: 0 })
  const [recentMessages, setRecentMessages] = useState<any[]>([])
  const [aiHealth, setAiHealth] = useState<{
    ok: boolean
    loading: boolean
    model?: string
    error?: string
    latencyMs?: number
  }>({ ok: false, loading: true })
  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const testAIConnection = async () => {
    setAiHealth(prev => ({ ...prev, loading: true }))
    try {
      const res = await fetch("/api/ai/test")
      const data = await res.json()
      setAiHealth({
        ok: !!data.ok,
        loading: false,
        model: data.workingModel || data.primaryModel,
        error: data.error,
        latencyMs: data.latencyMs,
      })
      if (data.ok) {
        toast.success(t("ai", "ai_status_online"))
      } else {
        toast.error(t("ai", "ai_status_unavailable"))
      }
    } catch (err: any) {
      setAiHealth({ ok: false, loading: false, error: err.message })
      toast.error(t("ai", "ai_status_failed_check"))
    }
  }

  useEffect(() => {
    testAIConnection()
  }, [])

  // Load message stats
  useEffect(() => {
    const loadMessageStats = async () => {
      const { count: totalSent } = await supabase
        .from("sent_messages")
        .select("*", { count: "exact", head: true })
      
      const { count: todaySent } = await supabase
        .from("sent_messages")
        .select("*", { count: "exact", head: true })
        .gte("created_at", new Date().toISOString().split("T")[0])

      setMessageStats({ todaySent: todaySent || 0, totalSent: totalSent || 0 })

      const { data } = await supabase
        .from("sent_messages")
        .select("*, customer:customer_id(full_name, phone)")
        .order("created_at", { ascending: false })
        .limit(10)
      
      if (data) setRecentMessages(data)
    }
    loadMessageStats()
  }, [])
  
  // Initialize: restore persisted chat from localStorage, or show welcome message
  useEffect(() => {
    if (messages.length !== 0) return
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem("jpco_ai_chat") : null
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })))
          return
        }
      }
    } catch {}
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: t("ai", "welcomeMessage"),
      timestamp: new Date(),
    }])
  }, [])

  // Persist chat to localStorage so session survives refresh / restart.
  // Keep last 80 messages to cap storage.
  useEffect(() => {
    if (messages.length === 0) return
    try {
      const trimmed = messages.slice(-80)
      localStorage.setItem("jpco_ai_chat", JSON.stringify(trimmed))
    } catch {}
  }, [messages])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Format phone for WhatsApp
  const formatPhone = (phone: string | null): string => {
    if (!phone) return ""
    const clean = phone.replace(/\D/g, "")
    if (clean.startsWith("60")) return clean
    if (clean.startsWith("0")) return "60" + clean.substring(1)
    return "60" + clean
  }

  const openWaFallback = (phone: string, message: string) => {
    if (!phone) return
    const waUrl = `https://wa.me/${phone}${message ? `?text=${encodeURIComponent(message)}` : ""}`
    window.open(waUrl, "_blank")
  }

  // Send WhatsApp to a specific customer from chat
  const sendToCustomer = async (messageId: string, customerId: string) => {
    const msg = messages.find(m => m.id === messageId)
    const action = msg?.customerActions?.find(a => a.id === customerId)
    if (!action) return
    const phone = formatPhone(action.phone)

    // Check WhatsApp connection (service mode). If unavailable, fallback to wa.me manual mode.
    const connected = await checkWhatsAppConnected()
    if (!connected) {
      openWaFallback(phone, action.message)
      toast.warning(t("ai", "waNotConnected"), {
        description: t("ai", "waSwitchedToWaMe"),
        duration: 5000,
      })
      return
    }

    setSendingCustomers(prev => new Set(prev).add(customerId))

    try {
      const response = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, message: action.message }),
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to send")
      }

      // Mark as sent
      setMessages(prev => prev.map(m => {
        if (m.id === messageId && m.customerActions) {
          return {
            ...m,
            customerActions: m.customerActions.map(a =>
              a.id === customerId ? { ...a, sent: true } : a
            )
          }
        }
        return m
      }))

      // Record in sent_messages
      try {
        await supabase.from("sent_messages").insert({
          customer_id: customerId,
          message_type: "ai_chat",
          message_content: action.message,
          channel: "whatsapp",
          status: "sent"
        })
      } catch {}

      toast.success(`${t("ai", "messageSentTo")} ${action.name}!`)
    } catch (err: any) {
      openWaFallback(phone, action.message)
      toast.warning(`${t("ai", "failedToSendTo")} ${action.name}`, {
        description: `${err.message || "Send failed"}. ${t("ai", "waSwitchedToWaMe")}`,
      })
    } finally {
      setSendingCustomers(prev => {
        const next = new Set(prev)
        next.delete(customerId)
        return next
      })
    }
  }

  // Send to all selected customers
  const sendToSelected = async (messageId: string) => {
    const connected = await checkWhatsAppConnected()
    if (!connected) {
      toast.error(t("ai", "waNotConnected"), {
        description: t("ai", "scanQrFirst"),
        duration: 5000,
      })
      return
    }

    const msg = messages.find(m => m.id === messageId)
    const selected = msg?.customerActions?.filter(a => a.selected && !a.sent) || []
    
    if (selected.length === 0) {
      toast.error(t("ai", "noCustomersSelected"))
      return
    }

    for (const action of selected) {
      await sendToCustomer(messageId, action.id)
      // Small delay between sends
      await new Promise(r => setTimeout(r, 1000))
    }

    toast.success(`${t("ai", "sent")} ${selected.length} ${t("ai", "sentToCustomers")}`)
  }

  // Toggle customer selection
  const toggleCustomerSelect = (messageId: string, customerId: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === messageId && m.customerActions) {
        return {
          ...m,
          customerActions: m.customerActions.map(a =>
            a.id === customerId ? { ...a, selected: !a.selected } : a
          )
        }
      }
      return m
    }))
  }

  // Toggle select all
  const toggleSelectAll = (messageId: string) => {
    const msg = messages.find(m => m.id === messageId)
    const allSelected = msg?.customerActions?.every(a => a.selected || a.sent)
    setMessages(prev => prev.map(m => {
      if (m.id === messageId && m.customerActions) {
        return {
          ...m,
          customerActions: m.customerActions.map(a =>
            a.sent ? a : { ...a, selected: !allSelected }
          )
        }
      }
      return m
    }))
  }

  // Edit customer message
  const updateCustomerMessage = (messageId: string, customerId: string, newMsg: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === messageId && m.customerActions) {
        return {
          ...m,
          customerActions: m.customerActions.map(a =>
            a.id === customerId ? { ...a, message: newMsg } : a
          )
        }
      }
      return m
    }))
  }

  // Toggle editing
  const toggleEditing = (messageId: string, customerId: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === messageId && m.customerActions) {
        return {
          ...m,
          customerActions: m.customerActions.map(a =>
            a.id === customerId ? { ...a, editing: !a.editing } : a
          )
        }
      }
      return m
    }))
  }

  const handleSend = async (customInput?: string) => {
    const messageText = customInput || input
    if (!messageText.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      // Include up to last 30 turns so AI has deep short-term context within a session.
      // Long-term memory is separately persisted in ai_memories.
      const conversationHistory = messages
        .slice(-30)
        .map(m => `${m.role === "user" ? "Admin" : "AI"}: ${m.content}`)
        .join("\n")

      // Snapshot the locale at SEND time (not stale closure time) so an
      // in-flight request is never parsed against an old language.
      const localeAtSend = languageRef.current

      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Locale": localeAtSend,
        },
        body: JSON.stringify({
          goal: messageText,
          conversationHistory,
          language: localeAtSend,
          requestId: Date.now()
        }),
      })

      // Robust response parsing - handle HTML error pages
      const contentType = response.headers.get("content-type") || ""
      let data: any
      if (contentType.includes("application/json")) {
        data = await response.json()
      } else {
        const text = await response.text()
        const snippet = text.slice(0, 200)
        throw new Error(
          response.status === 504
            ? "AI request timed out. The service is slow — try a shorter prompt or try again."
            : response.status >= 500
              ? `Server error (${response.status}). Try again in a moment.`
              : response.status === 429
                ? "Rate limit exceeded. Please wait a minute."
                : `Unexpected response from server (${response.status}): ${snippet}`
        )
      }

      if (!response.ok) {
        throw new Error(data.error || data.message || "Generation failed")
      }

      // Parse customer actions
      let customerActions: CustomerAction[] = []
      if (data.customerActions && data.customerActions.length > 0) {
        customerActions = data.customerActions.map((a: any) => ({
          ...a,
          selected: true, // Selected by default
          sent: false,
          editing: false,
        }))
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
        customerActions: customerActions.length > 0 ? customerActions : undefined,
        metadata: {
          targetCount: customerActions.length,
        },
      }

      setMessages(prev => [...prev, assistantMessage])

    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: error instanceof Error ? `❌ ${t("common", "error")}: ${error.message}` : `❌ ${t("ai", "somethingWentWrong")}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
      toast.error(t("ai", "failedAiResponse"))
    } finally {
      setIsLoading(false)
    }
  }

  // Render customer action cards
  const renderCustomerActions = (messageId: string, actions: CustomerAction[]) => {
    const selectedCount = actions.filter(a => a.selected && !a.sent).length
    const sentCount = actions.filter(a => a.sent).length

    return (
      <div className="mt-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#8b6f47]" />
            <span className="text-sm font-medium">
              {actions.length} {t("ai", "customersFound")}
              {sentCount > 0 && <span className="text-green-500 ml-1">· {sentCount} {t("ai", "sentCount")}</span>}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => toggleSelectAll(messageId)}
            >
              {actions.every(a => a.selected || a.sent) ? t("ai", "deselectAll") : t("ai", "selectAll")}
            </Button>
            {selectedCount > 0 && (
              <Button
                size="sm"
                className="bg-green-500 hover:bg-green-600 text-white h-7 text-xs gap-1"
                onClick={() => sendToSelected(messageId)}
              >
                <Send className="w-3 h-3" />
                {t("ai", "sendToSelected")} {selectedCount} {t("ai", "selected")}
              </Button>
            )}
          </div>
        </div>

        {/* Customer Cards */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {actions.map(action => (
            <div
              key={action.id}
              className={`p-3 rounded-lg border transition-all ${
                action.sent
                  ? "bg-green-500/10 border-green-500/30"
                  : action.selected
                    ? "bg-[#8b6f47]/10 border-[#8b6f47]/30"
                    : "bg-card border-border"
              }`}
            >
              {/* Customer Header */}
              <div className="flex items-center gap-3">
                {!action.sent && (
                  <Checkbox
                    checked={action.selected}
                    onCheckedChange={() => toggleCustomerSelect(messageId, action.id)}
                  />
                )}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  action.sent ? "bg-green-500 text-white" : "bg-[#8b6f47]/20"
                }`}>
                  {action.sent ? <CheckCircle2 className="w-4 h-4" /> : <User className="w-4 h-4 text-[#8b6f47]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{action.name}</span>
                    {action.sent && <Badge className="bg-green-500 text-xs">{t("ai", "sent")}</Badge>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="w-3 h-3" />
                    <span>{action.phone || t("admin", "noPhone")}</span>
                    {action.reason && (
                      <>
                        <span>·</span>
                        <span className="text-[#8b6f47]">{action.reason}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!action.sent && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => toggleEditing(messageId, action.id)}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          import("@/lib/utils").then(({ copyToClipboard }) => copyToClipboard(action.message))
                          toast.success(t("ai", "copied"))
                        }}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-500 hover:bg-green-600 text-white h-7 text-xs gap-1"
                        onClick={() => sendToCustomer(messageId, action.id)}
                        disabled={sendingCustomers.has(action.id) || !action.phone}
                      >
                        {sendingCustomers.has(action.id) ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Send className="w-3 h-3" />
                        )}
                        {t("ai", "send")}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Message Preview / Edit */}
              {action.editing ? (
                <div className="mt-2 pl-11">
                  <Textarea
                    value={action.message}
                    onChange={(e) => updateCustomerMessage(messageId, action.id, e.target.value)}
                    className="min-h-[100px] text-xs font-mono"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-1 h-6 text-xs"
                    onClick={() => toggleEditing(messageId, action.id)}
                  >
                    {t("ai", "done")}
                  </Button>
                </div>
              ) : (
                <div className="mt-2 pl-11">
                  <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                    {action.message}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Navigation items for the sidebar
  const navItems = [
    { id: "autopilot", label: t("ai", "autoPilot"), icon: Radar, desc: t("ai", "autoPilotDesc") },
    { id: "analyzer", label: t("ai", "customerAnalyzer"), icon: Brain, desc: t("ai", "analyzeMessage") },
    { id: "smart", label: t("ai", "smartRecommendations"), icon: Sparkles, desc: t("ai", "aiSuggestions") },
    { id: "chat", label: t("ai", "aiChatInsights"), icon: MessageSquare, desc: t("ai", "askAnything") },
    { id: "knowledge", label: t("admin", "knowledgeBase"), icon: BookOpen, desc: t("ai", "kbUploadDesc") },
  ]

  return (
    <div className="flex flex-col lg:flex-row gap-4 min-h-[calc(100vh-120px)]">
      {/* ===== LEFT SIDEBAR (Desktop) / TOP NAV (Mobile) ===== */}
      <div className="lg:w-56 shrink-0">
        <div className="lg:sticky lg:top-4 space-y-3">
          {/* Sidebar Header */}
          <div className="p-3 rounded-xl border" style={{ background: "rgba(0,108,73,0.06)", borderColor: "rgba(0,108,73,0.15)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#006c49" }}>
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold leading-tight truncate" style={{ color: "#006c49" }}>{t("ai", "marketingCenter")}</h1>
                <p className="text-[11px] text-muted-foreground leading-tight">AI-Native Intelligence</p>
              </div>
            </div>
          </div>

          {/* AI Health Status */}
          <button
            onClick={testAIConnection}
            disabled={aiHealth.loading}
            title={aiHealth.ok ? `${t("ai", "ai_status_online")} · ${aiHealth.latencyMs ?? "—"}ms` : t("ai", "ai_status_subtitle_retry")}
            className={`w-full p-2.5 rounded-xl border transition-all text-left group ${
              aiHealth.loading
                ? "border-amber-500/20"
                : aiHealth.ok
                  ? "hover:opacity-80"
                  : "border-orange-500/25 hover:opacity-80"
            }`}
            style={
              aiHealth.loading
                ? { background: "rgba(251,191,36,0.05)" }
                : aiHealth.ok
                  ? { background: "rgba(0,108,73,0.05)", borderColor: "rgba(0,108,73,0.2)" }
                  : { background: "rgba(249,115,22,0.05)" }
            }
          >
            <div className="flex items-center gap-2">
              {aiHealth.loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
              ) : aiHealth.ok ? (
                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-orange-600 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-[11px] font-semibold ${
                  aiHealth.loading ? "text-amber-700" : aiHealth.ok ? "text-emerald-700" : "text-orange-700"
                }`}>
                  {aiHealth.loading
                    ? t("ai", "ai_status_checking")
                    : aiHealth.ok
                      ? t("ai", "ai_status_online")
                      : t("ai", "ai_status_unavailable")}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {aiHealth.loading
                    ? "…"
                    : aiHealth.ok
                      ? t("ai", "ai_status_subtitle_ok")
                      : t("ai", "ai_status_subtitle_retry")}
                </p>
              </div>
              <Activity className={`w-3.5 h-3.5 transition-opacity opacity-50 group-hover:opacity-100 ${
                aiHealth.loading ? "text-amber-600" : aiHealth.ok ? "text-green-600" : "text-orange-600"
              }`} />
            </div>
          </button>

          {/* Navigation Buttons - Horizontal on mobile, vertical on desktop */}
          <nav className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-hide">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`
                    relative flex items-center gap-2.5 px-3 py-3 rounded-xl
                    transition-all duration-200 ease-out
                    min-w-[130px] lg:min-w-0 lg:w-full text-left
                    ${isActive
                      ? "shadow-sm border"
                      : "bg-card/60 hover:bg-muted/60 border border-transparent hover:border-border/50"
                    }
                  `}
                  style={isActive ? { background: "rgba(0,108,73,0.1)", borderColor: "rgba(0,108,73,0.2)" } : {}}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <div className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 rounded-r-full transition-all duration-300"
                      style={{ background: "#006c49" }} />
                  )}
                  <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                    transition-all duration-200
                    ${isActive ? "" : "bg-muted/50"}
                  `}
                  style={isActive ? { background: "rgba(0,108,73,0.15)" } : {}}>
                    <Icon className={`w-[18px] h-[18px] transition-colors duration-200 ${isActive ? "" : "text-muted-foreground"}`}
                      style={isActive ? { color: "#006c49" } : {}} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className={`text-[13px] font-medium truncate transition-colors duration-200 ${isActive ? "" : "text-foreground"}`}
                      style={isActive ? { color: "#006c49" } : {}}>
                      {item.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate hidden lg:block">
                      {item.desc}
                    </span>
                  </div>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* ===== RIGHT CONTENT AREA ===== */}
      <div className="flex-1 min-w-0">
        {/* Auto-Pilot */}
        {activeTab === "autopilot" && <AIAutoPilot />}

        {/* Customer Analyzer */}
        {activeTab === "analyzer" && <AICustomerAnalyzer />}

        {/* Smart Recommendations */}
        {activeTab === "smart" && <SmartAICopilot />}

        {/* Knowledge Base */}
        {activeTab === "knowledge" && <KnowledgeBase />}

        {/* AI Chat & Insights */}
        {activeTab === "chat" && (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Quick Actions Sidebar */}
            <div className="xl:col-span-1 space-y-4">
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t("ai", "quickActions")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {quickPrompts.map((item, index) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={index}
                        onClick={() => handleSend(item.prompt)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                        disabled={isLoading}
                      >
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-amber-500" />
                        </div>
                        <span className="text-sm">{item.label}</span>
                      </button>
                    )
                  })}
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t("ai", "businessInsights")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {insightPrompts.map((item, index) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={`insight-${index}`}
                        onClick={() => handleSend(item.prompt)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-colors text-left"
                        disabled={isLoading}
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-blue-500" />
                        </div>
                        <span className="text-sm">{item.label}</span>
                      </button>
                    )
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Chat Interface */}
            <Card className="xl:col-span-3 bg-card/50 backdrop-blur-sm border-border/50 flex flex-col h-[700px]">
              <CardHeader className="border-b border-border/50 pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-amber-500" />
                  {t("ai", "aiMarketingInsights")}
                </CardTitle>
              </CardHeader>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[90%] rounded-2xl p-4 ${
                          message.role === "user"
                            ? "bg-amber-500 text-black"
                            : "bg-muted/50"
                        }`}
                      >
                        {message.role === "assistant" && (
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                              <Bot className="w-3 h-3 text-amber-500" />
                            </div>
                            <span className="text-xs text-muted-foreground">{t("ai", "jpcoAiAssistant")}</span>
                          </div>
                        )}
                        <div className="whitespace-pre-wrap text-sm">
                          {message.content}
                        </div>

                        {/* Customer Action Cards */}
                        {message.customerActions && message.customerActions.length > 0 && (
                          renderCustomerActions(message.id, message.customerActions)
                        )}

                        <p className="text-xs opacity-50 mt-2">
                          {message.timestamp.toLocaleTimeString(
                            language === "zh" ? "zh-CN" : language === "ms" ? "ms-MY" : "en-US",
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted/50 rounded-2xl p-4">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                          <span className="text-sm text-muted-foreground">
                            {t("ai", "aiThinking")}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="p-4 border-t border-border/50">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSend()
                  }}
                  className="flex gap-3"
                >
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={t("ai", "chatPlaceholder")}
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button type="submit" disabled={!input.trim() || isLoading} style={{ background: "#006c49" }} className="hover:opacity-90 text-white">
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        {t("ai", "send")}
                      </>
                    )}
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground mt-2">
                  {t("ai", "chatHelperText")}
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Floating WhatsApp Connection Button */}
      <FloatingWhatsApp />
    </div>
  )
}
