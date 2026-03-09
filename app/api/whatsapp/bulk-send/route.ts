import { NextRequest, NextResponse } from "next/server"
import { rateLimitResponse } from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"

const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || "http://localhost:3001"
const WHATSAPP_SERVICE_KEY = process.env.WHATSAPP_SERVICE_KEY || "default-key"

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

export async function POST(request: NextRequest) {
  const limited = rateLimitResponse(request, "whatsapp")
  if (limited) return limited

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { messages, delayMs = 3000 } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      )
    }

    // Validate messages format
    for (const msg of messages) {
      if (!msg.phone || !msg.message) {
        return NextResponse.json(
          { error: "Each message must have phone and message fields" },
          { status: 400 }
        )
      }
    }

    const controller = new AbortController()
    // Longer timeout for bulk send (30s + 3s per message)
    const timeoutMs = 30000 + messages.length * 3000
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(`${WHATSAPP_SERVICE_URL}/api/bulk-send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": WHATSAPP_SERVICE_KEY,
      },
      body: JSON.stringify({ messages, delayMs }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (response.status === 401) {
      console.error("[WA Bulk] API key mismatch!")
      return NextResponse.json(
        { error: "WhatsApp API key mismatch - check configuration", success: false },
        { status: 401 }
      )
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }))
      return NextResponse.json(
        { error: error.error || "Failed to send bulk messages", success: false },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[WA Bulk] Error:", error?.message, "Cause:", error?.cause?.message || error?.cause?.code)

    if (isConnectionError(error)) {
      return NextResponse.json(
        { error: "WhatsApp service is not running", success: false },
        { status: 503 }
      )
    }

    if (error?.name === "AbortError") {
      return NextResponse.json(
        { error: "WhatsApp service not responding (timeout)", success: false },
        { status: 504 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || "Internal server error", success: false },
      { status: 500 }
    )
  }
}
