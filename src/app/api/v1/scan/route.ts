import { auth } from "@/auth"
import { detectJailbreak } from "@/lib/jailbreak"
import { detectPII } from "@/lib/pii"
import { rateLimit, withRateLimit } from "@/lib/ratelimit"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const scanRequestSchema = z.object({
  content: z.string().min(1).max(50000),
  options: z
    .object({
      detectJailbreak: z.boolean().optional(),
      detectPII: z.boolean().optional(),
      redactPII: z.boolean().optional(),
      threshold: z.number().min(0).max(1).optional(),
    })
    .optional(),
})

/**
 * POST /api/v1/scan
 * Full content scan - combines jailbreak and PII detection
 * 
 * Request body:
 * {
 *   "content": "string to analyze",
 *   "options": {
 *     "detectJailbreak": true, // default: true
 *     "detectPII": true,       // default: true
 *     "redactPII": true,       // default: false
 *     "threshold": 0.5         // default: 0.5
 *   }
 * }
 * 
 * Response:
 * {
 *   "safe": false,
 *   "checks": {
 *     "jailbreak": {
 *       "detected": true,
 *       "score": 0.85,
 *       "severity": "high"
 *     },
 *     "pii": {
 *       "detected": true,
 *       "count": 2,
 *       "redacted": "..."
 *     }
 *   },
 *   "summary": "Content contains jailbreak attempt and PII"
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

  // Rate limit check (stricter for full scan)
  const rateLimitResponse = await withRateLimit(request, rateLimit.scan)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await request.json()
    const parsed = scanRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { content, options } = parsed.data
    const detectJailbreakEnabled = options?.detectJailbreak ?? true
    const detectPIIEnabled = options?.detectPII ?? true
    const redactPII = options?.redactPII ?? false
    const threshold = options?.threshold ?? 0.5

    const response: Record<string, unknown> = {
      safe: true,
      checks: {},
    }

    // Run jailbreak detection
    if (detectJailbreakEnabled) {
      const jailbreakResult = detectJailbreak(content)
      const detected = jailbreakResult.confidence >= threshold
      
      ;(response.checks as Record<string, unknown>).jailbreak = {
        detected,
        score: jailbreakResult.confidence,
        severity: jailbreakResult.severity,
      }
      
      if (detected) response.safe = false
    }

    // Run PII detection
    if (detectPIIEnabled) {
      const piiResult = detectPII(content)
      
      const piiCheck: Record<string, unknown> = {
        detected: piiResult.hasPII,
        count: piiResult.detections.length,
        types: Array.from(new Set(piiResult.detections.map((d) => d.type))),
      }
      
      if (redactPII) {
        piiCheck.redacted = piiResult.redacted
      }
      
      ;(response.checks as Record<string, unknown>).pii = piiCheck
      
      if (piiResult.hasPII) response.safe = false
    }

    // Add summary
    const issues: string[] = []
    const jailbreakCheck = (response.checks as Record<string, unknown>).jailbreak as Record<string, unknown> | undefined
    const piiCheck = (response.checks as Record<string, unknown>).pii as Record<string, unknown> | undefined
    
    if (jailbreakCheck?.detected) issues.push("jailbreak attempt")
    if (piiCheck?.detected) issues.push("PII detected")
    
    response.summary = response.safe 
      ? "Content is safe" 
      : `Content contains: ${issues.join(", ")}`

    return NextResponse.json(response)
  } catch (error) {
    console.error("Scan error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/v1/scan
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    endpoint: "full-scan",
    version: "1.0.0",
    checks: ["jailbreak", "pii"],
  })
}
