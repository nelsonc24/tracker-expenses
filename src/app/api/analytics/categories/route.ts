import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { transactions, categories } from '@/lib/db/schema'
import { eq, sql, and } from 'drizzle-orm'

export async function GET() {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get category statistics
    const categoryStats = await db
      .select({
        categoryId: transactions.categoryId,
        transactionCount: sql<number>`count(*)`.as('transaction_count'),
        totalAmount: sql<number>`sum(${transactions.amountMinor})`.as('total_amount')
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.id),
          sql`${transactions.categoryId} IS NOT NULL`
        )
      )
      .groupBy(transactions.categoryId)

    // Convert to object for easy lookup
    const statsMap: Record<string, { transactionCount: number; totalAmount: number }> = {}
    
    categoryStats.forEach(stat => {
      if (stat.categoryId) {
        statsMap[stat.categoryId] = {
          transactionCount: stat.transactionCount,
          totalAmount: (stat.totalAmount || 0) / 100 // Convert from cents to dollars
        }
      }
    })

    return NextResponse.json(statsMap)
  } catch (error) {
    console.error('Error fetching category analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
