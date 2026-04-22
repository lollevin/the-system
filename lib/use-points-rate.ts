"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

/**
 * Returns the current "RM per 1 point" conversion rate configured by Admin.
 * Default: 10 (meaning RM 10 = 1 point).
 * Admin edits this in /admin/settings → Rewards Points.
 */
export function usePointsRate() {
  const [rmPerPoint, setRmPerPoint] = useState<number>(10)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from("global_settings")
          .select("value")
          .eq("key", "rewards_config")
          .maybeSingle()
        if (cancelled) return
        const v = (data?.value as any)?.rm_per_point
        const parsed = Number(v)
        if (parsed > 0) setRmPerPoint(parsed)
      } catch {
        // fall back to default
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return { rmPerPoint, loading }
}
