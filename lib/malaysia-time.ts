/**
 * Malaysia-timezone helpers.
 *
 * JP&Co operates in Kuala Lumpur (UTC+8). The server may run in any
 * timezone (Vercel US, VPS Singapore, local dev, etc.), so we always
 * resolve "today" against Asia/Kuala_Lumpur to keep AI reasoning,
 * birthday queries, and day-of-week logic consistent for the admin.
 */

export const MALAYSIA_TZ = "Asia/Kuala_Lumpur"

export interface MalaysiaNow {
  /** Date object whose local fields (year/month/day/hours/minutes) equal KL wall-clock time. */
  date: Date
  /** "YYYY-MM-DD" in KL. */
  iso: string
  /** "HH:MM" in 24h KL. */
  time: string
  /** e.g. "Monday" */
  dayOfWeek: string
  /** e.g. "April 23, 2026" */
  long: string
  /** e.g. "April 2026" */
  monthLabel: string
}

export function getMalaysiaNow(): MalaysiaNow {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MALAYSIA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .formatToParts(new Date())
    .reduce((acc: Record<string, string>, p) => {
      if (p.type !== "literal") acc[p.type] = p.value
      return acc
    }, {})

  const year = Number(parts.year)
  const month = Number(parts.month)
  const day = Number(parts.day)
  const hour = Number(parts.hour || "0")
  const minute = Number(parts.minute || "0")
  const second = Number(parts.second || "0")

  const date = new Date(year, month - 1, day, hour, minute, second)
  const pad = (n: number) => String(n).padStart(2, "0")

  return {
    date,
    iso: `${pad(year)}-${pad(month)}-${pad(day)}`,
    time: `${pad(hour)}:${pad(minute)}`,
    dayOfWeek: date.toLocaleDateString("en-US", { weekday: "long" }),
    long: date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    monthLabel: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
  }
}

/**
 * Build an authoritative "today" block to prepend to any AI system prompt
 * so the model can never hallucinate the current date from its training data.
 */
export function buildDatePromptBlock(now: MalaysiaNow = getMalaysiaNow()): string {
  return `# REAL-TIME CLOCK (Authoritative — OVERRIDES your training data)
- Today is ${now.dayOfWeek}, ${now.long}
- ISO date: ${now.iso}
- Current month: ${now.monthLabel}
- Current time (Malaysia / KL): ${now.time}
- Timezone: ${MALAYSIA_TZ} (UTC+8)

⚠️ Your training cutoff is outdated. The real current date is **${now.iso}**. When the admin asks about "today", "this month", "this week", "now", "yesterday", or "upcoming", always compute from ${now.iso}. Never apologize for not knowing the date — it is printed here.`
}
