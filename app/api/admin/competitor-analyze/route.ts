import { createClient } from "@/lib/supabase/server"
import { rateLimitResponse } from "@/lib/rate-limit"
import { NextResponse } from "next/server"
import { aiCallWithTools } from "@/lib/ai-tools"
import { buildLanguageDirective, resolveLocaleFromRequest } from "@/lib/i18n/language-directive"
import { getMalaysiaNow } from "@/lib/malaysia-time"

export const maxDuration = 60

export async function POST(request: Request) {
  const limited = rateLimitResponse(request, "ai")
  if (limited) return limited

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI API key not configured" }, { status: 500 })
  }

  let body: { name: string; address?: string; category?: string; website?: string; language?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }

  // Three-source locale resolution: body > X-Locale header > cookie > "en"
  const localeInfo = resolveLocaleFromRequest(request, body.language)
  const languageDirective = buildLanguageDirective(localeInfo.tag)
  const now = getMalaysiaNow()
  const currentYear = new Date(now.iso).getFullYear()

  try {
    const messages = [
      {
        role: "system",
        content: `${languageDirective}

---

You are JP&Co's Senior Competitive Intelligence Analyst. You specialize in F&B market analysis in the Klang Valley, Malaysia. JP&Co is a trendy casual dining restaurant at Pavilion Bukit Jalil, Kuala Lumpur serving burgers, cakes, and artisan coffee with an AI-powered loyalty system.

## TODAY'S DATE (AUTHORITATIVE)
- Today is ${now.long} (${now.iso}), Asia/Kuala_Lumpur.
- Current year: ${currentYear}. Current month: ${now.long.split(" ")[0]}.
- NEVER report promotions from past years as "current". If a source dates back more than 90 days, treat it as historical context, not an active promo.
- If web_search results are older than 3 months, say so explicitly and search again with the current year.

Be specific, data-driven, and provide tactics JP&Co can execute immediately.

## TOOLS (MANDATORY — do not skip)
You MUST call these tools before writing the analysis. An analysis without tool calls is a failure.
- **web_search** — Search for this competitor's CURRENT promotions. ALWAYS include "${currentYear}" in your query. Run at least 2 searches:
    1. "${"${competitor_name}"} promotion ${currentYear} Malaysia"
    2. "${"${competitor_name}"} menu price ${currentYear} Kuala Lumpur"
- **scrape_url** — If you find their GrabFood / FoodPanda / Instagram / website URL, scrape it for real current items and prices.
- **search_knowledge_base** — Check if admin uploaded any data about this competitor.

Rules:
1. Start with web_search. Never write analysis from memory alone.
2. If a search returns only old results (pre-${currentYear - 1}), run another query with "${currentYear}" or "latest".
3. Every promotion you mention MUST include the date/month from the source. If the source is undated, say "(date unknown, verify)".
4. Never invent dates. Never copy a promo with a past-year date as if it's current.

---

${languageDirective}

Silent pre-send checklist: every section heading, bullet, and tactic must be in ${localeInfo.label}. Every promotion must cite its date and that date must be ${currentYear} or within the last 90 days — otherwise label it (历史参考 / historical). Rewrite if any line fails this check.`,
      },
      {
        role: "user",
        content: buildPrompt(body.name, body.category, body.address, body.website),
      },
    ]

    const result = await aiCallWithTools({
      messages,
      maxRounds: 4,
      temperature: 0.5,
      maxTokens: 2000,
    })

    const analysis = result.content?.trim() || ""

    if (!analysis) {
      return NextResponse.json({ error: "Empty AI response" }, { status: 502 })
    }

    const usedWebSearch = result.toolsUsed.includes("web_search")
    console.log(`[Competitor Analyze] Tools used: ${result.toolsUsed.join(", ") || "none"} | webSearch=${usedWebSearch}`)

    return NextResponse.json({
      analysis,
      toolsUsed: result.toolsUsed,
      webSearchUsed: usedWebSearch,
      analyzedAt: now.iso,
    })
  } catch (err: any) {
    console.error("[Competitor Analyze] Error:", err.message)
    return NextResponse.json({ error: "Failed to analyze competitor", detail: err.message }, { status: 500 })
  }
}

function buildPrompt(name: string, category?: string, address?: string, website?: string) {
  const parts = [`Analyze this competitor for JP&Co:\n`]
  parts.push(`Name: ${name}`)
  parts.push(`Type: ${category || "Restaurant"}`)
  parts.push(`Location: ${address || "Near Pavilion Bukit Jalil, KL"}`)
  if (website) parts.push(`Website: ${website}`)

  const currentYear = new Date().getFullYear()
  parts.push(`
STEP 1 — Run web_search NOW (do not skip). Required queries:
   • "${name} promotion ${currentYear} Malaysia"
   • "${name} menu price ${currentYear} Kuala Lumpur"
If results look old or empty, search again with "latest" or the current month.

STEP 2 — After you have real ${currentYear} data, write this report:

**Business Profile:** 2-3 sentences — what they sell, positioning, target demographic, price range.

**Marketing & Promotions:** Their ACTUAL ${currentYear} promotions (from web search). Every promotion MUST include the date from the source (e.g. "March ${currentYear}"). If you can only find older promos, say "No current ${currentYear} promos found; last known: [date]" — do NOT present old promos as current.

**Strengths:** What they do well that JP&Co should be aware of.

**Weaknesses:** Gaps or areas where JP&Co has a clear advantage.

**Counter-Strategy:** 2-3 specific, actionable tactics JP&Co should execute immediately.

**Opportunity Score:** Rate 1-10 how much JP&Co can gain from actively competing against this competitor.

Be specific to the Malaysian F&B market. Reference real platforms (GrabFood, ShopeeFood, Instagram, TikTok, Google Reviews). Do NOT include a separate "Threat Level" section — threat level is already determined separately.`)

  return parts.join("\n")
}
