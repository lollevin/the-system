"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Loader2, MapPin, UtensilsCrossed, Users, Gift, Bot,
  RefreshCw, Store, X, Phone, Globe, Clock, ChefHat,
  ExternalLink, Sparkles, Navigation2, MessageSquare
} from "lucide-react"
import Link from "next/link"
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

const sidebarItems = [
  { href: "/admin/menu", icon: <UtensilsCrossed className="h-5 w-5" />, label: "Menu", color: "bg-orange-500/10 text-orange-600" },
  { href: "/admin/referrals", icon: <Users className="h-5 w-5" />, label: "Share & Earn", color: "bg-blue-500/10 text-blue-600" },
  { href: "/admin/customers", icon: <Store className="h-5 w-5" />, label: "Staff", color: "bg-green-500/10 text-green-600" },
  { href: "/admin/rewards", icon: <Gift className="h-5 w-5" />, label: "Rewards", color: "bg-purple-500/10 text-purple-600" },
  { href: "/admin/customer-list", icon: <Users className="h-5 w-5" />, label: "Customers", color: "bg-teal-500/10 text-teal-600" },
  { href: "/admin/settings", icon: <MapPin className="h-5 w-5" />, label: "Location", color: "bg-rose-500/10 text-rose-600" },
]

const categoryLabels: Record<string, string> = {
  restaurant: "Restaurant",
  cafe: "Cafe",
  fast_food: "Fast Food",
}

export function AdminOverview() {
  const [shopLocation, setShopLocation] = useState<ShopLocation>({
    lat: 3.1073, lng: 101.6268, name: "JP&Co", radius_km: 5,
  })
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [loading, setLoading] = useState(true)
  const [competitorLoading, setCompetitorLoading] = useState(false)
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

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

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
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
    <div className="flex flex-col h-[calc(100vh-80px)] -mx-4 sm:-mx-6 lg:-mx-8 -my-6">
      {/* Top bar - Shop name + stats + AI Chat */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-[#8b6f47] flex items-center justify-center shadow-md">
              <Store className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground">{shopLocation.name}</h1>
              <p className="text-[10px] text-muted-foreground leading-none">Competitor Intelligence</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <StatPill value={stats.restaurants} label="Restaurants" color="bg-red-500" />
            <StatPill value={stats.cafes} label="Cafes" color="bg-amber-500" />
            <StatPill value={stats.fastFood} label="Fast Food" color="bg-orange-500" />
            <Badge variant="outline" className="text-xs h-7 px-2">
              {competitors.length} total
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchCompetitors(shopLocation.lat, shopLocation.lng, shopLocation.radius_km)}
            disabled={competitorLoading}
            className="h-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${competitorLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Link href="/admin/ai">
            <Button size="sm" className="h-8 bg-[#8b6f47] hover:bg-[#7a5f3a] text-white shadow-md">
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              AI Chat
            </Button>
          </Link>
        </div>
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
              Click any red dot to view details
            </div>
          )}
        </div>

        {/* Right sidebar - functions */}
        <div className="hidden lg:flex w-[72px] shrink-0 flex-col items-center gap-1 py-3 border-l border-border/50 bg-background/80 backdrop-blur-sm">
          {sidebarItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <button className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-2.5 hover:bg-accent/50 transition-all group w-[64px]">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.color} transition-transform group-hover:scale-110`}>
                  {item.icon}
                </div>
                <span className="text-[9px] font-medium text-muted-foreground group-hover:text-foreground transition-colors leading-tight text-center">
                  {item.label}
                </span>
              </button>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function CompetitorPanel({
  competitor, shopLocation, aiAnalysis, aiLoading, onClose, onAnalyze,
}: {
  competitor: Competitor
  shopLocation: ShopLocation
  aiAnalysis: string | null
  aiLoading: boolean
  onClose: () => void
  onAnalyze: () => void
}) {
  const cat = categoryLabels[competitor.category] || "Restaurant"

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
          <QuickAction icon={<Navigation2 className="h-3.5 w-3.5" />} label="Directions" onClick={openDirections} />
          <QuickAction icon={<ExternalLink className="h-3.5 w-3.5" />} label="Maps" onClick={openGoogleMaps} />
          {competitor.phone && (
            <QuickAction icon={<Phone className="h-3.5 w-3.5" />} label="Call" onClick={() => window.open(`tel:${competitor.phone}`)} />
          )}
          {competitor.website && (
            <QuickAction icon={<Globe className="h-3.5 w-3.5" />} label="Web" onClick={() => window.open(competitor.website, "_blank")} />
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
              Limited info from OpenStreetMap. Click &quot;Maps&quot; for full details.
            </p>
          )}
        </div>

        {/* AI section */}
        <div className="border-t border-border/30 p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Sparkles className="h-4 w-4 text-[#8b6f47]" />
            <span className="text-sm font-semibold">AI Analysis</span>
            <Badge variant="outline" className="text-[9px] h-4 ml-auto">302.AI</Badge>
          </div>

          {!aiAnalysis && !aiLoading && (
            <Button onClick={onAnalyze} className="w-full bg-[#8b6f47] hover:bg-[#7a5f3a] text-white" size="sm">
              <Sparkles className="h-4 w-4 mr-2" />
              Analyze Competitor
            </Button>
          )}

          {aiLoading && (
            <div className="flex flex-col items-center gap-2 py-8">
              <div className="relative">
                <Loader2 className="h-6 w-6 animate-spin text-[#8b6f47]" />
                <div className="absolute inset-0 h-6 w-6 rounded-full border-2 border-[#8b6f47]/20 animate-ping" />
              </div>
              <p className="text-xs text-muted-foreground">AI is analyzing...</p>
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
                Re-analyze
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

function StatPill({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-secondary/50 px-2.5 h-7 text-xs">
      <div className={`h-2 w-2 rounded-full ${color}`} />
      <span className="font-semibold">{value}</span>
      <span className="text-muted-foreground hidden md:inline">{label}</span>
    </div>
  )
}
