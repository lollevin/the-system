"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Loader2, MapPin, UtensilsCrossed, Users, Gift, Bot,
  ChevronRight, RefreshCw, Store, Navigation
} from "lucide-react"
import Link from "next/link"
import type { ShopLocation, Competitor } from "./overview-map"

const OverviewMap = dynamic(() => import("./overview-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] w-full items-center justify-center rounded-xl border border-border/50 bg-card">
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

export function AdminOverview() {
  const [shopLocation, setShopLocation] = useState<ShopLocation>({
    lat: 3.1073, lng: 101.6268, name: "JP&Co", radius_km: 5,
  })
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [loading, setLoading] = useState(true)
  const [competitorLoading, setCompetitorLoading] = useState(false)

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
          <CardContent className="p-0">
            <OverviewMap shopLocation={shopLocation} competitors={competitors} />
          </CardContent>
          {!competitorLoading && competitors.length > 0 && (
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

function StatBox({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-lg bg-background/60 p-2.5 text-center">
      <p className="text-lg font-bold text-[#8b6f47]">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}
