import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { NextRequest, NextResponse } from "next/server"

// Initialize Redis client (uses UPSTASH_REDIS_REST_URL env var)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Rate limiter for API endpoints
// Limits: Free tier = 1000/month, Pro = 100k/month, Enterprise = unlimited
export const rateLimit = {
  // Sliding window rate limiter
  detect: new Ratelimit({
    redis,
    prefix: "safeagent:ratelimit",
    limiter: Ratelimit.slidingWindow(100, "60s"), // 100 requests per minute
  }),
  // Stricter limiter for heavy operations
  scan: new Ratelimit({
    redis,
    prefix: "safeagent:ratelimit:scan",
    limiter: Ratelimit.slidingWindow(10, "60s"), // 10 requests per minute
  }),
}

// Rate limit check middleware
export async function withRateLimit(
  request: NextRequest,
  limiter: Ratelimit
): Promise<NextResponse | null> {
  const ip = request.headers.get("x-forwarded-for") ?? "anonymous"
  const apiKey = request.headers.get("x-api-key") ?? ip
  
  const { success, limit, reset, remaining } = await limiter.limit(apiKey)
  
  if (!success) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        limit,
        reset,
        remaining: 0,
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": reset.toString(),
          "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
        },
      }
    )
  }
  
  return null // Continue to handler
}
