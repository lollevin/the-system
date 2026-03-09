"use client"

import { Toaster } from "sonner"
import { useEffect, useState } from "react"

export function ToasterProvider() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return <Toaster position="top-center" richColors />
}
