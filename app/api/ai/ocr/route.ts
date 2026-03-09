import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { rateLimitResponse } from "@/lib/rate-limit"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
const CHAT_ENDPOINT = `${OPENAI_BASE_URL}/chat/completions`

export async function POST(request: NextRequest) {
  // Rate limit: 20 req/min for AI
  const limited = rateLimitResponse(request, "ai")
  if (limited) return limited

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    const { image, target } = await request.json()

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    const systemPrompt = target === "voucher"
      ? `You are an OCR assistant. Extract the voucher code from this image. 
         Voucher codes are typically uppercase alphanumeric strings (e.g., WELCOME10, JP-ABC123).
         Return ONLY the code text, nothing else. If you cannot read any code, return empty string.`
      : `You are an OCR assistant. Extract customer identification from this image.
         Look for: phone numbers, email addresses, names, or QR code data.
         Return ONLY the most useful identifier text (phone number preferred), nothing else.
         If you cannot read anything useful, return empty string.`

    const response = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: image, detail: "low" },
              },
              {
                type: "text",
                text: target === "voucher"
                  ? "Read the voucher code from this image."
                  : "Read the customer phone number, name, or ID from this image.",
              },
            ],
          },
        ],
        max_tokens: 100,
        temperature: 0,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error("OCR API error:", err)
      return NextResponse.json({ error: "AI vision request failed" }, { status: 500 })
    }

    const rawText = await response.text()
    let data: any
    try { data = JSON.parse(rawText) } catch { data = rawText }
    const text = (typeof data === "string" ? data : data.choices?.[0]?.message?.content)?.trim() || ""

    return NextResponse.json({ text })
  } catch (error: any) {
    console.error("OCR endpoint error:", error)
    return NextResponse.json({ error: error.message || "OCR failed" }, { status: 500 })
  }
}
