/**
 * Simple in-memory rate limiter for API routes
 * Tracks requests per IP with sliding window
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

interface RateLimitConfig {
  maxRequests: number   // Max requests per window
  windowMs: number      // Window in milliseconds
}

// Different limits for different route types
export const RATE_LIMITS = {
  auth: { maxRequests: 10, windowMs: 60 * 1000 },        // 10 req/min for auth
  ai: { maxRequests: 20, windowMs: 60 * 1000 },          // 20 req/min for AI
  whatsapp: { maxRequests: 30, windowMs: 60 * 1000 },    // 30 req/min for WhatsApp
  api: { maxRequests: 60, windowMs: 60 * 1000 },         // 60 req/min for general API
  session: { maxRequests: 10, windowMs: 60 * 1000 },     // 10 req/min for session
} as const

/**
 * Check rate limit for given identifier
 * Returns { limited: false } if OK, { limited: true, retryAfter } if exceeded
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMITS.api
): { limited: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  if (!entry || now > entry.resetAt) {
    // Fresh window
    rateLimitStore.set(identifier, { count: 1, resetAt: now + config.windowMs })
    return { limited: false, remaining: config.maxRequests - 1 }
  }

  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return { limited: true, remaining: 0, retryAfter }
  }

  entry.count++
  return { limited: false, remaining: config.maxRequests - entry.count }
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  const realIp = request.headers.get("x-real-ip")
  if (realIp) return realIp
  return "unknown"
}

/**
 * Create a rate-limited Response if needed
 * Returns null if not limited, or a 429 Response if limited
 */
export function rateLimitResponse(
  request: Request,
  type: keyof typeof RATE_LIMITS = "api"
): Response | null {
  const ip = getClientIP(request)
  const key = `${type}:${ip}`
  const result = checkRateLimit(key, RATE_LIMITS[type])

  if (result.limited) {
    return new Response(
      JSON.stringify({
        error: "Too many requests",
        retryAfter: result.retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(result.retryAfter || 60),
          "X-RateLimit-Remaining": "0",
        },
      }
    )
  }

  return null
}
