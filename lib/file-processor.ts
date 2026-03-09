const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"

export type ProcessResult = {
  text: string
  method: string
}

export async function processFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<ProcessResult> {
  const ext = fileName.split(".").pop()?.toLowerCase() || ""

  if (mimeType.startsWith("image/")) {
    return processImage(buffer, mimeType)
  }

  if (mimeType === "application/pdf" || ext === "pdf") {
    return processPdf(buffer)
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel" ||
    ext === "xlsx" || ext === "xls"
  ) {
    return processExcel(buffer)
  }

  if (mimeType === "text/csv" || ext === "csv") {
    return processCsv(buffer)
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    return processDocx(buffer)
  }

  if (mimeType.startsWith("text/") || ext === "txt" || ext === "md" || ext === "json") {
    return { text: buffer.toString("utf-8").slice(0, 50000), method: "text" }
  }

  return { text: `[Unsupported file type: ${mimeType} / .${ext}]`, method: "unsupported" }
}

async function processImage(buffer: Buffer, mimeType: string): Promise<ProcessResult> {
  if (!OPENAI_API_KEY) {
    return { text: "[Cannot process image - AI API key not configured]", method: "vision-failed" }
  }

  const base64 = buffer.toString("base64")
  const dataUri = `data:${mimeType};base64,${base64}`

  try {
    const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract ALL text, data, and information from this image. Include:\n- All visible text (menus, prices, promotions, labels, headings)\n- Any numbers, dates, or statistics\n- Description of charts, tables, or visual data\n- Brand names, logos, or business information\nBe thorough and precise. Format the extracted content clearly.",
              },
              { type: "image_url", image_url: { url: dataUri, detail: "high" } },
            ],
          },
        ],
        max_tokens: 2000,
      }),
    })

    if (!res.ok) {
      return { text: `[Vision processing failed: ${res.status}]`, method: "vision-failed" }
    }

    const raw = await res.text()
    let data: any
    try { data = JSON.parse(raw) } catch { return { text: "[Invalid vision response]", method: "vision-failed" } }

    const text = data.choices?.[0]?.message?.content || "[No text extracted from image]"
    return { text, method: "gpt4o-vision" }
  } catch (err: any) {
    return { text: `[Vision error: ${err.message}]`, method: "vision-failed" }
  }
}

async function processPdf(buffer: Buffer): Promise<ProcessResult> {
  try {
    const mod: any = await import("pdf-parse")
    const pdfParse = typeof mod.default === "function" ? mod.default : mod
    const result = await pdfParse(buffer)
    return { text: result.text?.slice(0, 50000) || "[No text in PDF]", method: "pdf-parse" }
  } catch (err: any) {
    return { text: `[PDF parsing failed: ${err.message}. Try uploading as image/screenshot instead.]`, method: "pdf-failed" }
  }
}

async function processExcel(buffer: Buffer): Promise<ProcessResult> {
  try {
    const mod: any = await import("xlsx")
    const XLSX = mod.default || mod
    const workbook = XLSX.read(buffer, { type: "buffer" })
    let allText = ""

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      const csv = XLSX.utils.sheet_to_csv(sheet)
      allText += `=== Sheet: ${sheetName} ===\n${csv}\n\n`
    }

    return { text: allText.slice(0, 50000) || "[Empty spreadsheet]", method: "xlsx" }
  } catch (err: any) {
    return { text: `[Excel parsing failed: ${err.message}]`, method: "xlsx-failed" }
  }
}

function processCsv(buffer: Buffer): ProcessResult {
  const text = buffer.toString("utf-8").slice(0, 50000)
  return { text: text || "[Empty CSV]", method: "csv" }
}

async function processDocx(buffer: Buffer): Promise<ProcessResult> {
  try {
    const mod: any = await import("mammoth")
    const mammoth = mod.default || mod
    const result = await mammoth.extractRawText({ buffer })
    return { text: result.value?.slice(0, 50000) || "[No text in document]", method: "mammoth" }
  } catch (err: any) {
    return { text: `[Word parsing failed: ${err.message}]`, method: "docx-failed" }
  }
}
