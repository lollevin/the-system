// AI Skills system.
//
// Skills are markdown files in /ai-skills at the project root. Each file is a
// self-contained mini-framework the AI should apply (e.g. AIDA copywriting,
// RFM segmentation, churn prediction). They are loaded once per Node process
// and cached in memory.
//
// Each skill supports optional frontmatter metadata:
//   ---
//   skill: AIDA
//   category: marketing-framework
//   priority: 10
//   triggers: [write message, campaign, voucher]
//   ---
//
// Usage from an AI route:
//   import { getRelevantSkills, getAllSkillNames } from "@/lib/ai-skills"
//   const skillBlock = getRelevantSkills(userGoal)
//   systemPrompt += skillBlock

import fs from "fs"
import path from "path"

export type Skill = {
  name: string
  category: string
  priority: number
  triggers: string[]
  body: string
  raw: string
}

const SKILLS_DIR = path.join(process.cwd(), "ai-skills")
let cache: Skill[] | null = null

function parseFrontmatter(raw: string): { meta: Record<string, any>; body: string } {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/)
  if (!match) return { meta: {}, body: raw }

  const metaRaw = match[1]
  const body = match[2]
  const meta: Record<string, any> = {}

  // Minimal YAML-ish parser: key: value OR key: (newline) - item
  const lines = metaRaw.split(/\r?\n/)
  let currentKey: string | null = null
  let listBuffer: string[] = []

  const flushList = () => {
    if (currentKey && listBuffer.length > 0) {
      meta[currentKey] = listBuffer.slice()
    }
    listBuffer = []
    currentKey = null
  }

  for (const line of lines) {
    const listItemMatch = line.match(/^\s*-\s+(.*)$/)
    if (listItemMatch && currentKey) {
      listBuffer.push(listItemMatch[1].trim().replace(/^["']|["']$/g, ""))
      continue
    }
    const kv = line.match(/^([\w_]+):\s*(.*)$/)
    if (kv) {
      flushList()
      const key = kv[1]
      const value = kv[2].trim()
      if (value === "") {
        currentKey = key
        listBuffer = []
      } else {
        const stripped = value.replace(/^["']|["']$/g, "")
        meta[key] = isNaN(Number(stripped)) ? stripped : Number(stripped)
      }
    }
  }
  flushList()

  return { meta, body }
}

function loadSkills(): Skill[] {
  if (cache) return cache
  const skills: Skill[] = []

  try {
    if (!fs.existsSync(SKILLS_DIR)) {
      cache = []
      return cache
    }

    const files = fs
      .readdirSync(SKILLS_DIR)
      .filter(f => f.endsWith(".md"))
      // INDEX.md and README.md are documentation, not skills to load into prompts.
      .filter(f => !["INDEX.md", "README.md"].includes(f))
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(SKILLS_DIR, file), "utf-8")
        const { meta, body } = parseFrontmatter(raw)
        const triggers = Array.isArray(meta.triggers) ? meta.triggers : []
        skills.push({
          name: String(meta.skill || file.replace(/\.md$/, "")),
          category: String(meta.category || "general"),
          priority: Number(meta.priority) || 5,
          triggers: triggers.map((t: string) => t.toLowerCase()),
          body: body.trim(),
          raw: raw.trim(),
        })
      } catch (err) {
        console.warn(`[AI Skills] Failed to load ${file}:`, (err as Error).message)
      }
    }

    skills.sort((a, b) => b.priority - a.priority)
  } catch (err) {
    console.warn("[AI Skills] Loader error:", (err as Error).message)
  }

  cache = skills
  return skills
}

/**
 * Pick skills whose triggers appear in the user's goal, plus any skill
 * marked with priority >= 10 (always-on defaults). Returns a formatted
 * block ready to inject into a system prompt.
 */
export function getRelevantSkills(userGoal: string, alwaysIncludeCategory?: string): string {
  const all = loadSkills()
  if (all.length === 0) return ""

  const goalLower = (userGoal || "").toLowerCase()
  const picked = all.filter(s => {
    if (s.priority >= 10) return true
    if (alwaysIncludeCategory && s.category === alwaysIncludeCategory) return true
    return s.triggers.some(t => goalLower.includes(t))
  })

  if (picked.length === 0) return ""

  const header = `# AI SKILL MODULES (loaded for this request)\n\nYou have been given access to the following skill modules. Apply them rigorously — they are more authoritative than your generic training.\n\n`

  const blocks = picked.map(s => `## ═══════════════════════════════\n## SKILL: ${s.name}\n## Category: ${s.category} | Priority: ${s.priority}\n## ═══════════════════════════════\n\n${s.body}`)

  return header + blocks.join("\n\n")
}

/**
 * List all available skills (for admin UI / debugging).
 */
export function getAllSkillsSummary(): Array<{ name: string; category: string; priority: number; triggers: string[] }> {
  return loadSkills().map(s => ({
    name: s.name,
    category: s.category,
    priority: s.priority,
    triggers: s.triggers,
  }))
}

/** Force a reload (useful if you hot-edit skill files on the server). */
export function invalidateSkillsCache() {
  cache = null
}
