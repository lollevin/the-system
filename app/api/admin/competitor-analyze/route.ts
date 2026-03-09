import { createClient } from "@/lib/supabase/server"
import { rateLimitResponse } from "@/lib/rate-limit"
import { NextResponse } from "next/server"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"

export const maxDuration = 60

export async function POST(request: Request) {
  const limited = rateLimitResponse(request, "ai")
  if (limited) return limited

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI API key not configured" }, { status: 500 })
  }

  let body: { name: string; address?: string; category?: string; website?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }

  const chatEndpoint = `${OPENAI_BASE_URL}/chat/completions`

  try {
    const aiResponse = await fetch(chatEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are JP&Co's Senior Competitive Intelligence Analyst — powered by 302.AI. You specialize in F&B market analysis in the Klang Valley, Malaysia. JP&Co is a trendy casual dining restaurant in SS2, Petaling Jaya serving burgers, cakes, and artisan coffee with an AI-powered loyalty system. Analyze competitors with actionable marketing intelligence. Always reply in English. Be specific, data-driven, and provide tactics JP&Co can execute immediately.",
          },
          {
            role: "user",
            content: buildPrompt(body.name, body.category, body.address, body.website),
          },
        ],
        max_tokens: 1500,
        temperature: 0.7,
        presence_penalty: 0.4,
        frequency_penalty: 0.3,
      }),
    })

    if (!aiResponse.ok) {
      const errText = await aiResponse.text()
      console.error("[Competitor Analyze] AI error:", aiResponse.status, errText.slice(0, 500))
      return NextResponse.json(
        { error: "AI analysis failed", detail: errText.slice(0, 200) },
        { status: 502 },
      )
    }

    const rawText = await aiResponse.text()
    let data: any
    try {
      data = JSON.parse(rawText)
    } catch {
      data = rawText
    }

    const analysis: string =
      (typeof data === "string" ? data : data.choices?.[0]?.message?.content) ||
      ""

    if (!analysis || analysis.trim().length === 0) {
      console.error("[Competitor Analyze] Empty. Raw length:", rawText.length, "preview:", rawText.slice(0, 300))
      return NextResponse.json({ error: "Empty AI response", detail: rawText.slice(0, 200) }, { status: 502 })
    }

    return NextResponse.json({ analysis: analysis.trim() })
  } catch (err: any) {
    console.error("[Competitor Analyze] Error:", err.message)
    return NextResponse.json({ error: "Failed to analyze competitor", detail: err.message }, { status: 500 })
  }
}

function buildPrompt(name: string, category?: string, address?: string, website?: string) {
  const parts = [`Analyze this competitor for JP&Co:\n`]
  parts.push(`Name: ${name}`)
  parts.push(`Type: ${category || "Restaurant"}`)
  parts.push(`Location: ${address || "Near SS2, Petaling Jaya"}`)
  if (website) parts.push(`Website: ${website}`)

  parts.push(`
Provide this competitive intelligence report:

**🏪 Business Profile:** 2-3 sentences — what they sell, their positioning, target demographic, and price range.

**📣 Marketing & Promotions:** Known or likely promotions, loyalty programs, social media activity, delivery platforms (GrabFood, FoodPanda), and marketing channels they use.

**⭐ Strengths:** What they do well that JP&Co should be aware of (menu, ambiance, pricing, location advantage).

**⚠️ Weaknesses:** Gaps or areas where JP&Co has a clear advantage.

**🎯 Threat Level:** Low / Medium / High — with a one-sentence justification comparing their offering to JP&Co's casual dining + loyalty + AI marketing edge.

**💡 Counter-Strategy:** 2-3 specific, actionable tactics JP&Co should execute to win customers from this competitor. Think: targeted offers, menu positioning, social media campaigns, or loyalty program advantages.

**📊 Opportunity Score:** Rate 1-10 how much JP&Co can gain from actively competing with this business.

Be specific to the Malaysian F&B market. Reference real platforms (GrabFood, Instagram, TikTok, Google Reviews) when relevant.`)


  return parts.join("\n")
}
