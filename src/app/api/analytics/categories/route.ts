import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/db'
import { transactions } from '@/db/schema'
import { eq, sql, and, gte, lte } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const period = request.nextUrl.searchParams.get('period') || 'all'
    const now = new Date()
    let startDate: Date | undefined
    let endDate: Date | undefined

    switch (period) {
      case '1m':
      case 'current-month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        break
      case '3m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
        endDate = now
        break
      case '6m':
      case 'last-6-months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1)
        endDate = now
        break
      case '1y':
      case 'last-year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        endDate = now
        break
      default:
        // No date filters for all-time
        break
    }

    const dateConditions = [
      eq(transactions.userId, user.id),
      sql`${transactions.categoryId} IS NOT NULL`,
      ...(startDate ? [gte(transactions.transactionDate, startDate)] : []),
      ...(endDate ? [lte(transactions.transactionDate, endDate)] : []),
    ]

    // Get category statistics
    const categoryStats = await db
      .select({
        categoryId: transactions.categoryId,
        transactionCount: sql<number>`count(*)`.as('transaction_count'),
        totalAmount: sql<number>`sum(${transactions.amount})`.as('total_amount')
      })
      .from(transactions)
      .where(and(...dateConditions))
      .groupBy(transactions.categoryId)

    // Convert to object for easy lookup
    const statsMap: Record<string, { transactionCount: number; totalAmount: number }> = {}
    
    categoryStats.forEach(stat => {
      if (stat.categoryId) {
        statsMap[stat.categoryId] = {
          transactionCount: stat.transactionCount,
          totalAmount: Number(stat.totalAmount || 0) // Amount is already in dollars, no conversion needed
        }
      }
    })

    return NextResponse.json(statsMap)
  } catch (error) {
    console.error('Error fetching category analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
