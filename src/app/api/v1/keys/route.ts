import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

// In-memory key storage (use database in production)
const API_KEYS = new Map<string, { name: string; tier: string; created: number }>()

const keyRequestSchema = z.object({
  name: z.string().min(1).max(100),
  tier: z.enum(["free", "pro", "enterprise"]).default("free"),
})

/**
 * POST /api/v1/keys
 * Generate a new API key
 * 
 * Request body:
 * {
 *   "name": "My API Key",
 *   "tier": "free" // "free" | "pro" | "enterprise"
 * }
 * 
 * Response:
 * {
 *   "key": "sk_sa_xxxxxxxxxxxxxxxxxxxx",
 *   "name": "My API Key",
 *   "tier": "free"
 * }
 */
export async function POST(request: NextRequest) {
  // In production, require authentication
  
  try {
    const body = await request.json()
    const parsed = keyRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { name, tier } = parsed.data
    
    // Generate API key
    const key = `sk_sa_${generateKeyFragment(24)}`
    
    API_KEYS.set(key, { name, tier, created: Date.now() })

    return NextResponse.json({
      key,
      name,
      tier,
      created: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Key generation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/v1/keys
 * List API keys (masked)
 */
export async function GET() {
  // In production, require authentication and only return user's keys
  
  const keys = Array.from(API_KEYS.entries()).map(([key, data]) => ({
    key: maskKey(key),
    name: data.name,
    tier: data.tier,
    created: new Date(data.created).toISOString(),
  }))

  return NextResponse.json({ keys })
}

/**
 * DELETE /api/v1/keys
 * Revoke an API key
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get("key")
  
  if (!key) {
    return NextResponse.json(
      { error: "Key parameter required" },
      { status: 400 }
    )
  }

  const deleted = API_KEYS.delete(key)
  
  if (!deleted) {
    return NextResponse.json(
      { error: "Key not found" },
      { status: 404 }
    )
  }

  return NextResponse.json({ success: true })
}

function generateKeyFragment(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = ""
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function maskKey(key: string): string {
  if (key.length <= 10) return "sk_sa_***"
  return `sk_sa_${key.slice(7, 11)}...${key.slice(-4)}`
}
