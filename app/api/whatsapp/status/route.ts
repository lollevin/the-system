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
    const timeout = setTimeout(() => controller.abort(), 8000)

    const response = await fetch(`${WHATSAPP_SERVICE_URL}/api/status`, {
      headers: {
        "x-api-key": WHATSAPP_SERVICE_KEY,
      },
      cache: "no-store",
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (response.status === 401) {
      console.error("[WA Status] API key mismatch! Check WhatsApp service .env API_KEY matches WHATSAPP_SERVICE_KEY")
      return NextResponse.json({
        status: "auth_error",
        connected: false,
        phone: null,
        message: "WhatsApp service API key mismatch - check configuration"
      })
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }))
      return NextResponse.json(
        { error: error.error || "Failed to get status", status: "error", connected: false },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[WA Status] Error:", error?.message || error, "Cause:", error?.cause?.message || error?.cause?.code)
    
    if (isConnectionError(error)) {
      return NextResponse.json({
        status: "service_offline",
        connected: false,
        phone: null,
        message: "WhatsApp service is not running on VPS. Please check pm2 status."
      })
    }

    if (error?.name === "AbortError") {
      return NextResponse.json({
        status: "timeout",
        connected: false,
        phone: null,
        message: "WhatsApp service is not responding (timeout)"
      })
    }
    
    return NextResponse.json(
      { 
        status: "error",
        connected: false,
        phone: null,
        error: error.message || "Unknown error"
      },
      { status: 500 }
    )
  }
}
