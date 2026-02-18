import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

// Lazy-loaded prisma client
let prisma: any = null
async function getPrisma() {
  if (!prisma) {
    try {
      const { prisma: p } = await import("@/lib/prisma")
      prisma = p
    } catch {
      return null
    }
  }
  return prisma
}

/**
 * GET /api/v1/scan-history
 * Get scan history for the authenticated user
 */
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get("limit") || "50")
  const offset = parseInt(searchParams.get("offset") || "0")

  try {
    const db = await getPrisma()
    if (!db) {
      return NextResponse.json({
        scans: [],
        total: 0,
        limit,
        offset,
        message: "Database not configured",
      })
    }

    const scans = await db.scanHistory.findMany({
      where: { apiKey: session.user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    })

    const total = await db.scanHistory.count({
      where: { apiKey: session.user.id },
    })

    return NextResponse.json({
      scans,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error("Error fetching scan history:", error)
    return NextResponse.json({
      scans: [],
      total: 0,
      limit,
      offset,
      error: "Database unavailable",
    })
  }
}

/**
 * POST /api/v1/scan-history
 * Save a scan result to history
 */
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { content, safe, jailbreakDetected, jailbreakScore, piiDetected, piiCount, piiTypes, summary } = body

    const db = await getPrisma()
    if (!db) {
      return NextResponse.json({
        id: "demo-" + Date.now(),
        message: "Database not configured - scan not saved",
      })
    }

    const scan = await db.scanHistory.create({
      data: {
        apiKey: session.user.id,
        content,
        safe,
        jailbreakDetected: jailbreakDetected || false,
        jailbreakScore,
        piiDetected: piiDetected || false,
        piiCount: piiCount || 0,
        piiTypes: piiTypes || [],
        summary,
      },
    })

    return NextResponse.json(scan)
  } catch (error) {
    console.error("Error saving scan:", error)
    return NextResponse.json(
      { error: "Failed to save scan", id: "demo-" + Date.now() },
      { status: 200 } // Return success with demo ID
    )
  }
}
