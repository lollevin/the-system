import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { executeWebSearch } from "@/lib/ai-tools"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
const CACHE_HOURS = 24

interface CompetitorInput {
  name: string
  lat: number
  lng: number
  distance_km: number
  category: string
  cuisine?: string
  brand?: string
}

function makeKey(c: CompetitorInput): string {
  return `${c.name}_${c.lat.toFixed(5)}_${c.lng.toFixed(5)}`
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  let body: { competitors: CompetitorInput[]; shopName?: string; shopCuisine?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.competitors || body.competitors.length === 0) {
    return NextResponse.json({ threats: {}, source: "empty" })
  }

  const admin = createAdminClient()
  const keys = body.competitors.map(makeKey)

  const { data: cached } = await admin
    .from("competitor_threats")
    .select("competitor_key, competitor_name, threat_level, reason, deep_analysis, last_analyzed")
    .in("competitor_key", keys)

  const now = new Date()
  const freshCutoff = new Date(now.getTime() - CACHE_HOURS * 60 * 60 * 1000)
  const cachedMap: Record<string, any> = {}
  let allFresh = true

  for (const row of cached || []) {
    cachedMap[row.competitor_key] = row
    if (new Date(row.last_analyzed) < freshCutoff) allFresh = false
  }

  const missingKeys = keys.filter(k => !cachedMap[k])
  if (missingKeys.length > 0) allFresh = false

  if (allFresh && Object.keys(cachedMap).length === keys.length) {
    const threats: Record<string, any> = {}
    for (const c of body.competitors) {
      const k = makeKey(c)
      const row = cachedMap[k]
      if (row) threats[k] = { level: row.threat_level, reason: row.reason, deepAnalysis: row.deep_analysis }
    }
    return NextResponse.json({ threats, source: "cache" })
  }

  try {
    const threats = await quickBatchAnalysis(body.competitors, body.shopName || "JP&Co", body.shopCuisine || "burgers, cakes, artisan coffee")

    const upserts = body.competitors.map(c => {
      const k = makeKey(c)
      const t = threats[k] || { level: "orange", reason: "" }
      return {
        competitor_key: k,
        competitor_name: c.name,
        threat_level: t.level,
        reason: t.reason,
        last_analyzed: now.toISOString(),
      }
    })

    Promise.resolve(
      admin
        .from("competitor_threats")
        .upsert(upserts, { onConflict: "competitor_key" })
    )
      .then(() => console.log("[Threats] Cached", upserts.length, "results"))
      .catch((err: any) => console.error("[Threats] Cache error:", err.message))

    deepAnalyzeTopThreats(admin, body.competitors, threats, body.shopName || "JP&Co")

    return NextResponse.json({ threats, source: "ai" })
  } catch (err: any) {
    console.error("[Threats] Analysis error:", err.message)

    const threats: Record<string, any> = {}
    for (const c of body.competitors) {
      const k = makeKey(c)
      const row = cachedMap[k]
      threats[k] = row
        ? { level: row.threat_level, reason: row.reason, deepAnalysis: row.deep_analysis }
        : { level: "orange", reason: "Analysis pending" }
    }
    return NextResponse.json({ threats, source: "fallback" })
  }
}

async function quickBatchAnalysis(
  competitors: CompetitorInput[],
  shopName: string,
  shopCuisine: string
): Promise<Record<string, { level: string; reason: string }>> {
  if (!OPENAI_API_KEY) {
    const result: Record<string, { level: string; reason: string }> = {}
    for (const c of competitors) result[makeKey(c)] = { level: "orange", reason: "AI not configured" }
    return result
  }

  const list = competitors.map((c, i) =>
    `${i + 1}. "${c.name}" | category=${c.category} | cuisine=${c.cuisine || "unknown"} | brand=${c.brand || "none"} | distance=${c.distance_km.toFixed(2)}km`
  ).join("\n")

  const prompt = `You are a competitive intelligence analyst for "${shopName}", a trendy casual dining restaurant at Pavilion Bukit Jalil, Kuala Lumpur, Malaysia, serving ${shopCuisine}.

You MUST analyze ALL ${competitors.length} competitors below. Do NOT skip any.

Assign each a threat level:
- "red" = HIGH THREAT: direct competitor (similar food: burgers, western food, cafe, coffee, bakery), well-known chain with similar offerings, close proximity, or brand that could steal customers
- "orange" = MEDIUM THREAT: somewhat similar food or nearby, indirect competitor, or unknown shop that could still compete for the same customers
- "green" = POPULAR/HIGH SALES: well-known chain or brand with high foot traffic (like KFC, McDonald's, Starbucks, Mixue, Tealive, etc.)

When unsure between "red" and "orange", pick "orange". Every food business nearby is at least "orange".

COMPETITORS (${competitors.length} total — you must return exactly ${competitors.length} results):
${list}

Respond with ONLY a valid JSON array, no markdown, no explanation. One entry per competitor:
[{"idx":1,"level":"red","reason":"Direct burger competitor, 0.5km away"},{"idx":2,"level":"green","reason":"KFC - high traffic chain"},{"idx":3,"level":"orange","reason":"Nearby noodle shop, indirect competitor"}]`

  const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 8000,
    }),
  })

  if (!res.ok) throw new Error(`AI API error ${res.status}`)

  const raw = await res.text()
  let data: any
  try { data = JSON.parse(raw) } catch { throw new Error("Invalid AI response") }

  const content = data.choices?.[0]?.message?.content || ""
  let parsed: any[]
  try {
    const jsonStr = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim()
    parsed = JSON.parse(jsonStr)
  } catch {
    console.error("[Threats] Failed to parse AI response:", content.slice(0, 500))
    const result: Record<string, { level: string; reason: string }> = {}
    for (const c of competitors) result[makeKey(c)] = { level: "orange", reason: "Analysis failed" }
    return result
  }

  const result: Record<string, { level: string; reason: string }> = {}
  for (const c of competitors) result[makeKey(c)] = { level: "orange", reason: "Unanalyzed" }

  for (const item of parsed) {
    const idx = (item.idx || item.index) - 1
    if (idx >= 0 && idx < competitors.length) {
      const k = makeKey(competitors[idx])
      const level = ["red", "orange", "green"].includes(item.level) ? item.level : "orange"
      result[k] = { level, reason: item.reason || "" }
    }
  }

  return result
}

async function deepAnalyzeTopThreats(
  admin: ReturnType<typeof createAdminClient>,
  competitors: CompetitorInput[],
  threats: Record<string, { level: string; reason: string }>,
  shopName: string
) {
  const highPriorityCompetitors = competitors
    .filter(c => {
      const level = threats[makeKey(c)]?.level
      return level === "red" || level === "orange"
    })
    .sort((a, b) => {
      const priority: Record<string, number> = { red: 0, orange: 1 }
      const pa = priority[threats[makeKey(a)]?.level] ?? 2
      const pb = priority[threats[makeKey(b)]?.level] ?? 2
      return pa - pb || a.distance_km - b.distance_km
    })
    .slice(0, 8)

  if (highPriorityCompetitors.length === 0) return

  for (const c of highPriorityCompetitors) {
    try {
      const searchResult = await executeWebSearch(`${c.name} ${c.brand || ""} Bukit Jalil Kuala Lumpur Malaysia promotions menu prices reviews`)
      if (searchResult && !searchResult.startsWith("[")) {
        const k = makeKey(c)
        await admin
          .from("competitor_threats")
          .update({ deep_analysis: searchResult.slice(0, 5000), last_analyzed: new Date().toISOString() })
          .eq("competitor_key", k)
        console.log(`[Threats] Deep analysis done for: ${c.name}`)
      }
    } catch (err: any) {
      console.error(`[Threats] Deep analysis failed for ${c.name}:`, err.message)
    }
  }
}
