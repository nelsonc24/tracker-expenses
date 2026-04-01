import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { wfhLogs } from '@/db/schema'
import { and, eq, gte, lte, asc } from 'drizzle-orm'
import { z } from 'zod'

const FY_START_STR = '2025-07-01'
const FY_END_STR = '2026-06-30'

const createSchema = z.object({
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  hours: z.number().min(0.5).max(24),
  notes: z.string().max(500).optional(),
})

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const logs = await db
      .select()
      .from(wfhLogs)
      .where(
        and(
          eq(wfhLogs.userId, userId),
          gte(wfhLogs.logDate, FY_START_STR),
          lte(wfhLogs.logDate, FY_END_STR)
        )
      )
      .orderBy(asc(wfhLogs.logDate))

    return NextResponse.json(logs)
  } catch (error) {
    console.error('GET /api/tax/wfh-logs error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { logDate, hours, notes } = createSchema.parse(body)

    // Validate date is within the FY
    if (logDate < FY_START_STR || logDate > FY_END_STR) {
      return NextResponse.json(
        { error: 'Date must be within FY 2025-26 (1 Jul 2025 – 30 Jun 2026)' },
        { status: 400 }
      )
    }

    // Upsert by (userId, logDate)
    const existing = await db
      .select({ id: wfhLogs.id })
      .from(wfhLogs)
      .where(and(eq(wfhLogs.userId, userId), eq(wfhLogs.logDate, logDate)))
      .limit(1)

    if (existing.length > 0) {
      const updated = await db
        .update(wfhLogs)
        .set({ hours: hours.toString(), notes: notes ?? null, updatedAt: new Date() })
        .where(and(eq(wfhLogs.userId, userId), eq(wfhLogs.logDate, logDate)))
        .returning()
      return NextResponse.json(updated[0])
    }

    const inserted = await db
      .insert(wfhLogs)
      .values({ userId, logDate, hours: hours.toString(), notes: notes ?? null })
      .returning()

    return NextResponse.json(inserted[0], { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 })
    }
    console.error('POST /api/tax/wfh-logs error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
