"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Loader2, MapPin, Users, Bot,
  RefreshCw, Store, X, Phone, Globe, Clock, ChefHat,
  ExternalLink, Sparkles, Navigation2,
  Settings, LogOut, PanelRightOpen, PanelRightClose,
  AlertTriangle, Activity
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useLanguage, translations } from "@/lib/i18n"
import { createClient } from "@/lib/supabase/client"
import { RippleButton } from "@/components/ui/ripple-button"
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
    { href: "/admin/shop", icon: <Store className="h-5 w-5" />, label: t("admin", "shopManagement"), desc: t("admin", "menuAndStaff"), color: "bg-orange-500/10 text-orange-600" },
    { href: "/admin/customer-management", icon: <Users className="h-5 w-5" />, label: t("admin", "customerManagement"), desc: t("admin", "customerManagementDesc"), color: "bg-teal-500/10 text-teal-600" },
    { href: "/admin/audit-log", icon: <Activity className="h-5 w-5" />, label: t("admin", "alTitle"), desc: t("admin", "sfAuditLogDesc"), color: "bg-rose-500/10 text-rose-600" },
    { href: "/admin/settings", icon: <Settings className="h-5 w-5" />, label: t("admin", "settings"), desc: t("admin", "settingsDesc"), color: "bg-gray-500/10 text-gray-600" },
  ]
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
    lat: 3.0536, lng: 101.6714, name: "JP&Co", radius_km: 5,
  })
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [loading, setLoading] = useState(true)
  const [competitorLoading, setCompetitorLoading] = useState(false)
  const [competitorError, setCompetitorError] = useState<string | null>(null)
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null)
  const [threatLevels, setThreatLevels] = useState<Record<string, { level: string; reason: string; deepAnalysis?: string }>>({})
  const [threatLoading, setThreatLoading] = useState(false)
  const [deepAnalysis, setDeepAnalysis] = useState<string | null>(null)
  const [deepLoading, setDeepLoading] = useState(false)
  const deepAnalysisCache = useRef<Record<string, string>>({})

  const [fabOpen, setFabOpen] = useState(false)

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
      fetchCompetitors(3.0536, 101.6714, 5)
      }
    } catch {
      fetchCompetitors(3.0536, 101.6714, 5)
    } finally {
      setLoading(false)
    }
  }

  const fetchCompetitors = async (lat: number, lng: number, rKm: number) => {
    setCompetitorLoading(true)
    setCompetitorError(null)
    try {
      const r = await fetch(`/api/admin/competitors?lat=${lat}&lng=${lng}&radius=${rKm * 1000}`, {
        cache: "no-store",
      })
      const data = await r.json().catch(() => ({}))
      if (r.ok && Array.isArray(data)) {
        setCompetitors(data)
        if (data.length === 0) {
          setCompetitorError("No F&B places found within this radius")
        } else {
          analyzeThreatLevels(data)
        }
      } else {
        const msg = data?.hint || data?.error || "Failed to load F&B competitors"
        setCompetitorError(msg)
        console.error("[Overview] Competitors fetch failed:", msg)
      }
    } catch (err: any) {
      setCompetitorError("Network error loading F&B data")
      console.error("[Overview] Competitors network error:", err)
    } finally {
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success(t("common", "success"))
    router.push("/")
  }

  const enrichedCompetitors = useMemo(() => competitors.map(c => {
    const key = `${c.name}_${c.lat.toFixed(5)}_${c.lng.toFixed(5)}`
    const threat = threatLevels[key]
    return {
      ...c,
      threat_level: (threat?.level as "red" | "orange" | "green") || "orange",
      threat_reason: threat?.reason || "",
      deep_analysis: threat?.deepAnalysis || "",
    }
  }), [competitors, threatLevels])

  const threatStats = {
    red: enrichedCompetitors.filter(c => c.threat_level === "red").length,
    orange: enrichedCompetitors.filter(c => c.threat_level === "orange").length,
    green: enrichedCompetitors.filter(c => c.threat_level === "green").length,
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-[#8b6f47]" />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-background">
        {/* Top bar */}
        <div className="relative flex items-center justify-center h-14 shrink-0 z-10 border-b border-border/50 bg-background shadow-sm">
          {/* Center: Shop name + Overviews with animation */}
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-foreground animate-pulse-slow">{shopLocation.name}</span>
            <span className="text-xl font-medium text-muted-foreground">Overviews</span>
          </div>
        </div>

        {/* Main area: Full-width map with floating overlays */}
        <div className="flex-1 min-h-0 relative isolate">
          {/* Full-width map */}
          <OverviewMap
            shopLocation={shopLocation}
            competitors={enrichedCompetitors}
            selectedCompetitor={selectedCompetitor}
            onSelectCompetitor={handleSelectCompetitor}
          />

          {/* Competitor detail panel — floating overlay, left side */}
          <div
            className={`absolute left-0 top-0 bottom-0 z-[1100] w-[calc(100vw-48px)] sm:w-[340px] max-w-[340px] bg-white/95 dark:bg-background/95 backdrop-blur-xl shadow-[4px_0_24px_rgba(0,0,0,0.08)] border-r border-white/40 overflow-y-auto transition-transform duration-350 ease-[cubic-bezier(0.32,0.72,0,1)] ${
              selectedCompetitor ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            {selectedCompetitor && (
              <CompetitorPanel
                competitor={enrichedCompetitors.find(c => c.name === selectedCompetitor.name && c.lat === selectedCompetitor.lat) || selectedCompetitor}
                shopLocation={shopLocation}
                onClose={() => handleSelectCompetitor(null)}
                onReAnalyze={() => selectedCompetitor && autoDeepAnalyze(selectedCompetitor, true)}
                deepAnalysis={deepAnalysis}
                deepLoading={deepLoading}
                t={t}
              />
            )}
          </div>

          {/* Loading indicator - top center */}
          {competitorLoading && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur-md rounded-full px-4 py-2 shadow-lg border border-black/5 flex items-center gap-2 text-xs">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#8b6f47]" />
              <span className="text-muted-foreground">Loading F&B places nearby...</span>
            </div>
          )}

          {/* Error state - top center */}
          {!competitorLoading && competitorError && enrichedCompetitors.length === 0 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur-md rounded-xl px-4 py-2.5 shadow-lg border border-orange-500/20 flex items-center gap-2 text-xs max-w-sm">
              <AlertTriangle className="h-3.5 w-3.5 text-orange-500 shrink-0" />
              <span className="text-foreground">{competitorError}</span>
              <button
                onClick={() => fetchCompetitors(shopLocation.lat, shopLocation.lng, shopLocation.radius_km)}
                className="ml-1 flex items-center gap-1 text-[#8b6f47] hover:text-[#8b6f47]/80 font-medium"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </button>
            </div>
          )}

          {/* Floating threat stats pill — bottom-left */}
          {enrichedCompetitors.length > 0 && (
            <div className={`absolute bottom-6 z-[1000] flex flex-col gap-2 transition-all duration-300 ${selectedCompetitor ? "left-4 sm:left-[356px]" : "left-4"}`}>
              <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md rounded-xl px-3.5 py-2 text-xs text-foreground border border-black/5 shadow-lg">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-600 inline-block shadow-sm" /><span className="font-medium">{threatStats.red}</span> {t("admin", "highThreat")}</span>
                <span className="text-border/40">|</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-orange-500 inline-block shadow-sm" /><span className="font-medium">{threatStats.orange}</span> {t("admin", "mediumThreat")}</span>
                <span className="text-border/40">|</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-600 inline-block shadow-sm" /><span className="font-medium">{threatStats.green}</span> {t("admin", "popular")}</span>
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

          {/* Navigation sidebar toggle button */}
          <RippleButton
            onClick={() => setFabOpen(v => !v)}
            rippleColor="#8b6f47"
            className={`absolute top-1/2 -translate-y-1/2 z-[1100] h-11 w-11 rounded-full border border-white/50 bg-white/90 dark:bg-background/90 backdrop-blur-md shadow-lg shadow-black/10 hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 ${
              fabOpen ? "right-[calc(100vw-48px)] sm:right-[212px]" : "right-3"
            }`}
          >
            {fabOpen
              ? <PanelRightClose className="h-5 w-5 text-[#8b6f47]" />
              : <PanelRightOpen className="h-5 w-5 text-[#8b6f47]" />
            }
          </RippleButton>

          {/* Backdrop for mobile sidebar */}
          {fabOpen && (
            <div className="sm:hidden absolute inset-0 z-[1050] bg-black/20 backdrop-blur-[2px]" onClick={() => setFabOpen(false)} />
          )}

          {/* Right navigation sidebar — sliding overlay */}
          <div
            className={`absolute right-0 top-0 bottom-0 z-[1100] w-[calc(100vw-48px)] sm:w-[200px] max-w-[240px] bg-white/95 dark:bg-background/95 backdrop-blur-xl shadow-[-4px_0_24px_rgba(0,0,0,0.08)] border-l border-white/40 flex flex-col transition-transform duration-350 ease-[cubic-bezier(0.32,0.72,0,1)] ${
              fabOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
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
  const threatLevel = competitor.threat_level || "orange"
  const threatReason = competitor.threat_reason || ""
  const threatLabel = threatLevel === "red" ? t("admin", "threatHigh") : threatLevel === "orange" ? t("admin", "threatMedium") : threatLevel === "green" ? t("admin", "threatPopular") : t("admin", "threatLow")
  const threatColor = threatLevel === "red" ? "bg-red-500 text-white" : threatLevel === "orange" ? "bg-orange-500 text-white" : threatLevel === "green" ? "bg-green-500 text-white" : "bg-gray-400 text-white"

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
            <Badge variant="outline" className="text-[9px] h-4 ml-auto">{t("ai", "ai_powered_by")}</Badge>
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
