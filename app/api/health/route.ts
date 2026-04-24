import { NextResponse } from "next/server"

// Cheap health probe. Used by nginx upstream health and uptime monitors.
// Must NEVER throw, NEVER touch external services that could slow it down.
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "the-system",
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor(process.uptime()),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  )
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}
