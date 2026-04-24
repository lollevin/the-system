import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAllSkillsSummary, invalidateSkillsCache } from "@/lib/ai-skills"

export const dynamic = "force-dynamic"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "unauthorized" as const, status: 401 }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
  if (profile?.role !== "admin") return { ok: false, error: "forbidden" as const, status: 403 }
  return { ok: true as const }
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const skills = getAllSkillsSummary()
  return NextResponse.json({ skills })
}

export async function POST() {
  // Reload skills (useful after editing .md files on the server)
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  invalidateSkillsCache()
  const skills = getAllSkillsSummary()
  return NextResponse.json({ success: true, reloaded: skills.length, skills })
}
