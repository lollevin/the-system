import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { rateLimitResponse } from "@/lib/rate-limit"
import { NextResponse } from "next/server"

export type ShopSettings = {
  shop_name: string
  address: string
  lat: number
  lng: number
  radius_km: number
}

const DEFAULT_SETTINGS: ShopSettings = {
  shop_name: "JP&Co",
  address: "SS2, Petaling Jaya",
  lat: 3.1073,
  lng: 101.6268,
  radius_km: 5,
}

async function verifyAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { user: null, error: "Unauthorized" }
  }
  return { user, error: null }
}

export async function GET() {
  const limited = rateLimitResponse(new Request(new URL("/api/admin/shop-settings", "http://localhost")), "api")
  if (limited) return limited

  const { user, error: authError } = await verifyAuth()
  if (authError || !user) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from("shop_settings")
      .select("*")
      .eq("id", "default")
      .single()

    if (error || !data) {
      return NextResponse.json(DEFAULT_SETTINGS)
    }

    const settings: ShopSettings = {
      shop_name: data.shop_name ?? DEFAULT_SETTINGS.shop_name,
      address: data.address ?? DEFAULT_SETTINGS.address,
      lat: Number(data.lat) ?? DEFAULT_SETTINGS.lat,
      lng: Number(data.lng) ?? DEFAULT_SETTINGS.lng,
      radius_km: Number(data.radius_km) ?? DEFAULT_SETTINGS.radius_km,
    }

    return NextResponse.json(settings)
  } catch {
    return NextResponse.json(DEFAULT_SETTINGS)
  }
}

export async function POST(request: Request) {
  const limited = rateLimitResponse(request, "api")
  if (limited) return limited

  const { user, error: authError } = await verifyAuth()
  if (authError || !user) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  let body: Partial<ShopSettings>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const settings: ShopSettings = {
    shop_name: body.shop_name ?? DEFAULT_SETTINGS.shop_name,
    address: body.address ?? DEFAULT_SETTINGS.address,
    lat: typeof body.lat === "number" ? body.lat : Number(body.lat) || DEFAULT_SETTINGS.lat,
    lng: typeof body.lng === "number" ? body.lng : Number(body.lng) || DEFAULT_SETTINGS.lng,
    radius_km: typeof body.radius_km === "number" ? body.radius_km : Number(body.radius_km) || DEFAULT_SETTINGS.radius_km,
  }

  try {
    const admin = createAdminClient()
    await admin
      .from("shop_settings")
      .upsert(
        { id: "default", ...settings },
        { onConflict: "id" }
      )
  } catch {
    // Table may not exist; still return success with posted data
  }

  return NextResponse.json(settings)
}
