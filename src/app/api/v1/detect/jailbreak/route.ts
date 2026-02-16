import { auth } from "@/auth"
import { detectJailbreak } from "@/lib/jailbreak"
import { rateLimit, withRateLimit } from "@/lib/ratelimit"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const jailbreakRequestSchema = z.object({
  content: z.string().min(1).max(10000),
  options: z
    .object({
      threshold: z.number().min(0).max(1).optional(),
      returnScore: z.boolean().optional(),
    })
    .optional(),
})

/**
 * POST /api/v1/detect/jailbreak
 * Detect potential jailbreak attempts in user input
 * 
 * Request body:
 * {
 *   "content": "string to analyze",
 *   "options": {
 *     "threshold": 0.7,      // optional, default 0.5
 *     "returnScore": true    // optional, default false
 *   }
 * }
 * 
 * Response (detected):
 * {
 *   "detected": true,
 *   "score": 0.85,
 *   "confidence": "high",
 *   "patterns": ["role_override", "system_prompt_injection"]
 * }
 * 
 * Response (not detected):
 * {
 *   "detected": false,
 *   "score": 0.15,
 *   "confidence": "low"
 * }
 */
export async function POST(request: NextRequest) {
  // Check authentication
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Valid API key required" },
      { status: 401 }
    )
  }

  // Rate limit check
  const rateLimitResponse = await withRateLimit(request, rateLimit.detect)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await request.json()
    const parsed = jailbreakRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { content, options } = parsed.data
    const threshold = options?.threshold ?? 0.5

    // Run detection
    const result = detectJailbreak(content)

    const response = {
      detected: result.isJailbreak,
      score: result.confidence,
      confidence: result.confidence >= 0.8 ? "high" : result.confidence >= 0.5 ? "medium" : "low",
      patterns: options?.returnScore ? result.detections : undefined,
    }

    return NextResponse.json(response, {
      headers: {
        "X-Content-Score": result.confidence.toString(),
      },
    })
  } catch (error) {
    console.error("Jailbreak detection error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/v1/detect/jailbreak
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    endpoint: "jailbreak-detection",
    version: "1.0.0",
  })
}
