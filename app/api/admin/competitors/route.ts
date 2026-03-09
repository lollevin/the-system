import { createClient } from "@/lib/supabase/server"
import { rateLimitResponse } from "@/lib/rate-limit"
import { NextResponse } from "next/server"

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

  const query = `[out:json][timeout:10];(node["amenity"~"restaurant|cafe|fast_food"](around:${radius},${lat},${lng}););out body;`

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    })

    if (!res.ok) {
      return NextResponse.json({ error: "Overpass API error" }, { status: 502 })
    }

    const data = await res.json()
    const elements = data.elements || []

    const competitors = elements
      .map((el: any) => ({
        name: el.tags?.name || "Unknown",
        lat: el.lat,
        lng: el.lon,
        distance_km: haversineDistance(lat, lng, el.lat, el.lon),
        category: el.tags?.amenity || "restaurant",
        address: el.tags?.["addr:street"]
          ? `${el.tags["addr:street"]} ${el.tags["addr:housenumber"] || ""}`.trim()
          : el.tags?.["addr:full"] || "",
        website: el.tags?.website || el.tags?.["contact:website"] || "",
        phone: el.tags?.phone || el.tags?.["contact:phone"] || "",
        opening_hours: el.tags?.opening_hours || "",
        cuisine: el.tags?.cuisine || "",
        brand: el.tags?.brand || "",
      }))
      .filter((c: any) => c.name !== "Unknown")
      .sort((a: any, b: any) => a.distance_km - b.distance_km)
      .slice(0, 50)

    return NextResponse.json(competitors)
  } catch {
    return NextResponse.json({ error: "Failed to fetch competitors" }, { status: 500 })
  }
}
