"use client"

import { Toaster } from "@/components/ui/toaster"
import { useEffect, useState } from "react"

export function UIToasterProvider() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return <Toaster />
}
