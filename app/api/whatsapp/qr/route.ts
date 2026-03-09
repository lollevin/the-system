import { NextResponse } from "next/server"
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

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(`${WHATSAPP_SERVICE_URL}/api/qr`, {
      headers: {
        "x-api-key": WHATSAPP_SERVICE_KEY,
      },
      cache: "no-store",
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (response.status === 401) {
      console.error("[WA QR] API key mismatch! Check WhatsApp service .env API_KEY matches WHATSAPP_SERVICE_KEY")
      return NextResponse.json(
        { error: "WhatsApp API key mismatch - check server configuration", qr: null, status: "auth_error" },
        { status: 401 }
      )
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }))
      return NextResponse.json(
        { error: error.error || "Failed to get QR code", qr: null },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[WA QR] Error:", error?.message || error, "Cause:", error?.cause?.message || error?.cause?.code)

    if (isConnectionError(error)) {
      return NextResponse.json(
        { 
          error: "WhatsApp service is not running. Please check pm2 status on VPS.",
          status: "service_offline",
          qr: null
        },
        { status: 503 }
      )
    }

    if (error?.name === "AbortError") {
      return NextResponse.json(
        { error: "WhatsApp service not responding (timeout)", qr: null, status: "timeout" },
        { status: 504 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || "Internal server error", qr: null },
      { status: 500 }
    )
  }
}
