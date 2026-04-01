import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { wfhLogs } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const existing = await db
      .select({ id: wfhLogs.id })
      .from(wfhLogs)
      .where(and(eq(wfhLogs.id, id), eq(wfhLogs.userId, userId)))
      .limit(1)

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Log entry not found' }, { status: 404 })
    }

    await db
      .delete(wfhLogs)
      .where(and(eq(wfhLogs.id, id), eq(wfhLogs.userId, userId)))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/tax/wfh-logs/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
