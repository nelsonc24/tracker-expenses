import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { apiTokens } from '@/db/schema'

// Revoke a token (kept in the table so "last used" history survives, but it no longer authenticates).
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const revoked = await db
    .update(apiTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiTokens.id, id), eq(apiTokens.userId, userId), isNull(apiTokens.revokedAt)))
    .returning({ id: apiTokens.id })

  if (revoked.length === 0) return NextResponse.json({ error: 'Token not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
