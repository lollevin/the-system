import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { processFile } from "@/lib/file-processor"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const admin = createAdminClient()
  const { data: files, error } = await admin
    .from("knowledge_base")
    .select("id, file_name, file_type, file_size, status, processing_method, created_at")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(files || [])
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 })
    }

    const admin = createAdminClient()
    const storagePath = `${user.id}/${Date.now()}-${file.name}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await admin.storage
      .from("knowledge-base")
      .upload(storagePath, buffer, { contentType: file.type, upsert: false })

    if (uploadError) {
      console.error("[KB Upload] Storage error:", uploadError)
    }

    const { data: record, error: insertError } = await admin
      .from("knowledge_base")
      .insert({
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        status: "processing",
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    processFileAsync(admin, record.id, buffer, file.name, file.type)

    return NextResponse.json({ id: record.id, status: "processing" })
  } catch (err: any) {
    console.error("[KB Upload] Error:", err)
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 })
  }
}

async function processFileAsync(
  admin: ReturnType<typeof createAdminClient>,
  recordId: string,
  buffer: Buffer,
  fileName: string,
  mimeType: string
) {
  try {
    const result = await processFile(buffer, fileName, mimeType)
    await admin
      .from("knowledge_base")
      .update({
        extracted_text: result.text,
        processing_method: result.method,
        status: result.method.includes("failed") ? "failed" : "ready",
      })
      .eq("id", recordId)
  } catch (err: any) {
    console.error("[KB Process] Error:", err)
    await admin
      .from("knowledge_base")
      .update({ status: "failed", extracted_text: `Processing error: ${err.message}` })
      .eq("id", recordId)
  }
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const admin = createAdminClient()

  const { data: file } = await admin.from("knowledge_base").select("storage_path").eq("id", id).single()
  if (file?.storage_path) {
    await admin.storage.from("knowledge-base").remove([file.storage_path])
  }

  const { error } = await admin.from("knowledge_base").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
