import { createAdminClient } from "@/lib/supabase/admin"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
const API_302_BASE = "https://api.302.ai"
const AI_TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || process.env.OPENAI_MODEL || "deepseek-chat"

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
        "Search the admin's uploaded knowledge base files (PDFs, images, Excel, documents). Contains competitor data, market research, menu screenshots, business reports uploaded by admin.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "What to search for in the knowledge base, e.g. 'competitor pricing' or 'burger menu'",
          },
        },
        required: ["query"],
      },
    },
  },
]

// ---------------------------------------------------------------------------
// Tool Executors
// ---------------------------------------------------------------------------

export async function executeWebSearch(query: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    return "[Web search unavailable - OPENAI_API_KEY (302.AI) not configured]"
  }

  try {
    const res = await fetch(`${API_302_BASE}/tavily/search`, {
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
    default:
      return `[Unknown tool: ${name}]`
  }
}

// ---------------------------------------------------------------------------
// AI Call with Tool Loop
// ---------------------------------------------------------------------------

export async function aiCallWithTools({
  messages,
  maxRounds = 3,
  temperature = 0.8,
  maxTokens = 2500,
}: {
  messages: any[]
  maxRounds?: number
  temperature?: number
  maxTokens?: number
}): Promise<{ content: string; toolsUsed: string[] }> {
  const chatEndpoint = `${OPENAI_BASE_URL}/chat/completions`
  const toolsUsed: string[] = []

  for (let round = 0; round < maxRounds; round++) {
    const body: any = {
      model: AI_TEXT_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature,
    }

    if (round < maxRounds - 1) {
      body.tools = toolDefinitions
      body.tool_choice = "auto"
    }

    const res = await fetch(chatEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`AI API error ${res.status}: ${errText.slice(0, 500)}`)
    }

    const raw = await res.text()
    let data: any
    try { data = JSON.parse(raw) } catch { throw new Error("Invalid AI response JSON") }

    const choice = data.choices?.[0]
    if (!choice) throw new Error("No choice in AI response")

    const msg = choice.message
    messages.push(msg)

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      for (const tc of msg.tool_calls) {
        const fnName = tc.function.name
        let fnArgs: Record<string, any> = {}
        try { fnArgs = JSON.parse(tc.function.arguments || "{}") } catch {}

        toolsUsed.push(fnName)
        console.log(`[AI Tools] Round ${round + 1}: ${fnName}(${JSON.stringify(fnArgs)})`)

        const result = await executeTool(fnName, fnArgs)

        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: result,
        })
      }
      continue
    }

    return {
      content: msg.content || "",
      toolsUsed,
    }
  }

  const lastAssistant = messages.filter((m: any) => m.role === "assistant").pop()
  return {
    content: lastAssistant?.content || "I used all available tool rounds. Here's what I found based on the data gathered.",
    toolsUsed,
  }
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
