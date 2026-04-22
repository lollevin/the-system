// Server-side language helpers for LLM prompt enforcement.
// No React imports here — safe to import inside API route handlers.

export const LOCALE_NAMES: Record<
  string,
  { tag: string; label: string; script: string }
> = {
  en:      { tag: "en-US", label: "English",                          script: "Latin script" },
  "en-US": { tag: "en-US", label: "English",                          script: "Latin script" },
  zh:      { tag: "zh-CN", label: "Simplified Chinese (简体中文)",       script: "Simplified Chinese characters only — never Traditional" },
  "zh-CN": { tag: "zh-CN", label: "Simplified Chinese (简体中文)",       script: "Simplified Chinese characters only — never Traditional" },
  ms:      { tag: "ms-MY", label: "Bahasa Melayu",                    script: "Standard Malaysian Malay (rumi)" },
  "ms-MY": { tag: "ms-MY", label: "Bahasa Melayu",                    script: "Standard Malaysian Malay (rumi)" },
}

/**
 * Resolve an incoming locale hint (from body / header / cookie) to a
 * canonical entry. Always returns a valid entry — falls back to English.
 */
export function resolveLocale(input: string | null | undefined) {
  const key = (input || "").toString().trim().slice(0, 5)
  return LOCALE_NAMES[key] || LOCALE_NAMES["en"]
}

/**
 * Build a "language lock" directive to prepend and append to every LLM
 * system prompt. Placing the constraint at both the top (primacy) and
 * bottom (recency) dramatically reduces language drift.
 */
export function buildLanguageDirective(input: string | null | undefined): string {
  const info = resolveLocale(input)
  return [
    `# 🔒 LANGUAGE LOCK — HIGHEST PRIORITY (overrides every other rule below)`,
    `CURRENT_LOCALE = ${info.tag}`,
    `You MUST produce 100% of your output in **${info.label}** using ${info.script}.`,
    ``,
    `Hard rules:`,
    `1. Every heading, bullet, label, example, customer-facing message, JSON string value, and inline comment MUST be in ${info.label}.`,
    `2. NEVER mix languages in a single sentence. Proper nouns (brand names, menu item names, currencies such as "RM") may remain in their original form — everything else must be translated.`,
    `3. If you draft any sentence in a different language, you MUST self-correct before emitting the final reply.`,
    `4. NEVER fall back to English because something is "easier" or "more natural".`,
    `5. Do not mention model names, providers, or the word "AI" as a brand — refer to yourself only as the assistant.`,
    `6. Final self-check before sending: "Is every line of my reply in ${info.label}?" If no → rewrite before responding.`,
  ].join("\n")
}

/**
 * Resolve locale from a Next.js Request, honouring body > header > cookie > default.
 * Pass the already-parsed body locale in, and the helper reads header + cookie itself.
 */
export function resolveLocaleFromRequest(
  request: Request,
  bodyLocale?: string | null
): { tag: string; label: string; script: string } {
  const headerLocale = request.headers.get("x-locale") || ""
  // Parse cookie header manually (Request doesn't expose parsed cookies)
  const cookieHeader = request.headers.get("cookie") || ""
  const cookieMatch = cookieHeader.match(/(?:^|;\s*)jpco_locale=([^;]+)/)
  const cookieLocale = cookieMatch ? decodeURIComponent(cookieMatch[1]) : ""
  return resolveLocale(bodyLocale || headerLocale || cookieLocale)
}
