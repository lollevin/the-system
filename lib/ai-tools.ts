import { createAdminClient } from "@/lib/supabase/admin"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
// Tool gateway base URL — kept in env so the provider can be swapped
// without code changes. Default points to the configured upstream.
const TOOL_GATEWAY_BASE = process.env.AI_TOOL_GATEWAY_BASE || "https://api.302.ai"
const AI_TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini"

const FALLBACK_MODELS = [
  AI_TEXT_MODEL,
  "gpt-4o-mini",
  "gpt-3.5-turbo",
  "deepseek-chat",
].filter((v, i, a) => a.indexOf(v) === i)

const RETRY_STATUS = new Set([408, 429, 500, 502, 503, 504])

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
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

// ---------------------------------------------------------------------------
// Tool Definitions (OpenAI function calling format)
// ---------------------------------------------------------------------------

export const toolDefinitions = [
  {
    type: "function" as const,
    function: {
      name: "web_search",
      description:
        "Search the internet for real-time information. Use for competitor promotions, market trends, food delivery prices, news, or any live data. Returns top search results with snippets.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Search query. Be specific, e.g. 'KFC Bukit Jalil KL promotions 2026' or 'best burger deals Bukit Jalil Malaysia'",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "scrape_url",
      description:
        "Fetch and read the text content of a webpage. Use for reading competitor websites, GrabFood/FoodPanda listings, restaurant menus, social media pages, or any URL.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "Full URL to scrape, e.g. 'https://www.kfc.com.my/promotions'",
          },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_knowledge_base",
      description:
        "Search the admin's uploaded knowledge base files (PDFs, images, Excel, documents). Contains competitor data, market research, menu screenshots, POS exports, campaign files, business reports uploaded by admin. ALWAYS call this tool when the admin asks about files, uploaded data, POS reports, campaign history, or any data that might be in uploaded files.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "What to search for in the knowledge base, e.g. 'competitor pricing', 'burger menu', 'POS sales', 'campaign results'. Use short keywords — the tool does fuzzy matching.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_knowledge_base_files",
      description:
        "List ALL files the admin has uploaded to the knowledge base (file names, types, status, uploaded date). Use this when admin asks 'do you have my file', 'what files did I upload', or wants an overview of uploaded data.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_voucher",
      description:
        "ACTUALLY CREATE a voucher in the database. Use this when admin approves a voucher idea or asks you to create one. For 'personal' vouchers, it will also be auto-assigned to the target customer's account so they see it in their app. Do NOT just say 'OK I'll create it' — ALWAYS call this tool to actually make it happen.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Voucher display name, e.g. 'Birthday Special', 'Win-back 20% Off'",
          },
          description: {
            type: "string",
            description: "Short description visible to customer",
          },
          discount_type: {
            type: "string",
            enum: ["percentage", "fixed"],
            description: "'percentage' for % off, 'fixed' for RM amount off",
          },
          discount_value: {
            type: "number",
            description: "Discount amount. If percentage type, 10 means 10% off. If fixed, 10 means RM10 off.",
          },
          voucher_type: {
            type: "string",
            enum: ["global", "personal"],
            description: "'global' = available to all customers who have enough points. 'personal' = exclusive to one customer (auto-assigned to their account).",
          },
          target_customer_id: {
            type: "string",
            description: "Required if voucher_type='personal'. The UUID of the target customer from the customer list.",
          },
          points_required: {
            type: "number",
            description: "Points needed to redeem. Use 0 for free personal vouchers (gift). Default 100 for global.",
          },
          valid_days: {
            type: "number",
            description: "How many days the voucher is valid from now. Default 30.",
          },
          code: {
            type: "string",
            description: "Optional voucher code prefix. If omitted, one is auto-generated.",
          },
        },
        required: ["name", "discount_type", "discount_value", "voucher_type"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_customer_details",
      description:
        "Get DEEP details about a specific customer: full transaction history, visit pattern, favorite day/time, average spend, point history, voucher usage. Use this when admin asks about a specific customer or you need to understand their habits before crafting a personalized message. Pass either customer_id (UUID) or phone number.",
      parameters: {
        type: "object",
        properties: {
          customer_id: {
            type: "string",
            description: "Customer UUID (preferred, from the customer list in context)",
          },
          phone: {
            type: "string",
            description: "Phone number if UUID is unknown (e.g. '60123456789' or '0123456789')",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "save_memory",
      description:
        "Save an important fact, preference, or insight to long-term memory so you remember it across all future conversations, even after chat restarts. Use this for: (1) business facts admin tells you ('we open 10am-10pm', 'our specialty is beef burger'), (2) customer preferences you learned ('Maco loves coffee', 'Yeoh is a VIP'), (3) campaign lessons ('Tuesday voucher worked 3x better'), (4) strategic decisions. Be concise — one important fact per memory.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "One of: 'business_fact', 'customer_insight', 'campaign_lesson', 'preference', 'strategy', 'other'",
          },
          content: {
            type: "string",
            description: "The memory content, written as a clear standalone statement (max 400 chars)",
          },
          key: {
            type: "string",
            description: "Optional short key (e.g. customer name, topic) for easier retrieval",
          },
          importance: {
            type: "number",
            description: "1 (minor) to 10 (critical). Default 5.",
          },
        },
        required: ["category", "content"],
      },
    },
  },
]

// ---------------------------------------------------------------------------
// Tool Executors
// ---------------------------------------------------------------------------

export async function executeWebSearch(query: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    return "[Web search unavailable - AI API key not configured]"
  }

  try {
    const res = await fetch(`${TOOL_GATEWAY_BASE}/tavily/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        api_key: OPENAI_API_KEY,
        query,
        search_depth: "basic",
        max_results: 5,
        include_answer: true,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return `[Search failed: ${res.status} - ${errText.slice(0, 200)}]`
    }

    const data = await res.json()
    let result = ""

    if (data.answer) {
      result += `**AI Summary:** ${data.answer}\n\n`
    }

    if (data.results && data.results.length > 0) {
      result += "**Search Results:**\n"
      for (const r of data.results.slice(0, 5)) {
        result += `- **${r.title}** (${r.url})\n  ${r.content?.slice(0, 300) || "No snippet"}\n\n`
      }
    }

    return result || "[No results found]"
  } catch (err: any) {
    return `[Search error: ${err.message}]`
  }
}

export async function executeScrapeUrl(url: string): Promise<string> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; JPCoBot/1.0)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!res.ok) {
      return `[Failed to fetch URL: ${res.status} ${res.statusText}]`
    }

    const html = await res.text()
    const text = htmlToText(html)
    const trimmed = text.slice(0, 4000)

    return trimmed || "[Page returned no readable content]"
  } catch (err: any) {
    return `[Scrape error: ${err.message}]`
  }
}

export async function executeSearchKnowledgeBase(query: string): Promise<string> {
  try {
    const admin = createAdminClient()
    const { data: files, error } = await admin
      .from("knowledge_base")
      .select("file_name, extracted_text, file_type, created_at")
      .eq("status", "ready")
      .order("created_at", { ascending: false })

    if (error || !files || files.length === 0) {
      return "[Knowledge base is empty. Admin has not uploaded any files yet.]"
    }

    const queryLower = query.toLowerCase()
    const keywords = queryLower.split(/\s+/).filter(w => w.length > 2)

    const scored = files
      .map(f => {
        const text = (f.extracted_text || "").toLowerCase()
        const name = (f.file_name || "").toLowerCase()
        let score = 0
        for (const kw of keywords) {
          if (text.includes(kw)) score += 2
          if (name.includes(kw)) score += 3
        }
        return { ...f, score }
      })
      .filter(f => f.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)

    if (scored.length === 0) {
      const allFiles = files.map(f => `- ${f.file_name} (${f.file_type})`).join("\n")
      return `[No matching content found for "${query}". Available files:\n${allFiles}]`
    }

    let result = `**Knowledge Base Results for "${query}":**\n\n`
    for (const f of scored) {
      const snippet = f.extracted_text?.slice(0, 1500) || "No text"
      result += `--- **${f.file_name}** (${f.file_type}) ---\n${snippet}\n\n`
    }

    return result.slice(0, 6000)
  } catch (err: any) {
    return `[Knowledge base error: ${err.message}]`
  }
}

export async function executeListKnowledgeBaseFiles(): Promise<string> {
  try {
    const admin = createAdminClient()
    const { data: files } = await admin
      .from("knowledge_base")
      .select("file_name, file_type, status, created_at")
      .order("created_at", { ascending: false })
      .limit(100)

    if (!files || files.length === 0) {
      return "[Knowledge base is empty. Admin has not uploaded any files yet.]"
    }

    const lines = files.map((f: any) => {
      const when = new Date(f.created_at).toLocaleDateString()
      return `- ${f.file_name} (${f.file_type || "unknown"}) — ${f.status || "ready"} — uploaded ${when}`
    })
    return `**Knowledge Base Files (${files.length} total):**\n${lines.join("\n")}`
  } catch (err: any) {
    return `[Knowledge base error: ${err.message}]`
  }
}

export async function executeSaveMemory(args: {
  category: string
  content: string
  key?: string
  importance?: number
}): Promise<string> {
  try {
    const admin = createAdminClient()
    const importance = Math.min(10, Math.max(1, Number(args.importance) || 5))
    const content = (args.content || "").slice(0, 1200)
    if (!content) return "[Memory not saved: content is empty]"
    const { error } = await admin.from("ai_memories").insert({
      category: args.category || "other",
      key: args.key || null,
      content,
      importance,
    })
    if (error) return `[Memory save failed: ${error.message}]`
    return `[Memory saved: "${content.slice(0, 80)}${content.length > 80 ? "..." : ""}"]`
  } catch (err: any) {
    return `[Memory error: ${err.message}]`
  }
}

export async function executeCreateVoucher(args: {
  name: string
  description?: string
  discount_type: "percentage" | "fixed"
  discount_value: number
  voucher_type: "global" | "personal"
  target_customer_id?: string
  points_required?: number
  valid_days?: number
  code?: string
}): Promise<string> {
  try {
    const admin = createAdminClient()
    const validDays = Math.max(1, Math.min(365, Number(args.valid_days) || 30))
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + validDays)

    const rawCode = (args.code || args.name || "VCH").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "VCH"
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase()
    const code = args.voucher_type === "personal" ? `${rawCode}${suffix}` : (args.code ? args.code.toUpperCase() : `${rawCode}${suffix}`)

    const pointsRequired = args.voucher_type === "personal"
      ? (typeof args.points_required === "number" ? args.points_required : 0)
      : (typeof args.points_required === "number" ? args.points_required : 100)

    const voucherData: any = {
      code,
      name: args.name,
      description: args.description || args.name,
      points_required: pointsRequired,
      discount_type: args.discount_type,
      discount_value: args.discount_value,
      valid_until: validUntil.toISOString(),
      is_active: true,
      max_uses: 1,
      voucher_type: args.voucher_type,
    }

    let customerName: string | undefined
    if (args.voucher_type === "personal") {
      if (!args.target_customer_id) {
        return "[Voucher NOT created: personal vouchers require target_customer_id. Ask the admin which customer to target.]"
      }
      const { data: cust } = await admin
        .from("profiles")
        .select("id, full_name")
        .eq("id", args.target_customer_id)
        .maybeSingle()
      if (!cust) {
        return `[Voucher NOT created: customer_id ${args.target_customer_id} not found. Re-check the UUID from the customer list.]`
      }
      customerName = cust.full_name || "customer"
      voucherData.target_customer_id = args.target_customer_id
    }

    const { data: v, error } = await admin
      .from("vouchers")
      .insert(voucherData)
      .select()
      .single()

    if (error) {
      return `[Voucher creation failed: ${error.message}]`
    }

    if (args.voucher_type === "personal" && args.target_customer_id) {
      await admin.from("user_vouchers").insert({
        user_id: args.target_customer_id,
        voucher_id: v.id,
        code,
        expires_at: validUntil.toISOString(),
        is_used: false,
      })
    }

    const discountText = args.discount_type === "percentage"
      ? `${args.discount_value}% off`
      : `RM${args.discount_value} off`

    return `[✅ Voucher CREATED successfully!\n- Name: ${args.name}\n- Code: ${code}\n- Discount: ${discountText}\n- Type: ${args.voucher_type}${customerName ? ` (assigned to ${customerName})` : ""}\n- Valid until: ${validUntil.toLocaleDateString()}\n- Points required: ${pointsRequired}\n\nThe voucher is now LIVE in the Rewards page and customer app.]`
  } catch (err: any) {
    return `[Voucher creation error: ${err.message}]`
  }
}

export async function executeGetCustomerDetails(args: {
  customer_id?: string
  phone?: string
}): Promise<string> {
  try {
    const admin = createAdminClient()
    let query = admin.from("profiles").select("*").eq("role", "customer")
    if (args.customer_id) {
      query = query.eq("id", args.customer_id)
    } else if (args.phone) {
      const digits = args.phone.replace(/\D/g, "")
      query = query.or(`phone.eq.${args.phone},phone.eq.${digits},phone.eq.60${digits.replace(/^0/, "")}`)
    } else {
      return "[Provide customer_id or phone]"
    }

    const { data: profiles } = await query.limit(1)
    const customer = profiles?.[0]
    if (!customer) return "[Customer not found]"

    const { data: txs } = await admin
      .from("transactions")
      .select("type, points, amount, created_at, reason")
      .eq("user_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(30)

    const { data: uvs } = await admin
      .from("user_vouchers")
      .select("code, is_used, created_at, expires_at, voucher:vouchers(name, discount_type, discount_value)")
      .eq("user_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(10)

    const earnTxs = (txs || []).filter(t => t.type === "earn")
    const redeemTxs = (txs || []).filter(t => t.type === "redeem")
    const totalSpend = earnTxs.reduce((s, t) => s + (t.amount || 0), 0)
    const visitCount = earnTxs.length
    const avgSpend = visitCount > 0 ? (totalSpend / visitCount).toFixed(2) : "0"

    // Day-of-week pattern
    const dayCounts: Record<string, number> = {}
    for (const tx of earnTxs) {
      const d = new Date(tx.created_at).toLocaleDateString("en-US", { weekday: "short" })
      dayCounts[d] = (dayCounts[d] || 0) + 1
    }
    const favDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown"

    const firstVisit = earnTxs[earnTxs.length - 1]?.created_at
    const lastVisit = earnTxs[0]?.created_at
    const daysSinceLast = lastVisit
      ? Math.floor((Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24))
      : null

    const { data: mems } = await admin
      .from("ai_memories")
      .select("content, category, importance")
      .or(`key.eq.${customer.full_name || "___"},key.eq.${customer.id}`)
      .order("importance", { ascending: false })
      .limit(10)

    let result = `**Customer Profile: ${customer.full_name || "Unknown"}**\n`
    result += `- ID: ${customer.id}\n`
    result += `- Phone: ${customer.phone || "N/A"}\n`
    result += `- Birthday: ${customer.birthday || "unknown"}\n`
    result += `- Tier: ${customer.tier || "bronze"} | Points: ${customer.points_balance || 0}\n`
    result += `- Total spent: RM${(customer.total_spent || 0).toFixed(2)} across ${visitCount} visits\n`
    result += `- Avg per visit: RM${avgSpend}\n`
    result += `- Favorite day: ${favDay}\n`
    result += `- First visit: ${firstVisit ? new Date(firstVisit).toLocaleDateString() : "never"}\n`
    result += `- Last visit: ${lastVisit ? new Date(lastVisit).toLocaleDateString() : "never"}${daysSinceLast !== null ? ` (${daysSinceLast} days ago)` : ""}\n`
    result += `- Redemptions: ${redeemTxs.length}\n\n`

    if (mems && mems.length > 0) {
      result += `**Saved memories about this customer:**\n`
      for (const m of mems) result += `- [${m.category}] ${m.content}\n`
      result += `\n`
    }

    if (uvs && uvs.length > 0) {
      result += `**Recent vouchers (last 10):**\n`
      for (const uv of uvs) {
        const vRaw = uv.voucher as any
        const v = Array.isArray(vRaw) ? vRaw[0] : vRaw
        const vName = v?.name || "—"
        result += `- ${vName} (${uv.code}) ${uv.is_used ? "✅ used" : "⏳ unused"} exp ${new Date(uv.expires_at).toLocaleDateString()}\n`
      }
      result += `\n`
    }

    if (txs && txs.length > 0) {
      result += `**Last 10 transactions:**\n`
      for (const tx of txs.slice(0, 10)) {
        const when = new Date(tx.created_at).toLocaleDateString()
        const type = tx.type === "earn" ? `+${tx.points}pts (RM${tx.amount})` : tx.type === "redeem" ? `-${tx.points}pts` : tx.type
        result += `- [${when}] ${type} ${tx.reason ? `— ${tx.reason}` : ""}\n`
      }
    }

    return result
  } catch (err: any) {
    return `[Customer details error: ${err.message}]`
  }
}

// ---------------------------------------------------------------------------
// Tool Router
// ---------------------------------------------------------------------------

export async function executeTool(
  name: string,
  args: Record<string, any>
): Promise<string> {
  switch (name) {
    case "web_search":
      return executeWebSearch(args.query || "")
    case "scrape_url":
      return executeScrapeUrl(args.url || "")
    case "search_knowledge_base":
      return executeSearchKnowledgeBase(args.query || "")
    case "list_knowledge_base_files":
      return executeListKnowledgeBaseFiles()
    case "save_memory":
      return executeSaveMemory({
        category: args.category || "other",
        content: args.content || "",
        key: args.key,
        importance: args.importance,
      })
    case "create_voucher":
      return executeCreateVoucher({
        name: args.name || "AI Voucher",
        description: args.description,
        discount_type: (args.discount_type === "fixed" ? "fixed" : "percentage"),
        discount_value: Number(args.discount_value) || 10,
        voucher_type: (args.voucher_type === "personal" ? "personal" : "global"),
        target_customer_id: args.target_customer_id,
        points_required: args.points_required,
        valid_days: args.valid_days,
        code: args.code,
      })
    case "get_customer_details":
      return executeGetCustomerDetails({
        customer_id: args.customer_id,
        phone: args.phone,
      })
    default:
      return `[Unknown tool: ${name}]`
  }
}

// ---------------------------------------------------------------------------
// AI Call with Tool Loop
// ---------------------------------------------------------------------------

async function callChatWithRetry(
  model: string,
  messages: any[],
  options: { temperature: number; maxTokens: number; useTools: boolean; timeoutMs: number; retries: number }
): Promise<{ ok: true; data: any } | { ok: false; error: string; retryable: boolean; status: number }> {
  const chatEndpoint = `${OPENAI_BASE_URL}/chat/completions`
  let lastError = "unknown"
  let lastStatus = 0
  let lastRetryable = true

  for (let attempt = 0; attempt < options.retries; attempt++) {
    const body: any = {
      model,
      messages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
    }
    if (options.useTools) {
      body.tools = toolDefinitions
      body.tool_choice = "auto"
    }

    try {
      const res = await fetchWithTimeout(
        chatEndpoint,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify(body),
          cache: "no-store",
          // @ts-ignore - Next.js extends fetch
          next: { revalidate: 0 },
        } as any,
        options.timeoutMs
      )

      if (!res.ok) {
        lastStatus = res.status
        const errText = await res.text().catch(() => "")
        lastError = `AI API ${res.status}: ${errText.slice(0, 300) || res.statusText}`
        lastRetryable = RETRY_STATUS.has(res.status)
        if (!lastRetryable) return { ok: false, error: lastError, retryable: false, status: res.status }
        const backoff = Math.min(1000 * Math.pow(2, attempt), 8000)
        console.warn(`[AI] ${model} attempt ${attempt + 1} failed (${res.status}), retrying in ${backoff}ms`)
        await sleep(backoff)
        continue
      }

      const raw = await res.text()
      try {
        return { ok: true, data: JSON.parse(raw) }
      } catch {
        lastError = "Invalid JSON response"
        lastRetryable = true
        await sleep(1000)
        continue
      }
    } catch (err: any) {
      lastError = err?.name === "AbortError" ? "Timeout" : err?.message || "Network error"
      lastRetryable = true
      const backoff = Math.min(1000 * Math.pow(2, attempt), 8000)
      console.warn(`[AI] ${model} attempt ${attempt + 1} error: ${lastError}, retrying in ${backoff}ms`)
      await sleep(backoff)
    }
  }

  return { ok: false, error: lastError, retryable: lastRetryable, status: lastStatus }
}

export async function aiCallWithTools({
  messages,
  maxRounds = 3,
  temperature = 0.8,
  maxTokens = 2500,
  retries = 3,
  timeoutMs = 45000,
  totalBudgetMs = 50000,
}: {
  messages: any[]
  maxRounds?: number
  temperature?: number
  maxTokens?: number
  retries?: number
  timeoutMs?: number
  totalBudgetMs?: number
}): Promise<{ content: string; toolsUsed: string[]; model?: string }> {
  const toolsUsed: string[] = []
  const errors: string[] = []
  const startTime = Date.now()
  const isOutOfTime = () => Date.now() - startTime > totalBudgetMs

  for (const model of FALLBACK_MODELS) {
    if (isOutOfTime()) {
      errors.push(`Out of time budget before trying ${model}`)
      break
    }
    let hasError = false

    for (let round = 0; round < maxRounds; round++) {
      if (isOutOfTime()) {
        errors.push(`[${model}] out of time budget at round ${round + 1}`)
        hasError = true
        break
      }
      const useTools = round < maxRounds - 1
      const result = await callChatWithRetry(model, messages, {
        temperature,
        maxTokens,
        useTools,
        timeoutMs,
        retries,
      })

      if (!result.ok) {
        errors.push(`[${model}] round ${round + 1}: ${result.error}`)
        hasError = true
        break
      }

      const choice = result.data.choices?.[0]
      if (!choice) {
        errors.push(`[${model}] no choice in response`)
        hasError = true
        break
      }

      const msg = choice.message
      messages.push(msg)

      if (msg.tool_calls && msg.tool_calls.length > 0) {
        for (const tc of msg.tool_calls) {
          const fnName = tc.function.name
          let fnArgs: Record<string, any> = {}
          try { fnArgs = JSON.parse(tc.function.arguments || "{}") } catch {}

          toolsUsed.push(fnName)
          console.log(`[AI Tools] Round ${round + 1}: ${fnName}(${JSON.stringify(fnArgs)})`)

          const toolResult = await executeTool(fnName, fnArgs)

          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: toolResult,
          })
        }
        continue
      }

      return {
        content: msg.content || "",
        toolsUsed,
        model,
      }
    }

    if (!hasError) {
      const lastAssistant = messages.filter((m: any) => m.role === "assistant").pop()
      return {
        content: lastAssistant?.content || "I used all available tool rounds.",
        toolsUsed,
        model,
      }
    }
  }

  throw new Error(`All AI models failed. ${errors.slice(-3).join(" | ")}`)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#\d+;/g, "")
    .replace(/\s+/g, " ")
    .trim()
}
