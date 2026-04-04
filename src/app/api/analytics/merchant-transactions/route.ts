import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/db'
import { transactions, categories } from '@/db/schema'
import { eq, and, gte, desc, lt } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const merchant = searchParams.get('merchant')
    const period = searchParams.get('period') || '6m'

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant name is required' }, { status: 400 })
    }

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

    const merchantTransactions = await db
      .select({
        id: transactions.id,
        description: transactions.description,
        amount: transactions.amount,
        transactionDate: transactions.transactionDate,
        merchant: transactions.merchant,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.userId, user.id),
          eq(transactions.description, merchant),
          gte(transactions.transactionDate, startDate),
          lt(transactions.amount, '0') // Expenses only — same as analytics route's topMerchants query
        )
      )
      .orderBy(desc(transactions.transactionDate))

    const totalAmount = Math.abs(
      merchantTransactions.reduce((sum, t) => sum + Number(t.amount), 0)
    )

    return NextResponse.json({
      transactions: merchantTransactions.map((t) => ({
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
        transactionCount: merchantTransactions.length,
      },
    })
  } catch (error) {
    console.error('Error fetching merchant transactions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
