import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ms-MY", {
    style: "currency",
    currency: "MYR",
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date))
}

export function calculatePoints(amount: number, rmPerPoint: number = 10): number {
  // Customer earns 1 point per `rmPerPoint` ringgit spent.
  // Admin can configure `rmPerPoint` in Settings → Rewards Points.
  const divisor = Number(rmPerPoint) > 0 ? Number(rmPerPoint) : 10
  return Math.floor(amount / divisor)
}

/**
 * Safe clipboard copy that works on both HTTP and HTTPS
 * Falls back to textarea selection method when clipboard API is unavailable
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Try modern Clipboard API first (requires HTTPS)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fall through to fallback
    }
  }
  
  // Fallback: textarea trick (works on HTTP)
  try {
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.style.position = "fixed"
    textarea.style.left = "-9999px"
    textarea.style.top = "-9999px"
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    const success = document.execCommand("copy")
    document.body.removeChild(textarea)
    return success
  } catch {
    return false
  }
}
