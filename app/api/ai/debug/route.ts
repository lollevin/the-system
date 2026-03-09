import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Debug endpoint to check AI system health
 * GET /api/ai/debug
 * 
 * Returns diagnostic info about:
 * - Environment variables
 * - Supabase connectivity
 * - Customer data availability
 * - WhatsApp service status
 */
export async function GET(request: NextRequest) {
  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {},
    auth: {},
    database: {},
    whatsapp: {},
    ai: {},
  }

  // 1. Check environment variables (don't expose full values)
  diagnostics.env = {
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "SET (" + process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30) + "...)" : "MISSING!",
    SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET (length: " + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length + ")" : "MISSING!",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "SET (length: " + process.env.SUPABASE_SERVICE_ROLE_KEY.length + ")" : "MISSING! ← THIS IS THE PROBLEM",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "SET (length: " + process.env.OPENAI_API_KEY.length + ")" : "MISSING!",
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || "NOT SET (using default openai.com)",
    WHATSAPP_SERVICE_URL: process.env.WHATSAPP_SERVICE_URL || "NOT SET (using localhost:3001)",
    WHATSAPP_SERVICE_KEY: process.env.WHATSAPP_SERVICE_KEY ? "SET (length: " + process.env.WHATSAPP_SERVICE_KEY.length + ")" : "NOT SET (using default-key)",
  }

  // 2. Check auth
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    diagnostics.auth = {
      authenticated: !!user,
      userId: user?.id?.substring(0, 8) + "..." || null,
      email: user?.email || null,
      error: authError?.message || null,
    }

    // Check role
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single()
      diagnostics.auth.role = profile?.role || "NOT FOUND"
      diagnostics.auth.name = profile?.full_name || "Unknown"
    }
  } catch (err: any) {
    diagnostics.auth = { error: err.message }
  }

  // 3. Check database - try with service role key
  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { createClient: createPlainClient } = await import("@supabase/supabase-js")
      const adminClient = createPlainClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )

      const { data: customers, error: dbError, count } = await adminClient
        .from("profiles")
        .select("id, full_name, role", { count: "exact" })
        .eq("role", "customer")
        .limit(5)

      diagnostics.database = {
        adminClientCreated: true,
        customersFound: count || customers?.length || 0,
        sampleCustomers: customers?.map(c => c.full_name || "Unknown").slice(0, 3) || [],
        error: dbError?.message || null,
      }

      // Also check total profiles
      const { count: totalProfiles } = await adminClient
        .from("profiles")
        .select("*", { count: "exact", head: true })

      diagnostics.database.totalProfiles = totalProfiles

      // Check tables exist
      for (const table of ["transactions", "vouchers", "sent_messages", "user_sessions"]) {
        try {
          const { error } = await adminClient.from(table).select("id").limit(1)
          diagnostics.database[`table_${table}`] = error ? `ERROR: ${error.message}` : "OK"
        } catch {
          diagnostics.database[`table_${table}`] = "QUERY FAILED"
        }
      }
    } else {
      diagnostics.database = { error: "SUPABASE_SERVICE_ROLE_KEY not set - cannot query as admin" }
    }
  } catch (err: any) {
    diagnostics.database.error = err.message
  }

  // 4. Check WhatsApp service
  try {
    const waUrl = process.env.WHATSAPP_SERVICE_URL || "http://localhost:3001"
    const waKey = process.env.WHATSAPP_SERVICE_KEY || "default-key"
    
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch(`${waUrl}/api/status`, {
      headers: { "x-api-key": waKey },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (response.status === 401) {
      diagnostics.whatsapp = {
        reachable: true,
        error: "API KEY MISMATCH! The WhatsApp service API_KEY does not match WHATSAPP_SERVICE_KEY",
        hint: "Create /var/www/the-system/whatsapp-service/.env with: API_KEY=" + waKey,
      }
    } else {
      const data = await response.json()
      diagnostics.whatsapp = {
        reachable: true,
        status: data.status,
        connected: data.connected,
        phone: data.phone,
      }
    }
  } catch (err: any) {
    diagnostics.whatsapp = {
      reachable: false,
      error: err.message || "Cannot connect to WhatsApp service",
      hint: "Check: pm2 status whatsapp-service",
    }
  }

  // 5. Check AI service
  diagnostics.ai = {
    model: "gpt-4o",
    apiKeySet: !!process.env.OPENAI_API_KEY,
    baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  }

  return NextResponse.json(diagnostics, { status: 200 })
}
