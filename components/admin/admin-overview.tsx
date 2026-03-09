"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Loader2, MapPin, UtensilsCrossed, Users, Gift, Bot,
  ChevronRight, RefreshCw, Store, Navigation, X, Phone,
  Globe, Clock, ChefHat, ExternalLink, Sparkles, Navigation2
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

const quickNavItems = [
  {
    href: "/admin/menu",
    icon: <UtensilsCrossed className="h-5 w-5" />,
    label: "Menu",
    description: "Manage food and drinks",
    color: "bg-orange-500/10 text-orange-600",
  },
  {
    href: "/admin/referrals",
    icon: <Users className="h-5 w-5" />,
    label: "Share and Earn",
    description: "Referral program",
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    href: "/admin/customers",
    icon: <Store className="h-5 w-5" />,
    label: "Staff Management",
    description: "Team and customers",
    color: "bg-green-500/10 text-green-600",
  },
  {
    href: "/admin/rewards",
    icon: <Gift className="h-5 w-5" />,
    label: "Rewards",
    description: "Loyalty rewards",
    color: "bg-purple-500/10 text-purple-600",
  },
  {
    href: "/admin/ai",
    icon: <Bot className="h-5 w-5" />,
    label: "AI Marketing",
    description: "Smart campaigns",
    color: "bg-amber-500/10 text-amber-600",
  },
]

const categoryLabels: Record<string, string> = {
  restaurant: "Restaurant",
  cafe: "Cafe",
  fast_food: "Fast Food",
}

const categoryIcons: Record<string, string> = {
  restaurant: "🍽️",
  cafe: "☕",
  fast_food: "🍔",
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
    } catch {
      // silent
    } finally {
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
      if (data.analysis) {
        setAiAnalysis(data.analysis)
      } else {
        setAiAnalysis(`Error: ${data.detail || data.error || "Analysis failed"}`)
      }
    } catch {
      setAiAnalysis("Network error. Please try again.")
    } finally {
      setAiLoading(false)
    }
  }

  const openGoogleMaps = (c: Competitor) => {
    window.open(`https://www.google.com/maps/search/${encodeURIComponent(c.name)}/@${c.lat},${c.lng},17z`, "_blank")
  }

  const openDirections = (c: Competitor) => {
    window.open(
      `https://www.google.com/maps/dir/${shopLocation.lat},${shopLocation.lng}/${c.lat},${c.lng}`,
      "_blank"
    )
  }

  if (loading) {
    return (
      <div className="flex h-[600px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#8b6f47]" />
      </div>
    )
  }

  const stats = {
    restaurants: competitors.filter(c => c.category === "restaurant").length,
    cafes: competitors.filter(c => c.category === "cafe").length,
    fastFood: competitors.filter(c => c.category === "fast_food").length,
    maxDist: competitors.length > 0 ? competitors[competitors.length - 1].distance_km.toFixed(1) : "0",
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <Card className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm p-0">
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5 text-[#8b6f47]" />
                Competitor Map
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{competitors.length} found</Badge>
                <Badge variant="secondary" className="text-xs">
                  <Navigation className="h-3 w-3 mr-1" />
                  {shopLocation.radius_km} km
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fetchCompetitors(shopLocation.lat, shopLocation.lng, shopLocation.radius_km)}
                  disabled={competitorLoading}
                  className="h-8"
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1 ${competitorLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 relative">
            <div className="flex h-[520px]">
              {/* Google Maps-style detail panel */}
              {selectedCompetitor && (
                <div className="w-[360px] shrink-0 border-r border-border/50 bg-background overflow-y-auto">
                  <CompetitorDetailPanel
                    competitor={selectedCompetitor}
                    shopLocation={shopLocation}
                    aiAnalysis={aiAnalysis}
                    aiLoading={aiLoading}
                    onClose={() => handleSelectCompetitor(null)}
                    onAnalyze={handleAnalyze}
                    onOpenMaps={() => openGoogleMaps(selectedCompetitor)}
                    onOpenDirections={() => openDirections(selectedCompetitor)}
                  />
                </div>
              )}
              {/* Map */}
              <div className="flex-1 min-w-0">
                <OverviewMap
                  shopLocation={shopLocation}
                  competitors={competitors}
                  selectedCompetitor={selectedCompetitor}
                  onSelectCompetitor={handleSelectCompetitor}
                />
              </div>
            </div>
          </CardContent>
          {!selectedCompetitor && !competitorLoading && competitors.length > 0 && (
            <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border/30">
              Click any red dot to view details and AI marketing analysis
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="border-border/50 bg-gradient-to-br from-[#8b6f47]/10 to-[#8b6f47]/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8b6f47] text-white">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">{shopLocation.name}</h3>
                <p className="text-xs text-muted-foreground">{competitors.length} competitors nearby</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <StatBox value={stats.restaurants} label="Restaurants" />
              <StatBox value={stats.cafes} label="Cafes" />
              <StatBox value={stats.fastFood} label="Fast Food" />
              <StatBox value={stats.maxDist} label="Max km" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quick Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {quickNavItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <div className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-accent/50 transition-colors group">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.color}`}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Link href="/admin/settings">
          <Card className="border-border/50 hover:bg-accent/30 transition-colors cursor-pointer mt-4">
            <CardContent className="p-4 flex items-center gap-3">
              <MapPin className="h-5 w-5 text-[#8b6f47]" />
              <div className="flex-1">
                <p className="text-sm font-medium">Shop Location</p>
                <p className="text-xs text-muted-foreground">Configure address and search radius</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}

function CompetitorDetailPanel({
  competitor,
  shopLocation,
  aiAnalysis,
  aiLoading,
  onClose,
  onAnalyze,
  onOpenMaps,
  onOpenDirections,
}: {
  competitor: Competitor
  shopLocation: ShopLocation
  aiAnalysis: string | null
  aiLoading: boolean
  onClose: () => void
  onAnalyze: () => void
  onOpenMaps: () => void
  onOpenDirections: () => void
}) {
  const cat = categoryLabels[competitor.category] || "Restaurant"
  const catIcon = categoryIcons[competitor.category] || "🍽️"

  return (
    <div className="flex flex-col h-full">
      {/* Header with close */}
      <div className="sticky top-0 z-10 bg-background border-b border-border/50">
        <div className="flex items-start justify-between p-4 pb-3">
          <div className="flex-1 min-w-0 pr-2">
            <h2 className="text-lg font-bold leading-tight">{competitor.name}</h2>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge variant="secondary" className="text-xs font-normal">
                {catIcon} {cat}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {competitor.distance_km.toFixed(2)} km away
              </span>
            </div>
            {competitor.cuisine && (
              <p className="text-xs text-muted-foreground mt-1">{competitor.cuisine}</p>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Action buttons row - Google Maps style */}
        <div className="flex items-center gap-1 px-4 pb-3">
          <ActionButton icon={<Navigation2 className="h-4 w-4" />} label="Directions" onClick={onOpenDirections} />
          <ActionButton icon={<ExternalLink className="h-4 w-4" />} label="Google Maps" onClick={onOpenMaps} />
          {competitor.phone && (
            <ActionButton
              icon={<Phone className="h-4 w-4" />}
              label="Call"
              onClick={() => window.open(`tel:${competitor.phone}`)}
            />
          )}
          {competitor.website && (
            <ActionButton
              icon={<Globe className="h-4 w-4" />}
              label="Website"
              onClick={() => window.open(competitor.website, "_blank")}
            />
          )}
        </div>
      </div>

      {/* Details section */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3">
          {/* Info rows - Google Maps style */}
          {competitor.address && (
            <InfoRow icon={<MapPin className="h-4 w-4" />} text={competitor.address} />
          )}
          {competitor.opening_hours && (
            <InfoRow icon={<Clock className="h-4 w-4" />} text={competitor.opening_hours} />
          )}
          {competitor.website && (
            <InfoRow
              icon={<Globe className="h-4 w-4" />}
              text={competitor.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              href={competitor.website}
            />
          )}
          {competitor.phone && (
            <InfoRow icon={<Phone className="h-4 w-4" />} text={competitor.phone} href={`tel:${competitor.phone}`} />
          )}
          {competitor.brand && (
            <InfoRow icon={<Store className="h-4 w-4" />} text={`Brand: ${competitor.brand}`} />
          )}
          {competitor.cuisine && (
            <InfoRow icon={<ChefHat className="h-4 w-4" />} text={competitor.cuisine} />
          )}

          {!competitor.address && !competitor.phone && !competitor.opening_hours && !competitor.website && (
            <p className="text-xs text-muted-foreground italic py-2">
              Limited info available from OpenStreetMap. Click "Google Maps" above for full details.
            </p>
          )}
        </div>

        {/* AI Analysis section */}
        <div className="border-t border-border/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-[#8b6f47]" />
              AI Marketing Analysis
            </h3>
            <Badge variant="outline" className="text-[10px]">302.AI</Badge>
          </div>

          {!aiAnalysis && !aiLoading && (
            <Button
              onClick={onAnalyze}
              className="w-full bg-[#8b6f47] hover:bg-[#7a6140] text-white"
              size="sm"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Analyze This Competitor
            </Button>
          )}

          {aiLoading && (
            <div className="flex flex-col items-center gap-2 py-6">
              <Loader2 className="h-6 w-6 animate-spin text-[#8b6f47]" />
              <p className="text-xs text-muted-foreground">Analyzing with AI...</p>
            </div>
          )}

          {aiAnalysis && (
            <div className="space-y-3">
              <div
                className="text-sm leading-relaxed prose prose-sm max-w-none prose-headings:text-sm prose-headings:font-semibold prose-p:text-muted-foreground prose-strong:text-foreground"
                dangerouslySetInnerHTML={{
                  __html: aiAnalysis
                    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                    .replace(/\n\n/g, "</p><p>")
                    .replace(/\n/g, "<br>")
                    .replace(/^/, "<p>")
                    .replace(/$/, "</p>"),
                }}
              />
              <Button
                onClick={onAnalyze}
                variant="outline"
                size="sm"
                className="w-full mt-2"
              >
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

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 hover:bg-accent/50 transition-colors min-w-[60px]"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#8b6f47]/10 text-[#8b6f47]">
        {icon}
      </div>
      <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
    </button>
  )
}

function InfoRow({ icon, text, href }: { icon: React.ReactNode; text: string; href?: string }) {
  const content = (
    <div className="flex items-start gap-3 py-2">
      <div className="shrink-0 text-muted-foreground mt-0.5">{icon}</div>
      <span className={`text-sm leading-snug ${href ? "text-blue-600 hover:underline" : "text-foreground"}`}>
        {text}
      </span>
    </div>
  )

  if (href) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className="block">{content}</a>
  }
  return content
}

function StatBox({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-lg bg-background/60 p-2.5 text-center">
      <p className="text-lg font-bold text-[#8b6f47]">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}
