import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { importSenders } from '@/db/schema'

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const deleted = await db
    .delete(importSenders)
    .where(and(eq(importSenders.id, id), eq(importSenders.userId, userId)))
    .returning({ id: importSenders.id })
  if (deleted.length === 0) return NextResponse.json({ error: 'Sender not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
