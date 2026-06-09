import { createClient } from "@/lib/supabase/server"
import { rateLimitResponse } from "@/lib/rate-limit"
import { NextResponse } from "next/server"

export const maxDuration = 60
export const dynamic = "force-dynamic"

// In-memory cache (cleared on restart) — fast path
const memCache = new Map<string, { data: any[]; expiry: number }>()
const MEM_TTL_MS = 30 * 60 * 1000   // 30 min
const DB_TTL_MS  = 24 * 60 * 60 * 1000 // 24 h — Supabase cache TTL

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

async function fetchFromOverpass(query: string): Promise<any[] | null> {
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter",
  ]

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 13000) // 3 × 13s = 39s < maxDuration:60

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; JPCo-System/1.0)",
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
        cache: "no-store",
      })

      clearTimeout(timeout)

      if (!res.ok) {
        console.warn(`[Competitors] ${endpoint} → ${res.status}`)
        continue
      }

      const json = await res.json()
      return json.elements || []
    } catch (err: any) {
      console.warn(`[Competitors] ${endpoint} → ${err?.name === "AbortError" ? "timeout" : err?.message}`)
    }
  }

  return null // all failed
}

export async function GET(request: Request) {
  const limited = rateLimitResponse(request, "api")
  if (limited) return limited

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const lat    = parseFloat(searchParams.get("lat")    || "0")
  const lng    = parseFloat(searchParams.get("lng")    || "0")
  const radius = Math.min(Math.max(parseFloat(searchParams.get("radius") || "5000"), 100), 50000)
  const force  = searchParams.get("force") === "1" // force refresh

  if (!lat || !lng) return NextResponse.json({ error: "lat and lng are required" }, { status: 400 })

  const cacheKey = `competitor_cache_${lat.toFixed(4)}_${lng.toFixed(4)}_${radius}`

  // ── 1. Memory cache (fast path, skip on force refresh) ──────────────────
  if (!force) {
    const mem = memCache.get(cacheKey)
    if (mem && mem.expiry > Date.now()) {
      return NextResponse.json(mem.data)
    }
  }

  // ── 2. Supabase cache ────────────────────────────────────────────────────
  let staleDbData: any[] | null = null

  if (!force) {
    const { data: row } = await supabase
      .from("global_settings")
      .select("value")
      .eq("key", cacheKey)
      .single()

    if (row?.value?.data && Array.isArray(row.value.data)) {
      const cachedAt = new Date(row.value.cached_at).getTime()
      const age = Date.now() - cachedAt

      if (age < DB_TTL_MS) {
        // Fresh — return immediately
        console.log(`[Competitors] Supabase cache hit (${Math.round(age / 60000)}m old)`)
        memCache.set(cacheKey, { data: row.value.data, expiry: Date.now() + MEM_TTL_MS })
        return NextResponse.json(row.value.data)
      }

      // Stale but exists — keep as fallback
      staleDbData = row.value.data
    }
  }

  // ── 3. Fetch from Overpass ───────────────────────────────────────────────
  const query = `[out:json][timeout:25];(node["amenity"~"restaurant|cafe|fast_food|food_court|bar|pub|ice_cream|bakery"](around:${radius},${lat},${lng});node["shop"~"bakery|confectionery|coffee"](around:${radius},${lat},${lng}););out body;`

  const elements = await fetchFromOverpass(query)

  if (elements === null) {
    // Overpass failed — return stale cache if available
    if (staleDbData && staleDbData.length > 0) {
      console.warn("[Competitors] Overpass unavailable — returning stale cache")
      memCache.set(cacheKey, { data: staleDbData, expiry: Date.now() + MEM_TTL_MS })
      return NextResponse.json(staleDbData, {
        headers: { "X-Cache": "stale" },
      })
    }

    return NextResponse.json(
      { error: "Overpass API unavailable", hint: "The OpenStreetMap Overpass service is temporarily slow or unreachable. Try again in a moment." },
      { status: 502 }
    )
  }

  // ── 4. Process and save ──────────────────────────────────────────────────
  const competitors = elements
    .map((el: any) => {
      const amenity = el.tags?.amenity
      const shop    = el.tags?.shop
      let category  = "restaurant"
      if (amenity) category = amenity
      else if (shop === "bakery")        category = "bakery"
      else if (shop === "coffee")        category = "cafe"
      else if (shop === "confectionery") category = "bakery"

      return {
        name:          el.tags?.name || "",
        lat:           el.lat,
        lng:           el.lon,
        distance_km:   haversineDistance(lat, lng, el.lat, el.lon),
        category,
        address:       el.tags?.["addr:street"]
          ? `${el.tags["addr:street"]} ${el.tags["addr:housenumber"] || ""}`.trim()
          : el.tags?.["addr:full"] || "",
        website:       el.tags?.website       || el.tags?.["contact:website"] || "",
        phone:         el.tags?.phone         || el.tags?.["contact:phone"]   || "",
        opening_hours: el.tags?.opening_hours || "",
        cuisine:       el.tags?.cuisine       || "",
        brand:         el.tags?.brand         || "",
      }
    })
    .filter((c: any) => c.name && c.name.trim().length > 0)
    .sort((a: any, b: any) => a.distance_km - b.distance_km)
    .slice(0, 80)

  // Save to Supabase (upsert)
  await supabase.from("global_settings").upsert(
    { key: cacheKey, value: { data: competitors, cached_at: new Date().toISOString() } },
    { onConflict: "key" }
  )

  // Save to memory cache
  memCache.set(cacheKey, { data: competitors, expiry: Date.now() + MEM_TTL_MS })

  console.log(`[Competitors] Fetched ${competitors.length} places, saved to Supabase cache`)
  return NextResponse.json(competitors)
}
