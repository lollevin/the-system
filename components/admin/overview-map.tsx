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
  threat_level?: "red" | "orange" | "green"
  threat_reason?: string
  deep_analysis?: string
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

const threatColors: Record<string, string> = {
  red: "#dc2626",
  orange: "#ea580c",
  green: "#16a34a",
}

export default function OverviewMap({ shopLocation, competitors, selectedCompetitor, onSelectCompetitor }: OverviewMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const mapInitializingRef = useRef(false)
  const markersRef = useRef<any[]>([])
  const onSelectRef = useRef(onSelectCompetitor)
  const leafletRef = useRef<any>(null)
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
    if (!mapRef.current || mapInstanceRef.current || mapInitializingRef.current) return

    let cancelled = false

    const initMap = async () => {
      mapInitializingRef.current = true
      const L = (await import("leaflet")).default
      if (cancelled || !mapRef.current) {
        mapInitializingRef.current = false
        return
      }
      leafletRef.current = L

      delete (L.Icon.Default.prototype as any)._getIconUrl

      // In dev strict mode, async init/cleanup can race and leave stale leaflet id on container.
      const container = mapRef.current as any
      if (container?._leaflet_id) {
        delete container._leaflet_id
      }

      const map = L.map(mapRef.current!, {
        center: [shopLocation.lat, shopLocation.lng],
        zoom: 16,
        scrollWheelZoom: true,
        zoomControl: false,
      })

      L.control.zoom({ position: "bottomright" }).addTo(map)

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
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

      map.on("click", () => {
        onSelectRef.current?.(null)
      })

      if (cancelled) {
        map.remove()
        mapInitializingRef.current = false
        return
      }

      mapInstanceRef.current = map
      mapInitializingRef.current = false
      setTimeout(() => map.invalidateSize(), 100)
    }

    initMap()

    return () => {
      cancelled = true
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
      mapInitializingRef.current = false
      if ((mapRef.current as any)?._leaflet_id) {
        delete (mapRef.current as any)._leaflet_id
      }
      leafletRef.current = null
      markersRef.current = []
    }
  // Only re-init map when shopLocation changes, NOT competitors
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopLocation])

  useEffect(() => {
    const map = mapInstanceRef.current
    const L = leafletRef.current
    if (!map || !L) return

    markersRef.current.forEach(({ marker }) => map.removeLayer(marker))
    markersRef.current = []

    const newMarkers: any[] = []
    competitors.forEach((c) => {
      const color = threatColors[c.threat_level || "orange"] || "#ea580c"
      const hasPulse = c.threat_level === "red" || c.threat_level === "orange"
      const icon = L.divIcon({
        className: "competitor-marker-main",
        html: `<div class="c-marker-wrapper" data-name="${c.name}">
            <div class="c-dot-container">
              ${hasPulse ? '<div class="c-pulse-ring" style="border-color:' + color + ';"></div>' : ""}
              <div class="c-dot" style="background:${color};${hasPulse ? "box-shadow:0 0 8px " + color + "80;" : ""}"></div>
            </div>
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
  }, [competitors])

  return (
    <div className="h-full w-full overflow-hidden relative z-0">
      <div ref={mapRef} className="h-full w-full" />
    </div>
  )
}
