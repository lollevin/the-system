"use client"

import { useEffect, useState, useRef } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Loader2, MapPin, UtensilsCrossed, Users, Gift, Bot,
  RefreshCw, Store, X, Phone, Globe, Clock, ChefHat,
  ExternalLink, Sparkles, Navigation2, MessageSquare,
  Send, LayoutDashboard, Settings, Brain, LogOut
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useLanguage, translations } from "@/lib/i18n"
import { createClient } from "@/lib/supabase/client"
import { AdminNotifications } from "@/components/admin/admin-notifications"
import { toast } from "sonner"
import type { ShopLocation, Competitor } from "./overview-map"

type TFunc = (category: keyof typeof translations, key: string) => string

const OverviewMap = dynamic(() => import("./overview-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-card">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="text-sm">Loading map...</span>
      </div>
    </div>
  ),
})

function useSidebarItems() {
  const { t } = useLanguage()
  return [
    { href: "/admin/ai", icon: <Bot className="h-5 w-5" />, label: t("admin", "ai"), desc: t("admin", "smartCampaigns"), color: "bg-amber-500/10 text-amber-600" },
    { href: "/admin/menu", icon: <UtensilsCrossed className="h-5 w-5" />, label: t("admin", "menu"), desc: t("admin", "foodAndDrinks"), color: "bg-orange-500/10 text-orange-600" },
    { href: "/admin/rewards", icon: <Gift className="h-5 w-5" />, label: t("admin", "rewards"), desc: t("admin", "loyaltyRewards"), color: "bg-purple-500/10 text-purple-600" },
    { href: "/admin/referrals", icon: <Users className="h-5 w-5" />, label: t("admin", "shareAndEarn"), desc: t("admin", "referralProgram"), color: "bg-blue-500/10 text-blue-600" },
    { href: "/admin/customers", icon: <Store className="h-5 w-5" />, label: t("admin", "staffManagement"), desc: t("admin", "teamManagement"), color: "bg-green-500/10 text-green-600" },
    { href: "/admin/customer-list", icon: <Users className="h-5 w-5" />, label: t("admin", "customers"), desc: t("admin", "memberDatabase"), color: "bg-teal-500/10 text-teal-600" },
    { href: "/admin/knowledge-base", icon: <Brain className="h-5 w-5" />, label: t("admin", "knowledgeBase"), desc: t("admin", "kbNavDesc"), color: "bg-indigo-500/10 text-indigo-600" },
  ]
}

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

const categoryMap: Record<string, string> = {
  restaurant: "catRestaurant",
  cafe: "catCafe",
  fast_food: "catFastFood",
}

export function AdminOverview() {
  const { t, language } = useLanguage()
  const router = useRouter()
  const supabase = createClient()
  const sidebarItems = useSidebarItems()

  const [shopLocation, setShopLocation] = useState<ShopLocation>({
    lat: 3.05042, lng: 101.67101, name: "JP&Co", radius_km: 5,
  })
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [loading, setLoading] = useState(true)
  const [competitorLoading, setCompetitorLoading] = useState(false)
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null)
  const [threatLevels, setThreatLevels] = useState<Record<string, { level: string; reason: string; deepAnalysis?: string }>>({})
  const [threatLoading, setThreatLoading] = useState(false)
  const [deepAnalysis, setDeepAnalysis] = useState<string | null>(null)
  const [deepLoading, setDeepLoading] = useState(false)
  const deepAnalysisCache = useRef<Record<string, string>>({})

  const [viewMode, setViewMode] = useState<"overview" | "chat">("overview")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInited, setChatInited] = useState(false)
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const chatScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chatInited) {
      setChatMessages([{ id: "welcome", role: "assistant", content: t("admin", "sidebarChatWelcome"), timestamp: new Date() }])
      setChatInited(true)
    }
  }, [chatInited, t])

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
  }, [chatMessages])

  useEffect(() => { fetchShopSettings() }, [])

  const fetchShopSettings = async () => {
    try {
      const res = await fetch("/api/admin/shop-settings")
      if (res.ok) {
        const data = await res.json()
        const loc = { lat: data.lat, lng: data.lng, name: data.shop_name, radius_km: data.radius_km }
        setShopLocation(loc)
        fetchCompetitors(loc.lat, loc.lng, loc.radius_km)
      } else {
      fetchCompetitors(3.05042, 101.67101, 5)
    }
    } catch {
      fetchCompetitors(3.05042, 101.67101, 5)
    } finally {
      setLoading(false)
    }
  }

  const fetchCompetitors = async (lat: number, lng: number, rKm: number) => {
    setCompetitorLoading(true)
    try {
      const r = await fetch(`/api/admin/competitors?lat=${lat}&lng=${lng}&radius=${rKm * 1000}`)
      if (r.ok) {
        const data = await r.json()
        setCompetitors(data)
        analyzeThreatLevels(data)
      }
    } catch { /* silent */ } finally {
      setCompetitorLoading(false)
    }
  }

  const analyzeThreatLevels = async (comps: Competitor[]) => {
    if (comps.length === 0) return
    setThreatLoading(true)
    try {
      const res = await fetch("/api/admin/competitor-threats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitors: comps.map(c => ({
            name: c.name, lat: c.lat, lng: c.lng,
            distance_km: c.distance_km, category: c.category,
            cuisine: c.cuisine, brand: c.brand,
          })),
          shopName: shopLocation.name,
          shopCuisine: "burgers, cakes, artisan coffee",
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setThreatLevels(data.threats || {})
      }
    } catch { /* silent */ } finally {
      setThreatLoading(false)
    }
  }

  const handleSelectCompetitor = (c: Competitor | null) => {
    setSelectedCompetitor(c)
    setDeepAnalysis(null)
    setDeepLoading(false)
    if (c) autoDeepAnalyze(c)
  }

  const makeCompetitorKey = (c: Competitor) => `${c.name}_${c.lat.toFixed(5)}_${c.lng.toFixed(5)}`

  const autoDeepAnalyze = async (c: Competitor, force = false) => {
    const key = makeCompetitorKey(c)
    if (!force && deepAnalysisCache.current[key]) {
      setDeepAnalysis(deepAnalysisCache.current[key])
      return
    }
    setDeepLoading(true)
    setDeepAnalysis(null)
    try {
      const res = await fetch("/api/admin/competitor-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: c.name,
          address: c.address,
          category: c.category,
          website: c.website,
          language,
        }),
      })
      const data = await res.json()
      const analysis = data.analysis || `Error: ${data.detail || data.error || "Failed"}`
      deepAnalysisCache.current[key] = analysis
      setDeepAnalysis(analysis)
    } catch {
      setDeepAnalysis("Network error.")
    } finally {
      setDeepLoading(false)
    }
  }

  const handleChatSend = async (customInput?: string) => {
    const text = customInput || chatInput
    if (!text.trim() || chatLoading) return

    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: text, timestamp: new Date() }
    setChatMessages(prev => [...prev, userMsg])
    setChatInput("")
    setChatLoading(true)

    try {
      const history = chatMessages.slice(-8).map(m => `${m.role === "user" ? "Admin" : "AI"}: ${m.content}`).join("\n")
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: text, conversationHistory: history, language, requestId: Date.now() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")
      setChatMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: data.message, timestamp: new Date() }])
    } catch (err: any) {
      setChatMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: `Error: ${err.message}`, timestamp: new Date() }])
    } finally {
      setChatLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success(t("common", "success"))
    router.push("/")
  }

  const chatQuickPrompts = [
    { label: t("admin", "birthdayCustomers"), prompt: "Find all customers with upcoming birthdays and create personalized messages" },
    { label: t("admin", "wakeUpDormant"), prompt: "Show dormant customers (30+ days inactive) and create comeback offers" },
    { label: t("admin", "vipExclusive"), prompt: "Create a special VIP exclusive offer for top spending customers" },
    { label: t("admin", "revenueReport"), prompt: "How much revenue today and this month? Compare with last month." },
    { label: t("admin", "customerHealth"), prompt: "Customer health report - active vs dormant, trends?" },
  ]

  if (loading) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-[#8b6f47]" />
      </div>
    )
  }

  const enrichedCompetitors = competitors.map(c => {
    const key = `${c.name}_${c.lat.toFixed(5)}_${c.lng.toFixed(5)}`
    const threat = threatLevels[key]
    return {
      ...c,
      threat_level: (threat?.level as "red" | "green" | "gray") || "gray",
      threat_reason: threat?.reason || "",
      deep_analysis: threat?.deepAnalysis || "",
    }
  })

  const threatStats = {
    red: enrichedCompetitors.filter(c => c.threat_level === "red").length,
    green: enrichedCompetitors.filter(c => c.threat_level === "green").length,
    gray: enrichedCompetitors.filter(c => c.threat_level === "gray").length,
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-background">

      {/* ========== OVERVIEW VIEW ========== */}
      <div
        className={`absolute inset-0 flex flex-col view-transition ${
          viewMode === "chat" ? "view-overview-out" : "view-overview-in"
        }`}
      >
        {/* Top bar */}
        <div className="relative flex items-center justify-center h-14 shrink-0 z-10 border-b border-border/50 bg-background shadow-sm">
          {/* Center: JP&Co brand */}
          <Link href="/admin" className="flex items-center gap-3">
            <Image src="/Logo/w768.png" alt="JP&Co" width={34} height={34} className="rounded-xl shadow-md" />
            <span className="text-xl font-extrabold tracking-tight text-foreground">JP&Co</span>
          </Link>

          {/* Right: icons + AI Chat */}
          <div className="absolute right-3 flex items-center gap-1">
            <AdminNotifications />
            <Link href="/admin/settings">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              size="sm"
              className="h-8 shadow-md bg-[#8b6f47] hover:bg-[#7a5f3a] text-white gap-1.5 ml-1"
              onClick={() => setViewMode("chat")}
            >
              <MessageSquare className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t("admin", "aiChatBtn")}</span>
            </Button>
          </div>
        </div>

        {/* Main area: Map + right sidebar */}
        <div className="flex flex-1 min-h-0">
          {/* Detail panel (Google Maps-style) */}
          {selectedCompetitor && (
            <div className="w-[340px] shrink-0 border-r border-border/50 bg-background overflow-y-auto animate-slide-in-left">
              <CompetitorPanel
                competitor={enrichedCompetitors.find(c => c.name === selectedCompetitor.name && c.lat === selectedCompetitor.lat) || selectedCompetitor}
                shopLocation={shopLocation}
                onClose={() => handleSelectCompetitor(null)}
                onReAnalyze={() => selectedCompetitor && autoDeepAnalyze(selectedCompetitor, true)}
                deepAnalysis={deepAnalysis}
                deepLoading={deepLoading}
                t={t}
              />
            </div>
          )}

          {/* Map */}
          <div className="flex-1 min-w-0 relative">
            <OverviewMap
              shopLocation={shopLocation}
              competitors={enrichedCompetitors}
              selectedCompetitor={selectedCompetitor}
              onSelectCompetitor={handleSelectCompetitor}
            />
            {/* Floating threat stats pill — bottom-left */}
            {enrichedCompetitors.length > 0 && (
              <div className="absolute bottom-6 left-4 z-[1000] flex flex-col gap-2">
                <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md rounded-xl px-3.5 py-2 text-xs text-foreground border border-black/5 shadow-lg">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-600 inline-block shadow-sm" /><span className="font-medium">{threatStats.red}</span> {t("admin", "highThreat")}</span>
                  <span className="text-border/40">|</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-600 inline-block shadow-sm" /><span className="font-medium">{threatStats.green}</span> {t("admin", "popular")}</span>
                  <span className="text-border/40">|</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-gray-400 inline-block" /><span className="font-medium">{threatStats.gray}</span></span>
                  {threatLoading && <Loader2 className="h-3 w-3 animate-spin text-[#8b6f47] ml-1" />}
                  <button
                    onClick={() => fetchCompetitors(shopLocation.lat, shopLocation.lng, shopLocation.radius_km)}
                    disabled={competitorLoading}
                    className="ml-1 flex items-center justify-center h-6 w-6 rounded-lg bg-black/5 hover:bg-black/10 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RefreshCw className={`h-3 w-3 ${competitorLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>
                {!selectedCompetitor && !competitorLoading && (
                  <div className="bg-white/90 backdrop-blur-md rounded-lg px-3 py-1.5 text-[11px] text-muted-foreground border border-black/5 shadow-sm">
                    {t("admin", "clickRedDot")}
                  </div>
                )}
              </div>
            )}

            {/* Two-line grip handle */}
            <button
              onClick={() => setViewMode("chat")}
              className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 flex-col items-center gap-[3px] px-1.5 py-4 rounded-l-lg bg-background/70 backdrop-blur-sm border border-r-0 border-border/40 hover:bg-[#8b6f47]/10 transition-all group cursor-pointer"
              title={t("admin", "aiChatBtn")}
            >
              <div className="w-[3px] h-5 rounded-full bg-foreground/20 group-hover:bg-[#8b6f47]/60 transition-colors" />
              <div className="w-[3px] h-5 rounded-full bg-foreground/15 group-hover:bg-[#8b6f47]/40 transition-colors" />
            </button>
          </div>

          {/* Right sidebar — navigation + logout */}
          <div className="hidden lg:flex shrink-0 w-[200px] flex-col border-l border-border/50 bg-background">
            <div className="p-3 space-y-1 overflow-y-auto flex-1">
              {sidebarItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all group hover:bg-accent/60">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.color} transition-transform group-hover:scale-105`}>
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight text-foreground">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Logout at sidebar bottom */}
            <div className="p-3 border-t border-border/30">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 w-full transition-all group hover:bg-red-500/10"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-500 transition-transform group-hover:scale-105">
                  <LogOut className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight text-red-600">{t("common", "logout")}</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========== FULL-SCREEN AI CHAT — 专场 ========== */}
      <div
        className={`absolute inset-0 flex flex-col view-transition z-10 ${
          viewMode === "chat" ? "view-chat-in" : "view-chat-out"
        }`}
        style={{ background: "linear-gradient(180deg, var(--background) 0%, var(--background) 92%, rgba(139,111,71,0.04) 100%)" }}
      >
        {/* Two-line handle */}
        <div className="flex justify-center pt-2.5 pb-1 shrink-0">
          <button
            onClick={() => setViewMode("overview")}
            className="group flex flex-col items-center gap-[3px] px-8 py-1.5 rounded-xl transition-all hover:bg-foreground/5 active:scale-95"
            title={t("admin", "overview")}
          >
            <div className="w-10 h-[3px] rounded-full bg-foreground/20 group-hover:bg-[#8b6f47] transition-colors duration-300" />
            <div className="w-6 h-[3px] rounded-full bg-foreground/12 group-hover:bg-[#8b6f47]/60 transition-colors duration-300" />
          </button>
        </div>

        {/* Chat header */}
        <div className="shrink-0 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#8b6f47] to-[#6d563a] flex items-center justify-center shadow-lg shadow-[#8b6f47]/20">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-base font-bold leading-tight">{t("admin", "jpcoAi")}</p>
                <p className="text-xs text-muted-foreground">{t("admin", "marketingAndInsights")}</p>
              </div>
              <Badge variant="outline" className="text-[10px] h-5 ml-1">302.AI</Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode("overview")}
              className="h-8 text-xs gap-1.5"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              {t("admin", "overview")}
            </Button>
          </div>
        </div>

        <div className="border-t border-border/20 shrink-0" />

        {/* Chat body */}
        <div className="flex-1 min-h-0 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="max-w-3xl mx-auto h-full flex flex-col">
            {chatMessages.length <= 1 && (
              <div className="py-5 flex flex-wrap gap-2 justify-center shrink-0 stagger-children">
                {chatQuickPrompts.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handleChatSend(p.prompt)}
                    disabled={chatLoading}
                    className="text-xs px-4 py-2.5 rounded-full bg-[#8b6f47]/10 text-[#8b6f47] hover:bg-[#8b6f47]/20 border border-[#8b6f47]/10 transition-all hover:shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            <ScrollArea className="flex-1 py-4" ref={chatScrollRef}>
              <div className="space-y-4">
                {chatMessages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                      m.role === "user"
                        ? "bg-[#8b6f47] text-white shadow-md shadow-[#8b6f47]/15"
                        : "bg-muted/40 border border-border/30"
                    }`}>
                      {m.role === "assistant" && (
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Bot className="h-3.5 w-3.5 text-[#8b6f47]" />
                          <span className="text-[10px] text-muted-foreground font-medium">JP&Co AI</span>
                        </div>
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                      <p className={`text-[9px] mt-1.5 ${m.role === "user" ? "text-white/40" : "text-muted-foreground/40"}`}>
                        {m.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted/40 border border-border/30 rounded-2xl px-4 py-3 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-[#8b6f47]" />
                      <span className="text-sm text-muted-foreground">{t("admin", "thinking")}</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Input area */}
        <div className="shrink-0 border-t border-border/20 bg-background/80 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
            <form onSubmit={(e) => { e.preventDefault(); handleChatSend() }} className="flex gap-2.5">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={t("admin", "askAboutMarketing")}
                className="flex-1 h-11 text-sm rounded-xl border-border/40 focus-visible:ring-[#8b6f47]/30"
                disabled={chatLoading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!chatInput.trim() || chatLoading}
                className="h-11 w-11 rounded-xl bg-[#8b6f47] hover:bg-[#7a5f3a] shrink-0 shadow-md shadow-[#8b6f47]/20"
              >
                {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ====== Sub-components ====== */

function CompetitorPanel({
  competitor, shopLocation, onClose, onReAnalyze, deepAnalysis, deepLoading, t,
}: {
  competitor: Competitor
  shopLocation: ShopLocation
  onClose: () => void
  onReAnalyze: () => void
  deepAnalysis: string | null
  deepLoading: boolean
  t: TFunc
}) {
  const cat = t("admin", categoryMap[competitor.category] || "catRestaurant")
  const threatLevel = competitor.threat_level || "gray"
  const threatReason = competitor.threat_reason || ""
  const threatLabel = threatLevel === "red" ? t("admin", "threatHigh") : threatLevel === "green" ? t("admin", "threatPopular") : t("admin", "threatLow")
  const threatColor = threatLevel === "red" ? "bg-red-500 text-white" : threatLevel === "green" ? "bg-green-500 text-white" : "bg-gray-400 text-white"

  const openGoogleMaps = () => {
    window.open(`https://www.google.com/maps/search/${encodeURIComponent(competitor.name)}/@${competitor.lat},${competitor.lng},17z`, "_blank")
  }
  const openDirections = () => {
    window.open(`https://www.google.com/maps/dir/${shopLocation.lat},${shopLocation.lng}/${competitor.lat},${competitor.lng}`, "_blank")
  }

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/30">
        <div className="p-4 pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-2">
              <h2 className="text-lg font-bold leading-tight">{competitor.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge className={`text-[10px] h-5 ${threatColor}`}>{threatLabel}</Badge>
                <Badge variant="secondary" className="text-[10px] h-5">{cat}</Badge>
                <span className="text-xs text-muted-foreground">{competitor.distance_km.toFixed(2)} km</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 -mr-1 -mt-1" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-1 px-3 pb-3">
          <QuickAction icon={<Navigation2 className="h-3.5 w-3.5" />} label={t("admin", "directions")} onClick={openDirections} />
          <QuickAction icon={<ExternalLink className="h-3.5 w-3.5" />} label={t("admin", "maps")} onClick={openGoogleMaps} />
          {competitor.phone && (
            <QuickAction icon={<Phone className="h-3.5 w-3.5" />} label={t("admin", "call")} onClick={() => window.open(`tel:${competitor.phone}`)} />
          )}
          {competitor.website && (
            <QuickAction icon={<Globe className="h-3.5 w-3.5" />} label={t("admin", "web")} onClick={() => window.open(competitor.website, "_blank")} />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-1">
          {competitor.address && <InfoRow icon={<MapPin className="h-4 w-4" />} text={competitor.address} />}
          {competitor.opening_hours && <InfoRow icon={<Clock className="h-4 w-4" />} text={competitor.opening_hours} />}
          {competitor.website && (
            <InfoRow icon={<Globe className="h-4 w-4" />} text={competitor.website.replace(/^https?:\/\//, "").replace(/\/$/, "")} href={competitor.website} />
          )}
          {competitor.phone && <InfoRow icon={<Phone className="h-4 w-4" />} text={competitor.phone} href={`tel:${competitor.phone}`} />}
          {competitor.cuisine && <InfoRow icon={<ChefHat className="h-4 w-4" />} text={competitor.cuisine} />}
          {competitor.brand && <InfoRow icon={<Store className="h-4 w-4" />} text={competitor.brand} />}

          {!competitor.address && !competitor.phone && !competitor.opening_hours && (
            <p className="text-xs text-muted-foreground italic py-2">
              {t("admin", "limitedInfoOsm")}
            </p>
          )}
        </div>

        {threatReason && (
          <div className="border-t border-border/30 px-4 py-3">
            <p className="text-[13px] leading-relaxed text-muted-foreground italic">{threatReason}</p>
          </div>
        )}

        <div className="border-t border-border/30 p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Sparkles className="h-4 w-4 text-[#8b6f47]" />
            <span className="text-sm font-semibold">{t("admin", "aiAnalysis")}</span>
            <Badge variant="outline" className="text-[9px] h-4 ml-auto">302.AI</Badge>
          </div>

          {deepLoading && (
            <div className="flex flex-col items-center gap-2 py-8">
              <div className="relative">
                <Loader2 className="h-6 w-6 animate-spin text-[#8b6f47]" />
                <div className="absolute inset-0 h-6 w-6 rounded-full border-2 border-[#8b6f47]/20 animate-ping" />
              </div>
              <p className="text-xs text-muted-foreground">{t("admin", "aiIsAnalyzing")}</p>
            </div>
          )}

          {deepAnalysis && !deepLoading && (
            <div className="space-y-3">
              <div
                className="text-[13px] leading-relaxed [&_strong]:text-foreground [&_strong]:font-semibold text-muted-foreground"
                dangerouslySetInnerHTML={{
                  __html: deepAnalysis
                    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                    .replace(/\n\n/g, '<div class="h-2"></div>')
                    .replace(/\n/g, "<br>"),
                }}
              />
              <Button onClick={onReAnalyze} variant="outline" size="sm" className="w-full">
                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                {t("admin", "reAnalyze")}
              </Button>
            </div>
          )}

          {!deepAnalysis && !deepLoading && (
            <p className="text-xs text-muted-foreground italic">{t("admin", "aiIsAnalyzing")}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1.5 hover:bg-accent/50 transition-colors">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#8b6f47]/10 text-[#8b6f47]">{icon}</div>
      <span className="text-[9px] text-muted-foreground font-medium">{label}</span>
    </button>
  )
}

function InfoRow({ icon, text, href }: { icon: React.ReactNode; text: string; href?: string }) {
  const inner = (
    <div className="flex items-start gap-3 py-1.5 group">
      <div className="shrink-0 text-muted-foreground mt-0.5">{icon}</div>
      <span className={`text-sm leading-snug ${href ? "text-blue-600 group-hover:underline" : ""}`}>{text}</span>
    </div>
  )
  return href ? <a href={href} target="_blank" rel="noopener noreferrer" className="block">{inner}</a> : inner
}
