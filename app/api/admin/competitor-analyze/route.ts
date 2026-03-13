import { createClient } from "@/lib/supabase/server"
import { rateLimitResponse } from "@/lib/rate-limit"
import { NextResponse } from "next/server"
import { aiCallWithTools } from "@/lib/ai-tools"

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

  const langInstruction = body.language === "zh"
    ? "Chinese (简体中文)"
    : body.language === "ms"
    ? "Bahasa Melayu"
    : "English"

  try {
    const messages = [
      {
        role: "system",
        content: `You are JP&Co's Senior Competitive Intelligence Analyst — powered by 302.AI. You specialize in F&B market analysis in the Klang Valley, Malaysia. JP&Co is a trendy casual dining restaurant at Pavilion Bukit Jalil, Kuala Lumpur serving burgers, cakes, and artisan coffee with an AI-powered loyalty system.

You MUST reply in ${langInstruction}. Be specific, data-driven, and provide tactics JP&Co can execute immediately.

## TOOLS
You have access to these tools — USE THEM to get real data:
- **web_search** — Search the internet for this competitor's real promotions, reviews, menu, social media
- **scrape_url** — Read their website or food delivery pages for actual menu items and prices
- **search_knowledge_base** — Check if admin uploaded any data about this competitor

ALWAYS use web_search first to find real current information about the competitor before writing your analysis. This gives much better results than guessing.`,
      },
      {
        role: "user",
        content: buildPrompt(body.name, body.category, body.address, body.website),
      },
    ]

    const result = await aiCallWithTools({
      messages,
      maxRounds: 3,
      temperature: 0.7,
      maxTokens: 2000,
    })

    const analysis = result.content?.trim() || ""

    if (!analysis) {
      return NextResponse.json({ error: "Empty AI response" }, { status: 502 })
    }

    console.log(`[Competitor Analyze] Tools used: ${result.toolsUsed.join(", ") || "none"}`)
    return NextResponse.json({ analysis })
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

  parts.push(`
First, use web_search to find real information about "${name}" (promotions, menu, reviews, social media). Then provide this competitive intelligence report:

**Business Profile:** 2-3 sentences — what they sell, positioning, target demographic, price range.

**Marketing & Promotions:** Their ACTUAL current promotions (from web search), loyalty programs, social media, delivery platforms.

**Strengths:** What they do well that JP&Co should be aware of.

**Weaknesses:** Gaps or areas where JP&Co has a clear advantage.

**Counter-Strategy:** 2-3 specific, actionable tactics JP&Co should execute immediately.

**Opportunity Score:** Rate 1-10 how much JP&Co can gain from actively competing against this competitor.

Be specific to the Malaysian F&B market. Reference real platforms (GrabFood, ShopeeFood, Instagram, TikTok, Google Reviews). Do NOT include a separate "Threat Level" section — threat level is already determined separately.`)

  return parts.join("\n")
}
