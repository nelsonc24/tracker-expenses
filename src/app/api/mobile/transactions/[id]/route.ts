import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { transactions } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: transactionId } = await params

    // Verify transaction exists and belongs to the authenticated user
    const existing = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
      .limit(1)

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    await db
      .delete(transactions)
      .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))

    return NextResponse.json({ success: true, message: 'Transaction deleted successfully' })
  } catch (error) {
    console.error('[Mobile Transaction DELETE Error]:', error)
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 })
  }
}
