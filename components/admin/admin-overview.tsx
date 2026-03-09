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
  Send, LayoutDashboard, Settings
} from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/i18n"
import type { ShopLocation, Competitor } from "./overview-map"

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
    { href: "/admin/settings", icon: <Settings className="h-5 w-5" />, label: t("common", "settings"), desc: t("admin", "shopAndLocation"), color: "bg-rose-500/10 text-rose-600" },
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
  const sidebarItems = useSidebarItems()
  const [shopLocation, setShopLocation] = useState<ShopLocation>({
    lat: 3.1073, lng: 101.6268, name: "JP&Co", radius_km: 5,
  })
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [loading, setLoading] = useState(true)
  const [competitorLoading, setCompetitorLoading] = useState(false)
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [sidebarMode, setSidebarMode] = useState<"nav" | "chat">("nav")
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
        fetchCompetitors(3.1073, 101.6268, 5)
      }
    } catch {
      fetchCompetitors(3.1073, 101.6268, 5)
    } finally {
      setLoading(false)
    }
  }

  const fetchCompetitors = async (lat: number, lng: number, rKm: number) => {
    setCompetitorLoading(true)
    try {
      const r = await fetch(`/api/admin/competitors?lat=${lat}&lng=${lng}&radius=${rKm * 1000}`)
      if (r.ok) setCompetitors(await r.json())
    } catch { /* silent */ } finally {
      setCompetitorLoading(false)
    }
  }

  const handleSelectCompetitor = (c: Competitor | null) => {
    setSelectedCompetitor(c)
    setAiAnalysis(null)
    setAiLoading(false)
  }

  const handleAnalyze = async () => {
    if (!selectedCompetitor) return
    setAiLoading(true)
    setAiAnalysis(null)
    try {
      const res = await fetch("/api/admin/competitor-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedCompetitor.name,
          address: selectedCompetitor.address,
          category: selectedCompetitor.category,
          website: selectedCompetitor.website,
        }),
      })
      const data = await res.json()
      setAiAnalysis(data.analysis || `Error: ${data.detail || data.error || "Failed"}`)
    } catch {
      setAiAnalysis("Network error. Please try again.")
    } finally {
      setAiLoading(false)
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

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#8b6f47]" />
      </div>
    )
  }

  const stats = {
    restaurants: competitors.filter(c => c.category === "restaurant").length,
    cafes: competitors.filter(c => c.category === "cafe").length,
    fastFood: competitors.filter(c => c.category === "fast_food").length,
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 -mb-4 lg:-mb-4">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 h-11 border-b border-border/50 bg-background/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold text-foreground">{shopLocation.name}</h1>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500 inline-block" />{stats.restaurants}</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />{stats.cafes}</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500 inline-block" />{stats.fastFood}</span>
            <span className="text-border">|</span>
            <span>{competitors.length} {t("admin", "total")}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => fetchCompetitors(shopLocation.lat, shopLocation.lng, shopLocation.radius_km)}
            disabled={competitorLoading}
            className="h-7 px-2 text-xs"
          >
            <RefreshCw className={`h-3 w-3 ${competitorLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <Button
          size="sm"
          className={`h-8 shadow-md ${sidebarMode === "nav" ? "bg-[#8b6f47] hover:bg-[#7a5f3a] text-white" : "bg-foreground/10 hover:bg-foreground/15 text-foreground"}`}
          onClick={() => setSidebarMode(prev => prev === "nav" ? "chat" : "nav")}
        >
          {sidebarMode === "nav" ? (
            <><MessageSquare className="h-3.5 w-3.5 mr-1.5" />{t("admin", "aiChatBtn")}</>
          ) : (
            <><LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />{t("admin", "overview")}</>
          )}
        </Button>
      </div>

      {/* Main area: Map + right sidebar */}
      <div className="flex flex-1 min-h-0">
        {/* Detail panel (Google Maps-style) */}
        {selectedCompetitor && (
          <div className="w-[340px] shrink-0 border-r border-border/50 bg-background overflow-y-auto animate-slide-in-left">
            <CompetitorPanel
              competitor={selectedCompetitor}
              shopLocation={shopLocation}
              aiAnalysis={aiAnalysis}
              aiLoading={aiLoading}
              onClose={() => handleSelectCompetitor(null)}
              onAnalyze={handleAnalyze}
              t={t}
            />
          </div>
        )}

        {/* Map */}
        <div className="flex-1 min-w-0 relative">
          <OverviewMap
            shopLocation={shopLocation}
            competitors={competitors}
            selectedCompetitor={selectedCompetitor}
            onSelectCompetitor={handleSelectCompetitor}
          />
          {!selectedCompetitor && !competitorLoading && competitors.length > 0 && (
            <div className="absolute bottom-3 left-3 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-muted-foreground border border-border/50 shadow-sm">
              {t("admin", "clickRedDot")}
            </div>
          )}
        </div>

        {/* Right sidebar - toggleable nav / AI chat */}
        <div className={`hidden lg:flex shrink-0 flex-col border-l border-border/50 bg-background/50 backdrop-blur-sm transition-all duration-300 ${sidebarMode === "chat" ? "w-[380px]" : "w-[200px]"}`}>
          {sidebarMode === "nav" ? (
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
          ) : (
            <SidebarChat
              messages={chatMessages}
              input={chatInput}
              loading={chatLoading}
              scrollRef={chatScrollRef}
              onInputChange={setChatInput}
              onSend={handleChatSend}
              t={t}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function CompetitorPanel({
  competitor, shopLocation, aiAnalysis, aiLoading, onClose, onAnalyze, t,
}: {
  competitor: Competitor
  shopLocation: ShopLocation
  aiAnalysis: string | null
  aiLoading: boolean
  onClose: () => void
  onAnalyze: () => void
  t: (category: string, key: string) => string
}) {
  const cat = t("admin", categoryMap[competitor.category] || "catRestaurant")

  const openGoogleMaps = () => {
    window.open(`https://www.google.com/maps/search/${encodeURIComponent(competitor.name)}/@${competitor.lat},${competitor.lng},17z`, "_blank")
  }
  const openDirections = () => {
    window.open(`https://www.google.com/maps/dir/${shopLocation.lat},${shopLocation.lng}/${competitor.lat},${competitor.lng}`, "_blank")
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/30">
        <div className="p-4 pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-2">
              <h2 className="text-lg font-bold leading-tight">{competitor.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-[10px] h-5">{cat}</Badge>
                <span className="text-xs text-muted-foreground">{competitor.distance_km.toFixed(2)} km</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 -mr-1 -mt-1" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Quick actions */}
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

      {/* Content */}
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

        {/* AI section */}
        <div className="border-t border-border/30 p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Sparkles className="h-4 w-4 text-[#8b6f47]" />
            <span className="text-sm font-semibold">{t("admin", "aiAnalysis")}</span>
            <Badge variant="outline" className="text-[9px] h-4 ml-auto">302.AI</Badge>
          </div>

          {!aiAnalysis && !aiLoading && (
            <Button onClick={onAnalyze} className="w-full bg-[#8b6f47] hover:bg-[#7a5f3a] text-white" size="sm">
              <Sparkles className="h-4 w-4 mr-2" />
              {t("admin", "analyzeCompetitor")}
            </Button>
          )}

          {aiLoading && (
            <div className="flex flex-col items-center gap-2 py-8">
              <div className="relative">
                <Loader2 className="h-6 w-6 animate-spin text-[#8b6f47]" />
                <div className="absolute inset-0 h-6 w-6 rounded-full border-2 border-[#8b6f47]/20 animate-ping" />
              </div>
              <p className="text-xs text-muted-foreground">{t("admin", "aiIsAnalyzing")}</p>
            </div>
          )}

          {aiAnalysis && (
            <div className="space-y-3">
              <div
                className="text-[13px] leading-relaxed [&_strong]:text-foreground [&_strong]:font-semibold text-muted-foreground"
                dangerouslySetInnerHTML={{
                  __html: aiAnalysis
                    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                    .replace(/\n\n/g, '<div class="h-2"></div>')
                    .replace(/\n/g, "<br>"),
                }}
              />
              <Button onClick={onAnalyze} variant="outline" size="sm" className="w-full">
                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                {t("admin", "reAnalyze")}
              </Button>
            </div>
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

function SidebarChat({
  messages, input, loading, scrollRef, onInputChange, onSend, t,
}: {
  messages: ChatMessage[]
  input: string
  loading: boolean
  scrollRef: React.RefObject<HTMLDivElement | null>
  onInputChange: (v: string) => void
  onSend: (customInput?: string) => void
  t: (category: string, key: string) => string
}) {
  const chatQuickPrompts = [
    { label: t("admin", "birthdayCustomers"), prompt: "Find all customers with upcoming birthdays and create personalized messages" },
    { label: t("admin", "wakeUpDormant"), prompt: "Show dormant customers (30+ days inactive) and create comeback offers" },
    { label: t("admin", "vipExclusive"), prompt: "Create a special VIP exclusive offer for top spending customers" },
    { label: t("admin", "revenueReport"), prompt: "How much revenue today and this month? Compare with last month." },
    { label: t("admin", "customerHealth"), prompt: "Customer health report - active vs dormant, trends?" },
  ]
  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="px-4 py-3 border-b border-border/30 bg-background/80">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[#8b6f47] flex items-center justify-center">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">{t("admin", "jpcoAi")}</p>
            <p className="text-[10px] text-muted-foreground leading-none">{t("admin", "marketingAndInsights")}</p>
          </div>
          <Badge variant="outline" className="text-[9px] h-4 ml-auto">302.AI</Badge>
        </div>
      </div>

      {/* Quick prompts */}
      {messages.length <= 1 && (
        <div className="px-3 py-2 border-b border-border/20 flex flex-wrap gap-1.5">
          {chatQuickPrompts.map((p, i) => (
            <button
              key={i}
              onClick={() => onSend(p.prompt)}
              disabled={loading}
              className="text-[11px] px-2.5 py-1.5 rounded-full bg-[#8b6f47]/10 text-[#8b6f47] hover:bg-[#8b6f47]/20 transition-colors disabled:opacity-50"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 px-3 py-3" ref={scrollRef}>
        <div className="space-y-3">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                m.role === "user"
                  ? "bg-[#8b6f47] text-white"
                  : "bg-muted/60"
              }`}>
                {m.role === "assistant" && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <Bot className="h-3 w-3 text-[#8b6f47]" />
                    <span className="text-[10px] text-muted-foreground font-medium">AI</span>
                  </div>
                )}
                <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{m.content}</p>
                <p className="text-[9px] opacity-40 mt-1">
                  {m.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted/60 rounded-2xl px-3.5 py-2.5 flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#8b6f47]" />
                <span className="text-xs text-muted-foreground">{t("admin", "thinking")}</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-border/30 bg-background/80">
        <form
          onSubmit={(e) => { e.preventDefault(); onSend() }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={t("admin", "askAboutMarketing")}
            className="flex-1 h-9 text-sm"
            disabled={loading}
          />
          <Button type="submit" size="icon" disabled={!input.trim() || loading} className="h-9 w-9 bg-[#8b6f47] hover:bg-[#7a5f3a] shrink-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  )
}

