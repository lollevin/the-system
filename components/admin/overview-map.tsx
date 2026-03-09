"use client"

import { useEffect, useRef, useCallback } from "react"
import "leaflet/dist/leaflet.css"

export interface Competitor {
  name: string
  lat: number
  lng: number
  distance_km: number
  category: string
  address?: string
  website?: string
  phone?: string
  opening_hours?: string
  cuisine?: string
  brand?: string
}

export interface ShopLocation {
  lat: number
  lng: number
  name: string
  radius_km: number
}

interface OverviewMapProps {
  shopLocation: ShopLocation
  competitors: Competitor[]
  selectedCompetitor?: Competitor | null
  onSelectCompetitor?: (competitor: Competitor | null) => void
}

const categoryColors: Record<string, string> = {
  restaurant: "#dc2626",
  cafe: "#d97706",
  fast_food: "#ea580c",
}

export default function OverviewMap({ shopLocation, competitors, selectedCompetitor, onSelectCompetitor }: OverviewMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const onSelectRef = useRef(onSelectCompetitor)
  onSelectRef.current = onSelectCompetitor

  const highlightMarker = useCallback((competitor: Competitor | null) => {
    if (!mapInstanceRef.current) return
    markersRef.current.forEach(({ marker, competitor: c }) => {
      const isSelected = competitor && c.name === competitor.name && c.lat === competitor.lat
      const el = marker.getElement?.()
      if (el) {
        const dot = el.querySelector("div")
        if (dot) {
          dot.style.width = isSelected ? "28px" : "22px"
          dot.style.height = isSelected ? "28px" : "22px"
          dot.style.border = isSelected ? "3px solid #8b6f47" : "2px solid white"
          dot.style.boxShadow = isSelected ? "0 0 12px rgba(139,111,71,0.5)" : "0 2px 4px rgba(0,0,0,0.3)"
          dot.style.zIndex = isSelected ? "1000" : "1"
        }
      }
    })
    if (competitor) {
      mapInstanceRef.current.flyTo([competitor.lat, competitor.lng], 16, { duration: 0.5 })
    }
  }, [])

  useEffect(() => {
    highlightMarker(selectedCompetitor || null)
  }, [selectedCompetitor, highlightMarker])

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const initMap = async () => {
      const L = (await import("leaflet")).default

      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      })

      const map = L.map(mapRef.current!, {
        center: [shopLocation.lat, shopLocation.lng],
        zoom: 14,
        scrollWheelZoom: true,
      })

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(map)

      L.circle([shopLocation.lat, shopLocation.lng], {
        radius: shopLocation.radius_km * 1000,
        color: "#8b6f47",
        fillColor: "#8b6f47",
        fillOpacity: 0.08,
        weight: 2,
        dashArray: "6 4",
      }).addTo(map)

      const shopIcon = L.divIcon({
        className: "shop-marker",
        html: `<div style="background:#8b6f47;width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M3 21V9l9-6 9 6v12H3z"/></svg>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
      })

      L.marker([shopLocation.lat, shopLocation.lng], { icon: shopIcon })
        .addTo(map)
        .bindPopup(`<div style="font-weight:600;font-size:14px;">${shopLocation.name}</div><div style="color:#666;font-size:12px;">Your Shop</div>`)

      const newMarkers: any[] = []
      competitors.forEach((c) => {
        const color = categoryColors[c.category] || "#dc2626"
        const icon = L.divIcon({
          className: "competitor-marker",
          html: `<div style="background:${color};width:22px;height:22px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);cursor:pointer;transition:all 0.2s;"></div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        })

        const marker = L.marker([c.lat, c.lng], { icon })
          .addTo(map)

        marker.on("click", () => {
          onSelectRef.current?.(c)
        })

        newMarkers.push({ marker, competitor: c })
      })
      markersRef.current = newMarkers

      map.on("click", () => {
        onSelectRef.current?.(null)
      })

      mapInstanceRef.current = map
      setTimeout(() => map.invalidateSize(), 100)
    }

    initMap()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
      markersRef.current = []
    }
  }, [shopLocation, competitors])

  return (
    <div className="h-full w-full overflow-hidden bg-card">
      <div ref={mapRef} className="h-full w-full" />
    </div>
  )
}
