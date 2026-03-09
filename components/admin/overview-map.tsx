"use client"

import { useEffect, useRef } from "react"
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
  onAnalyze?: (competitor: Competitor) => void
}

const categoryColors: Record<string, string> = {
  restaurant: "#dc2626",
  cafe: "#d97706",
  fast_food: "#ea580c",
}

function buildPopupHtml(c: Competitor, idx: number): string {
  const cat = c.category === "fast_food" ? "Fast Food" : c.category.charAt(0).toUpperCase() + c.category.slice(1)
  const color = categoryColors[c.category] || "#dc2626"
  let html = `<div style="min-width:240px;max-width:300px;font-family:system-ui,sans-serif;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
      <div style="background:${color};color:white;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:500;">${cat}</div>
      <span style="font-size:11px;color:#888;">${c.distance_km.toFixed(2)} km</span>
    </div>
    <div style="font-weight:700;font-size:16px;color:#1a1a1a;margin-bottom:4px;">${c.name}</div>`

  if (c.cuisine) html += `<div style="font-size:12px;color:#666;margin-bottom:4px;">${c.cuisine}</div>`
  if (c.address) html += `<div style="font-size:12px;color:#888;margin-bottom:4px;">${c.address}</div>`
  if (c.phone) html += `<div style="font-size:12px;color:#888;">${c.phone}</div>`
  if (c.opening_hours) html += `<div style="font-size:11px;color:#888;margin-top:2px;">${c.opening_hours}</div>`
  if (c.website) html += `<div style="margin-top:4px;"><a href="${c.website}" target="_blank" style="font-size:12px;color:#2563eb;text-decoration:none;">${c.website.replace(/^https?:\/\//, "").slice(0, 35)}</a></div>`

  html += `<div style="margin-top:10px;border-top:1px solid #eee;padding-top:10px;">
    <button id="analyze-btn-${idx}" style="width:100%;padding:8px 12px;background:#8b6f47;color:white;border:none;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;">AI Analyze Marketing</button>
    <div id="analyze-result-${idx}" style="margin-top:8px;display:none;"></div>
  </div></div>`
  return html
}

export default function OverviewMap({ shopLocation, competitors, onAnalyze }: OverviewMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

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

      const competitorIcon = L.divIcon({
        className: "competitor-marker",
        html: `<div style="background:#dc2626;width:22px;height:22px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -11],
      })

      competitors.forEach((c, idx) => {
        const marker = L.marker([c.lat, c.lng], { icon: competitorIcon })
          .addTo(map)
          .bindPopup(buildPopupHtml(c, idx), { maxWidth: 320, className: "competitor-popup" })

        marker.on("popupopen", () => {
          const btn = document.getElementById(`analyze-btn-${idx}`)
          const resultDiv = document.getElementById(`analyze-result-${idx}`)
          if (btn && resultDiv) {
            btn.onclick = async () => {
              btn.textContent = "Analyzing..."
              btn.setAttribute("disabled", "true")
              btn.style.opacity = "0.7"
              resultDiv.style.display = "block"
              resultDiv.innerHTML = '<div style="text-align:center;color:#888;font-size:12px;">Loading AI analysis...</div>'

              if (onAnalyze) {
                onAnalyze(c)
              }

              try {
                const res = await fetch("/api/admin/competitor-analyze", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: c.name,
                    address: c.address,
                    category: c.category,
                    website: c.website,
                  }),
                })
                const data = await res.json()
                if (data.analysis) {
                  const formatted = data.analysis
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n/g, '<br>')
                  resultDiv.innerHTML = `<div style="font-size:12px;line-height:1.5;color:#333;max-height:300px;overflow-y:auto;">${formatted}</div>`
                } else {
                  const errMsg = data.detail || data.error || "Unknown error"
                  resultDiv.innerHTML = `<div style="color:#dc2626;font-size:12px;">Error: ${errMsg}</div>`
                }
              } catch {
                resultDiv.innerHTML = '<div style="color:#dc2626;font-size:12px;">Network error. Try again.</div>'
              }
              btn.textContent = "Re-analyze"
              btn.removeAttribute("disabled")
              btn.style.opacity = "1"
            }
          }
        })
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
    }
  }, [shopLocation, competitors])

  return (
    <div className="h-[500px] w-full overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
      <div ref={mapRef} className="h-full w-full" />
    </div>
  )
}
