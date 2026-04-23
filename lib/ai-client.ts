import { toolDefinitions, executeTool } from "./ai-tools"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
const AI_TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || process.env.OPENAI_MODEL || "gpt-4o"
const CHAT_ENDPOINT = `${OPENAI_BASE_URL}/chat/completions`

// Primary + fallback chain. Provider-specific notes belong in README,
// NOT in shipped comments or strings.
const FALLBACK_MODELS = [
  AI_TEXT_MODEL,
  "gpt-4o-mini",
  "gpt-3.5-turbo",
  "deepseek-chat",
].filter((v, i, a) => a.indexOf(v) === i)

const RETRY_ON_STATUS = new Set([408, 429, 500, 502, 503, 504])

export interface AIResponse {
  content: string
  toolsUsed?: string[]
  model?: string
}

export interface AICallOptions {
  messages: any[]
  temperature?: number
  maxTokens?: number
  jsonMode?: boolean
  maxRetries?: number
  withTools?: boolean
  maxToolRounds?: number
  timeoutMs?: number
  totalBudgetMs?: number
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function callChatOnce(
  model: string,
  messages: any[],
  opts: { temperature?: number; maxTokens?: number; jsonMode?: boolean; tools?: any; timeoutMs: number }
): Promise<{ ok: true; data: any } | { ok: false; status: number; error: string; retryable: boolean }> {
  if (!OPENAI_API_KEY) {
    return { ok: false, status: 0, error: "OPENAI_API_KEY not configured", retryable: false }
  }

  const body: any = {
    model,
    messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 2000,
  }
  if (opts.jsonMode) {
    body.response_format = { type: "json_object" }
  }
  if (opts.tools) {
    body.tools = opts.tools
    body.tool_choice = "auto"
  }

  try {
    const res = await fetchWithTimeout(
      CHAT_ENDPOINT,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify(body),
        cache: "no-store",
        // @ts-ignore - Next.js extends fetch with this option
        next: { revalidate: 0 },
      } as any,
      opts.timeoutMs
    )

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      const retryable = RETRY_ON_STATUS.has(res.status)
      return {
        ok: false,
        status: res.status,
        error: `AI API ${res.status}: ${errText.slice(0, 300) || res.statusText}`,
        retryable,
      }
    }

    const raw = await res.text()
    let data: any
    try {
      data = JSON.parse(raw)
    } catch {
      return { ok: false, status: 200, error: "Invalid JSON from AI provider", retryable: true }
    }

    return { ok: true, data }
  } catch (err: any) {
    const msg = err?.name === "AbortError" ? "AI request timed out" : err?.message || "Network error"
    return { ok: false, status: 0, error: msg, retryable: true }
  }
}

/**
 * Call AI chat with automatic retry on 5xx / timeouts and fallback to alternative models.
 */
export async function callAI(options: AICallOptions): Promise<AIResponse> {
  const {
    messages,
    temperature = 0.7,
    maxTokens = 2000,
    jsonMode = false,
    maxRetries = 2,
    withTools = false,
    maxToolRounds = 2,
    timeoutMs = 20000,
    totalBudgetMs = 50000,
  } = options

  if (withTools) {
    return callAIWithTools({ messages, temperature, maxTokens, maxRetries, maxRounds: maxToolRounds, timeoutMs, totalBudgetMs })
  }

  const errors: string[] = []
  const startTime = Date.now()
  const isOutOfTime = () => Date.now() - startTime > totalBudgetMs

  for (const model of FALLBACK_MODELS) {
    if (isOutOfTime()) {
      errors.push(`Out of time budget before trying ${model}`)
      break
    }
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (isOutOfTime()) {
        errors.push(`[${model}] out of time budget`)
        break
      }
      const result = await callChatOnce(model, messages, { temperature, maxTokens, jsonMode, timeoutMs })

      if (result.ok) {
        const choice = result.data?.choices?.[0]
        const content = choice?.message?.content || ""
        if (content) {
          return { content, model }
        }
        errors.push(`[${model}] empty response`)
        break
      }

      errors.push(`[${model}] attempt ${attempt + 1}: ${result.error}`)

      if (!result.retryable) {
        break
      }

      const backoff = Math.min(500 * Math.pow(2, attempt), 3000)
      await sleep(backoff)
    }
  }

  throw new Error(`All AI attempts failed. ${errors.slice(-3).join(" | ")}`)
}

async function callAIWithTools({
  messages,
  temperature,
  maxTokens,
  maxRetries,
  maxRounds,
  timeoutMs,
  totalBudgetMs,
}: {
  messages: any[]
  temperature: number
  maxTokens: number
  maxRetries: number
  maxRounds: number
  timeoutMs: number
  totalBudgetMs: number
}): Promise<AIResponse> {
  const toolsUsed: string[] = []
  const errors: string[] = []
  let chosenModel: string | null = null
  const startTime = Date.now()
  const isOutOfTime = () => Date.now() - startTime > totalBudgetMs

  for (const model of FALLBACK_MODELS) {
    if (isOutOfTime()) break
    let failed = false

    for (let round = 0; round < maxRounds; round++) {
      if (isOutOfTime()) {
        failed = true
        break
      }
      const tools = round < maxRounds - 1 ? toolDefinitions : undefined

      let result: any = null
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        result = await callChatOnce(model, messages, {
          temperature,
          maxTokens,
          tools,
          timeoutMs,
        })
        if (result.ok || !result.retryable) break
        errors.push(`[${model}] round ${round + 1} attempt ${attempt + 1}: ${result.error}`)
        const backoff = Math.min(1000 * Math.pow(2, attempt), 8000)
        await sleep(backoff)
      }

      if (!result || !result.ok) {
        errors.push(`[${model}] round ${round + 1} final: ${result?.error || "unknown"}`)
        failed = true
        break
      }

      const choice = result.data?.choices?.[0]
      if (!choice) {
        failed = true
        break
      }

      const msg = choice.message
      messages.push(msg)

      if (msg.tool_calls && msg.tool_calls.length > 0) {
        for (const tc of msg.tool_calls) {
          const fnName = tc.function.name
          let fnArgs: Record<string, any> = {}
          try {
            fnArgs = JSON.parse(tc.function.arguments || "{}")
          } catch {}
          toolsUsed.push(fnName)

          const toolResult = await executeTool(fnName, fnArgs)
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: toolResult,
          })
        }
        continue
      }

      chosenModel = model
      return { content: msg.content || "", toolsUsed, model }
    }

    if (!failed) break
  }

  throw new Error(`All AI attempts failed (tools). ${errors.slice(-3).join(" | ")}`)
}

/**
 * Quick ping to verify AI provider is reachable.
 */
export async function pingAI(): Promise<{ ok: boolean; model?: string; error?: string; latencyMs?: number }> {
  const start = Date.now()
  try {
    const r = await callAI({
      messages: [{ role: "user", content: "Hi" }],
      temperature: 0,
      maxTokens: 5,
      maxRetries: 1,
      timeoutMs: 25000,
      totalBudgetMs: 45000,
    })
    return { ok: true, model: r.model, latencyMs: Date.now() - start }
  } catch (err: any) {
    return { ok: false, error: err.message || "Unknown error", latencyMs: Date.now() - start }
  }
}

export { FALLBACK_MODELS, AI_TEXT_MODEL as PRIMARY_MODEL }
