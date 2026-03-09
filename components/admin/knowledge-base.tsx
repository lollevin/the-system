"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Upload, FileText, Image, Table2, File, Trash2,
  Loader2, CheckCircle, XCircle, FolderOpen, Brain
} from "lucide-react"
import { toast } from "sonner"
import { useLanguage } from "@/lib/i18n"

interface KBFile {
  id: string
  file_name: string
  file_type: string
  file_size: number
  status: "processing" | "ready" | "failed"
  processing_method?: string
  created_at: string
}

export function KnowledgeBase() {
  const { t } = useLanguage()
  const [files, setFiles] = useState<KBFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/knowledge-base")
      if (res.ok) setFiles(await res.json())
    } catch {} finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchFiles() }, [fetchFiles])

  useEffect(() => {
    const hasProcessing = files.some(f => f.status === "processing")
    if (!hasProcessing) return
    const timer = setInterval(fetchFiles, 3000)
    return () => clearInterval(timer)
  }, [files, fetchFiles])

  const uploadFile = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/admin/knowledge-base", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Upload failed")
      }

      toast.success(`${file.name} uploaded!`)
      fetchFiles()
    } catch (err: any) {
      toast.error(err.message || "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const deleteFile = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return
    try {
      const res = await fetch(`/api/admin/knowledge-base?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        setFiles(prev => prev.filter(f => f.id !== id))
        toast.success("Deleted")
      }
    } catch {
      toast.error("Delete failed")
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) uploadFile(droppedFiles[0])
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) uploadFile(selected)
    e.target.value = ""
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <Image className="h-5 w-5 text-purple-500" />
    if (type.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />
    if (type.includes("sheet") || type.includes("excel") || type.includes("csv")) return <Table2 className="h-5 w-5 text-green-500" />
    if (type.includes("word") || type.includes("document")) return <FileText className="h-5 w-5 text-blue-500" />
    return <File className="h-5 w-5 text-muted-foreground" />
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return <Badge className="bg-green-500/20 text-green-600 border-0"><CheckCircle className="h-3 w-3 mr-1" />{t("admin", "kbReady")}</Badge>
      case "processing":
        return <Badge className="bg-amber-500/20 text-amber-600 border-0"><Loader2 className="h-3 w-3 mr-1 animate-spin" />{t("admin", "kbProcessing")}</Badge>
      case "failed":
        return <Badge className="bg-red-500/20 text-red-600 border-0"><XCircle className="h-3 w-3 mr-1" />{t("admin", "kbFailed")}</Badge>
      default:
        return null
    }
  }

  const readyCount = files.filter(f => f.status === "ready").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-7 w-7 text-[#8b6f47]" />
            {t("admin", "knowledgeBase")}
          </h1>
          <p className="text-muted-foreground">{t("admin", "kbDesc")}</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {readyCount} {t("admin", "kbFilesReady")}
        </Badge>
      </div>

      {/* Upload Area */}
      <Card className="border-dashed border-2 hover:border-[#8b6f47]/50 transition-colors">
        <CardContent className="p-0">
          <label
            className={`flex flex-col items-center justify-center py-12 cursor-pointer transition-colors ${
              dragOver ? "bg-[#8b6f47]/10" : "hover:bg-muted/30"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <input type="file" className="hidden" onChange={handleFileSelect} disabled={uploading} />
            {uploading ? (
              <Loader2 className="h-10 w-10 text-[#8b6f47] animate-spin mb-3" />
            ) : (
              <Upload className="h-10 w-10 text-muted-foreground mb-3" />
            )}
            <p className="text-sm font-medium">{uploading ? t("admin", "kbUploading") : t("admin", "kbDragDrop")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("admin", "kbSupportedTypes")}</p>
          </label>
        </CardContent>
      </Card>

      {/* File List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#8b6f47]" />
        </div>
      ) : files.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{t("admin", "kbEmpty")}</p>
            <p className="text-sm mt-1">{t("admin", "kbEmptyHint")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("admin", "kbUploadedFiles")} ({files.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {files.map((f) => (
                <div key={f.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                  {getFileIcon(f.file_type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{f.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatSize(f.file_size)} · {new Date(f.created_at).toLocaleDateString()}
                      {f.processing_method && ` · ${f.processing_method}`}
                    </p>
                  </div>
                  {getStatusBadge(f.status)}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-500"
                    onClick={() => deleteFile(f.id, f.file_name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
