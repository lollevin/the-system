import { createClient } from "@/lib/supabase/server"
import { rateLimitResponse } from "@/lib/rate-limit"
import { NextResponse } from "next/server"

export const maxDuration = 60
export const dynamic = "force-dynamic"

function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function GET(request: Request) {
  const limited = rateLimitResponse(request, "api")
  if (limited) return limited

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get("lat") || "0")
  const lng = parseFloat(searchParams.get("lng") || "0")
  const radius = Math.min(Math.max(parseFloat(searchParams.get("radius") || "5000"), 100), 50000)

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 })
  }

  // Also search for more amenities to catch all F&B places
  const query = `[out:json][timeout:25];(node["amenity"~"restaurant|cafe|fast_food|food_court|bar|pub|ice_cream|bakery"](around:${radius},${lat},${lng});node["shop"~"bakery|confectionery|coffee"](around:${radius},${lat},${lng}););out body;`

  try {
    const overpassEndpoints = [
      "https://overpass-api.de/api/interpreter",
      "https://overpass.openstreetmap.ru/api/interpreter",
      "https://overpass.kumi.systems/api/interpreter",
    ]

    let data: any = null
    let lastErrorStatus: number | null = null
    let lastErrorMessage: string = ""

    for (const endpoint of overpassEndpoints) {
      try {
        const controller = new AbortController()
        // Fail fast on secondary mirrors so we move on quickly
        const timeoutMs = endpoint.includes("overpass-api.de") ? 25000 : 8000
        const timeout = setTimeout(() => controller.abort(), timeoutMs)

        // Overpass-api.de blocks generic bot UAs with 406 — masquerade as curl (recommended by their guidelines)
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "*/*",
            "User-Agent": "curl/8.4.0",
          },
          body: `data=${encodeURIComponent(query)}`,
          signal: controller.signal,
          cache: "no-store",
        })

        clearTimeout(timeout)

        if (!res.ok) {
          lastErrorStatus = res.status
          lastErrorMessage = `${endpoint}: status ${res.status}`
          console.warn(`[Competitors] ${endpoint} returned ${res.status}`)
          continue
        }

        data = await res.json()
        break
      } catch (err: any) {
        lastErrorMessage = `${endpoint}: ${err?.name === "AbortError" ? "timeout" : err?.message || "network error"}`
        console.warn(`[Competitors] ${lastErrorMessage}`)
        continue
      }
    }

    if (!data) {
      console.error(`[Competitors] All Overpass endpoints failed. Last: ${lastErrorMessage}`)
      return NextResponse.json(
        {
          error: "Overpass API unavailable",
          detail: lastErrorStatus ? `last_status_${lastErrorStatus}` : "timeout_or_network",
          hint: "The OpenStreetMap Overpass service is temporarily slow or unreachable. Try again in a moment.",
        },
        { status: 502 }
      )
    }

    const elements = data.elements || []

    const competitors = elements
      .map((el: any) => {
        const amenity = el.tags?.amenity
        const shop = el.tags?.shop
        let category: string = "restaurant"
        if (amenity) category = amenity
        else if (shop === "bakery") category = "bakery" 
        else if (shop === "coffee") category = "cafe"
        else if (shop === "confectionery") category = "bakery"

        return {
          name: el.tags?.name || "",
          lat: el.lat,
          lng: el.lon,
          distance_km: haversineDistance(lat, lng, el.lat, el.lon),
          category,
          address: el.tags?.["addr:street"]
            ? `${el.tags["addr:street"]} ${el.tags["addr:housenumber"] || ""}`.trim()
            : el.tags?.["addr:full"] || "",
          website: el.tags?.website || el.tags?.["contact:website"] || "",
          phone: el.tags?.phone || el.tags?.["contact:phone"] || "",
          opening_hours: el.tags?.opening_hours || "",
          cuisine: el.tags?.cuisine || "",
          brand: el.tags?.brand || "",
        }
      })
      .filter((c: any) => c.name && c.name.trim().length > 0)
      .sort((a: any, b: any) => a.distance_km - b.distance_km)
      .slice(0, 80)

    console.log(`[Competitors] Found ${competitors.length} places within ${radius}m of ${lat},${lng}`)
    return NextResponse.json(competitors)
  } catch (err: any) {
    console.error(`[Competitors] Unexpected error:`, err)
    return NextResponse.json({ error: "Failed to fetch competitors", detail: err?.message }, { status: 500 })
  }
}
