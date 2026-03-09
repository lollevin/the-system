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
    markersRef.current.forEach(({ marker, competitor: c }) => {
      const isSelected = competitor && c.name === competitor.name && c.lat === competitor.lat
      const el = marker.getElement?.()
      if (el) {
        const wrapper = el.querySelector(".c-marker-wrapper")
        if (wrapper) {
          if (isSelected) {
            wrapper.classList.add("c-marker-selected")
          } else {
            wrapper.classList.remove("c-marker-selected")
          }
        }
      }
    })
    if (competitor && mapInstanceRef.current) {
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

      const map = L.map(mapRef.current!, {
        center: [shopLocation.lat, shopLocation.lng],
        zoom: 15,
        scrollWheelZoom: true,
        zoomControl: false,
      })

      L.control.zoom({ position: "bottomright" }).addTo(map)

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(map)

      L.circle([shopLocation.lat, shopLocation.lng], {
        radius: shopLocation.radius_km * 1000,
        color: "#8b6f47",
        fillColor: "#8b6f47",
        fillOpacity: 0.06,
        weight: 2,
        dashArray: "8 6",
      }).addTo(map)

      const kmLabel = L.divIcon({
        className: "km-label",
        html: `<div style="background:rgba(139,111,71,0.9);color:white;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.2);">${shopLocation.radius_km} km</div>`,
        iconSize: [60, 20],
        iconAnchor: [30, 10],
      })
      const edgeLat = shopLocation.lat + (shopLocation.radius_km / 111.32) * 0.7
      const edgeLng = shopLocation.lng + (shopLocation.radius_km / (111.32 * Math.cos(shopLocation.lat * Math.PI / 180))) * 0.7
      L.marker([edgeLat, edgeLng], { icon: kmLabel, interactive: false }).addTo(map)

      const shopIcon = L.divIcon({
        className: "shop-marker-main",
        html: `<div class="shop-marker-wrapper">
          <div class="shop-pulse-ring"></div>
          <div class="shop-dot">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M3 21V9l9-6 9 6v12H3z"/></svg>
          </div>
          <div class="shop-label">${shopLocation.name}</div>
        </div>`,
        iconSize: [40, 56],
        iconAnchor: [20, 28],
      })

      L.marker([shopLocation.lat, shopLocation.lng], { icon: shopIcon, zIndexOffset: 1000 }).addTo(map)

      const newMarkers: any[] = []
      competitors.forEach((c) => {
        const color = categoryColors[c.category] || "#dc2626"
        const icon = L.divIcon({
          className: "competitor-marker-main",
          html: `<div class="c-marker-wrapper" data-name="${c.name}">
            <div class="c-dot" style="background:${color};"></div>
            <div class="c-label">${c.name}</div>
          </div>`,
          iconSize: [20, 32],
          iconAnchor: [10, 16],
        })

        const marker = L.marker([c.lat, c.lng], { icon }).addTo(map)
        marker.on("click", (e: any) => {
          L.DomEvent.stopPropagation(e)
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
    <div className="h-full w-full overflow-hidden">
      <div ref={mapRef} className="h-full w-full" />
    </div>
  )
}
