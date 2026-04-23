import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { aiCallWithTools } from "@/lib/ai-tools"
import { processFile } from "@/lib/file-processor"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const CATEGORIES = [
  "brunch",
  "rice_bowl",
  "malaysian",
  "kids",
  "coffee",
  "drinks",
  "dessert",
  "high_tea",
  "other",
]

type ParsedItem = {
  name: string
  description?: string
  price?: number
  category?: string
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
    if (callerProfile?.role !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }

    const contentType = request.headers.get("content-type") || ""
    let rawItemsText = ""
    let fileText = ""

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      rawItemsText = (formData.get("text") as string) || ""
      const file = formData.get("file") as File | null
      if (file && file.size > 0) {
        const buf = Buffer.from(await file.arrayBuffer())
        try {
          const result = await processFile(buf, file.name, file.type)
          fileText = result.text || ""
        } catch (err: any) {
          return NextResponse.json({ error: `File parse failed: ${err.message}` }, { status: 400 })
        }
      }
    } else {
      const body = await request.json().catch(() => ({}))
      rawItemsText = (body.text as string) || ""
    }

    if (!rawItemsText && !fileText) {
      return NextResponse.json({ error: "Provide either text list or a file" }, { status: 400 })
    }

    // Ask AI to convert raw input into a clean JSON list with category assigned
    const combinedInput = [
      rawItemsText ? `ADMIN INPUT (comma or newline-separated list):\n${rawItemsText}` : "",
      fileText ? `EXTRACTED FILE CONTENT:\n${fileText.slice(0, 15000)}` : "",
    ]
      .filter(Boolean)
      .join("\n\n---\n\n")

    const systemPrompt = `You are a menu parser for a Malaysian F&B restaurant (JP&Co — burgers, cakes, artisan coffee, casual dining).
Given the admin's raw text or extracted menu file content, extract a CLEAN list of menu items.

For EACH item, output JSON with:
- name: short item name (English, title case, no emoji, no pricing suffix)
- description: 1-sentence description. If unknown, use empty string. Use your food knowledge to write a plausible short description.
- price: numeric RM price if present in the input, else 0
- category: EXACTLY one of ${CATEGORIES.join(", ")} — pick the best fit based on item name
  * brunch: eggs, toast, pancakes, waffles, breakfast plates
  * rice_bowl: rice bowls, rice plates
  * malaysian: nasi lemak, mee goreng, laksa, local dishes
  * kids: kid-sized portions, kids meal
  * coffee: latte, cappuccino, espresso, mocha, americano
  * drinks: juice, soft drink, milkshake, tea, smoothie (non-coffee beverages)
  * dessert: cake, ice cream, pudding, sweet dishes
  * high_tea: afternoon tea sets, finger sandwiches, scones
  * other: anything else (burgers, pasta, sides, appetizers)

Rules:
- Skip section headers, footer text, prices-only lines, and duplicates.
- If the input is a plain comma-separated list like "Classic Burger, Iced Latte", still produce one entry per food.
- Never output commentary, just JSON.

Respond with ONLY a JSON object:
{ "items": [ { "name": "...", "description": "...", "price": 0, "category": "..." } ] }`

    const aiResult = await aiCallWithTools({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: combinedInput },
      ],
      maxRounds: 2,
      temperature: 0.2,
      maxTokens: 3000,
      retries: 2,
      timeoutMs: 25000,
      totalBudgetMs: 55000,
    })

    let items: ParsedItem[] = []
    const raw = aiResult.content || ""
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        if (Array.isArray(parsed.items)) items = parsed.items
      } catch {}
    }

    // Basic sanitization
    items = items
      .filter(i => i && typeof i.name === "string" && i.name.trim().length > 0)
      .map(i => ({
        name: i.name.trim().slice(0, 120),
        description: (i.description || "").slice(0, 500),
        price: Number.isFinite(Number(i.price)) ? Math.max(0, Number(i.price)) : 0,
        category: CATEGORIES.includes((i.category || "").toLowerCase())
          ? (i.category as string).toLowerCase()
          : "other",
      }))

    if (items.length === 0) {
      return NextResponse.json(
        { error: "AI could not extract any menu items from the input" },
        { status: 400 }
      )
    }

    // Insert all items
    const admin = createAdminClient()
    const rowsToInsert = items.map(i => ({
      name: i.name,
      description: i.description || "",
      price: i.price || 0,
      category: i.category,
      is_active: true,
      image_url: null,
    }))

    const { data: inserted, error: insertError } = await admin
      .from("menu_items")
      .insert(rowsToInsert)
      .select()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      inserted_count: inserted?.length || 0,
      items: inserted,
    })
  } catch (err: any) {
    console.error("[Menu Batch Add] Error:", err)
    return NextResponse.json({ error: err?.message || "unknown error" }, { status: 500 })
  }
}
