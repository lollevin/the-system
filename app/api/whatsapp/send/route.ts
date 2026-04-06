import { NextRequest, NextResponse } from "next/server"
import { rateLimitResponse } from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"

const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || "http://localhost:3001"
const WHATSAPP_SERVICE_KEY = process.env.WHATSAPP_SERVICE_KEY || "default-key"
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
const WHATSAPP_FIXED_IMAGE_URL = process.env.WHATSAPP_FIXED_IMAGE_URL || "/images/jpco-voucher.png"

async function imageUrlToBase64(url: string): Promise<{ base64: string; mimeType: string; filename: string } | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const mimeType = res.headers.get("content-type") || "image/png"
    const ab = await res.arrayBuffer()
    const base64 = Buffer.from(ab).toString("base64")
    const filename = mimeType.includes("jpeg") ? "campaign.jpg" : mimeType.includes("webp") ? "campaign.webp" : "campaign.png"
    return { base64, mimeType, filename }
  } catch {
    return null
  }
}

function isConnectionError(error: any): boolean {
  const msg = (error?.message || error?.cause?.message || "").toLowerCase()
  return (
    error?.code === "ECONNREFUSED" ||
    error?.cause?.code === "ECONNREFUSED" ||
    msg.includes("econnrefused") ||
    msg.includes("connect") ||
    msg.includes("fetch failed") ||
    msg.includes("network")
  )
}

function formatPhoneForWa(phone: string): string {
  const clean = String(phone || "").replace(/\D/g, "")
  if (clean.startsWith("60")) return clean
  if (clean.startsWith("0")) return "60" + clean.slice(1)
  return "60" + clean
}

export async function POST(request: NextRequest) {
  // Rate limit: 30 req/min for WhatsApp
  const limited = rateLimitResponse(request, "whatsapp")
  if (limited) return limited

  let fallbackWaUrl = ""

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      phone,
      message,
      imageBase64,
      imageMimeType,
      imageFilename,
      imagePrompt,
      imageUrl,
      imageCaption,
      ctaUrl,
      ctaLabel,
    } = body

    if (!phone || (!message && !imageBase64 && !imagePrompt)) {
      return NextResponse.json(
        { error: "Phone and at least one content (message/image) is required" },
        { status: 400 }
      )
    }
    const waPhone = formatPhoneForWa(phone)
    const waText = encodeURIComponent(message || imageCaption || "")
    fallbackWaUrl = `https://wa.me/${waPhone}${waText ? `?text=${waText}` : ""}`

    let finalImageBase64: string | undefined = imageBase64
    let finalImageMimeType: string | undefined = imageMimeType
    let finalImageFilename: string | undefined = imageFilename

    // Highest priority: explicit imageUrl from request, then fixed env image URL.
    const preferredImageUrl = imageUrl || WHATSAPP_FIXED_IMAGE_URL
    const resolvedImageUrl = preferredImageUrl?.startsWith("/")
      ? new URL(preferredImageUrl, request.nextUrl.origin).toString()
      : preferredImageUrl
    if (!finalImageBase64 && resolvedImageUrl) {
      const converted = await imageUrlToBase64(resolvedImageUrl)
      if (converted) {
        finalImageBase64 = converted.base64
        finalImageMimeType = converted.mimeType
        finalImageFilename = converted.filename
      } else {
        console.warn("[WA Send] Failed to load image URL:", resolvedImageUrl)
      }
    }

    // Optional: generate campaign image using 302.AI(OpenAI compatible) when prompt is provided.
    if (!finalImageBase64 && imagePrompt && OPENAI_API_KEY) {
      try {
        const imgRes = await fetch(`${OPENAI_BASE_URL}/images/generations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-image-1",
            prompt: imagePrompt,
            size: "1024x1024",
            quality: "high",
            response_format: "b64_json",
          }),
        })

        if (imgRes.ok) {
          const imgData = await imgRes.json()
          const b64 = imgData?.data?.[0]?.b64_json
          if (b64) {
            finalImageBase64 = b64
            finalImageMimeType = "image/png"
            finalImageFilename = "jpco-campaign.png"
          }
        } else {
          console.warn("[WA Send] Image generation failed:", imgRes.status)
        }
      } catch (imgErr: any) {
        console.warn("[WA Send] Image generation error:", imgErr?.message || imgErr)
      }
    }

    const controller = new AbortController()
    // Allow longer timeout when image generation/upload is involved.
    const timeout = setTimeout(() => controller.abort(), imagePrompt || finalImageBase64 ? 50000 : 15000)

    const response = await fetch(`${WHATSAPP_SERVICE_URL}/api/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": WHATSAPP_SERVICE_KEY,
      },
      body: JSON.stringify({
        phone,
        message,
        imageBase64: finalImageBase64,
        imageMimeType: finalImageMimeType,
        imageFilename: finalImageFilename,
        imageCaption,
        ctaUrl,
        ctaLabel,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (response.status === 401) {
      console.error("[WA Send] API key mismatch!")
      return NextResponse.json(
        { error: "WhatsApp API key mismatch - check configuration", success: false },
        { status: 401 }
      )
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }))
      return NextResponse.json(
        { error: error.error || "Failed to send message", success: false },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[WA Send] Error:", error?.message, "Cause:", error?.cause?.message || error?.cause?.code)

    if (isConnectionError(error)) {
      return NextResponse.json(
        {
          error: "WhatsApp service is not running",
          success: false,
          fallback: {
            mode: "wa.me",
            url: fallbackWaUrl,
          },
        },
        { status: 503 }
      )
    }

    if (error?.name === "AbortError") {
      return NextResponse.json(
        {
          error: "WhatsApp service not responding (timeout)",
          success: false,
          fallback: {
            mode: "wa.me",
            url: fallbackWaUrl,
          },
        },
        { status: 504 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || "Internal server error", success: false },
      { status: 500 }
    )
  }
}
