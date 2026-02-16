import { auth } from "@/auth"
import { detectPII } from "@/lib/pii"
import { rateLimit, withRateLimit } from "@/lib/ratelimit"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const piiRequestSchema = z.object({
  content: z.string().min(1).max(50000),
  options: z
    .object({
      redact: z.boolean().optional(), // Return redacted version
      includeValues: z.boolean().optional(), // Include detected values in response
      types: z.array(z.string()).optional(), // Only detect specific PII types
    })
    .optional(),
})

/**
 * POST /api/v1/detect/pii
 * Detect PII (Personally Identifiable Information) in text
 * 
 * Request body:
 * {
 *   "content": "string to analyze",
 *   "options": {
 *     "redact": true,        // optional, return redacted version
 *     "includeValues": true, // optional, include detected values
 *     "types": ["email", "phone"] // optional, only detect specific types
 *   }
 * }
 * 
 * Response:
 * {
 *   "hasPII": true,
 *   "count": 2,
 *   "detections": [
 *     { "type": "email", "value": "user@example.com", "score": 0.95 },
 *     { "type": "phone", "value": "555-123-4567", "score": 0.85 }
 *   ],
 *   "redacted": "Contact [EMAIL] or [PHONE]" // if redact: true
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
    const parsed = piiRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { content, options } = parsed.data
    
    // Run PII detection
    const result = detectPII(content)
    
    // Filter by types if specified
    let detections = result.detections
    if (options?.types && options.types.length > 0) {
      detections = detections.filter((d) => 
        options.types!.includes(d.type)
      )
    }

    const response: Record<string, unknown> = {
      hasPII: detections.length > 0,
      count: detections.length,
    }

    // Include detections (with or without values)
    if (options?.includeValues) {
      response.detections = detections.map((d) => ({
        type: d.type,
        value: d.value,
        score: d.score,
        start: d.start,
        end: d.end,
      }))
    } else {
      response.detections = detections.map((d) => ({
        type: d.type,
        score: d.score,
      }))
    }

    // Include redacted version if requested
    if (options?.redact) {
      response.redacted = result.redacted
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("PII detection error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/v1/detect/pii
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    endpoint: "pii-detection",
    version: "1.0.0",
  })
}
