import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/db'
import { transactions, categories } from '@/db/schema'
import { eq, and, gte, desc } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { categoryId } = await params
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || '6m'

    // Use exact same date logic as the main analytics route
    const now = new Date()
    let months: number

    switch (period) {
      case '1m': months = 1; break
      case '3m': months = 3; break
      case '6m': months = 6; break
      case '1y': months = 12; break
      case 'all': months = 120; break
      default: months = 6
    }

    // Month-start precision — same formula as main analytics route
    const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1)

    // Same criteria as analytics route's categorySpending query:
    // all transaction types (no debit-only filter), no transfer exclusion
    const rows = await db
      .select({
        id: transactions.id,
        description: transactions.description,
        amount: transactions.amount,
        transactionDate: transactions.transactionDate,
        merchant: transactions.merchant,
        categoryName: categories.name,
        categoryColor: categories.color,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.userId, user.id),
          eq(transactions.categoryId, categoryId),
          gte(transactions.transactionDate, startDate)
        )
      )
      .orderBy(desc(transactions.transactionDate))

    const totalAmount = rows.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)

    return NextResponse.json({
      transactions: rows.map((t) => ({
        id: t.id,
        description: t.description,
        amount: Number(t.amount),
        date: t.transactionDate.toISOString(),
        merchant: t.merchant || undefined,
        categoryName: t.categoryName || 'Uncategorized',
        categoryColor: t.categoryColor || undefined,
      })),
      summary: {
        totalAmount: Number(totalAmount.toFixed(2)),
        transactionCount: rows.length,
      },
    })
  } catch (error) {
    console.error('Error fetching category transactions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
