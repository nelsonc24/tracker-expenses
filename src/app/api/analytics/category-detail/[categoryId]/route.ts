import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/db'
import { transactions } from '@/db/schema'
import { eq, and, gte, lte, desc } from 'drizzle-orm'

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
    const period = searchParams.get('period') || '1m'

    // Calculate date range based on period
    let startDate: Date
    const endDate: Date = new Date()
    const now = new Date()

    switch (period) {
      case '1m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        break
      case '3m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
        break
      case '6m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
        break
      case '1y':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        break
      case 'all':
      default:
        startDate = new Date(2020, 0, 1) // Far back date for all-time
        break
    }

    // Fetch category transactions for the period
    const categoryTransactions = await db
      .select({
        id: transactions.id,
        description: transactions.description,
        amount: transactions.amount,
        transactionDate: transactions.transactionDate,
        merchant: transactions.merchant,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.id),
          eq(transactions.categoryId, categoryId),
          gte(transactions.transactionDate, startDate),
          lte(transactions.transactionDate, endDate),
          eq(transactions.isTransfer, false), // Exclude transfers
          eq(transactions.type, 'debit') // Only include expenses (debits), not income (credits)
        )
      )
      .orderBy(desc(transactions.transactionDate))

    // Calculate summary statistics
    const totalAmount = Math.abs(
      categoryTransactions.reduce((sum, t) => sum + Number(t.amount), 0)
    )
    const transactionCount = categoryTransactions.length
    const avgTransactionAmount =
      transactionCount > 0 ? totalAmount / transactionCount : 0

    // Calculate trend (compare first half vs second half of period)
    const midDate = new Date((startDate.getTime() + endDate.getTime()) / 2)
    const firstHalf = categoryTransactions.filter(
      (t) => new Date(t.transactionDate) < midDate
    )
    const secondHalf = categoryTransactions.filter(
      (t) => new Date(t.transactionDate) >= midDate
    )

    const firstHalfTotal = Math.abs(
      firstHalf.reduce((sum, t) => sum + Number(t.amount), 0)
    )
    const secondHalfTotal = Math.abs(
      secondHalf.reduce((sum, t) => sum + Number(t.amount), 0)
    )

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
    let trendPercentage = 0

    if (firstHalfTotal > 0) {
      const change = ((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100
      trendPercentage = change

      if (Math.abs(change) > 10) {
        trend = change > 0 ? 'increasing' : 'decreasing'
      }
    } else if (secondHalfTotal > 0) {
      trend = 'increasing'
      trendPercentage = 100
    }

    // Prepare trend data (daily aggregation)
    const trendDataMap = new Map<string, number>()
    categoryTransactions.forEach((t) => {
      const dateKey = new Date(t.transactionDate).toISOString().split('T')[0]
      const current = trendDataMap.get(dateKey) || 0
      trendDataMap.set(dateKey, current + Math.abs(Number(t.amount)))
    })

    const trendData = Array.from(trendDataMap.entries())
      .map(([date, amount]) => ({ date, amount: Number(amount.toFixed(2)) }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Prepare monthly comparison data (last 6 months)
    const monthlyDataMap = new Map<string, number>()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)

    categoryTransactions
      .filter((t) => new Date(t.transactionDate) >= sixMonthsAgo)
      .forEach((t) => {
        const date = new Date(t.transactionDate)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const current = monthlyDataMap.get(monthKey) || 0
        monthlyDataMap.set(monthKey, current + Math.abs(Number(t.amount)))
      })

    const monthlyComparison = Array.from(monthlyDataMap.entries())
      .map(([month, amount]) => {
        const [year, monthNum] = month.split('-')
        const monthName = new Date(Number(year), Number(monthNum) - 1).toLocaleDateString('en-US', {
          month: 'short',
          year: '2-digit'
        })
        return { month: monthName, amount: Number(amount.toFixed(2)) }
      })
      .sort((a, b) => {
        const [aMonth, aYear] = a.month.split(' ')
        const [bMonth, bYear] = b.month.split(' ')
        return `${aYear}-${aMonth}`.localeCompare(`${bYear}-${bMonth}`)
      })

    // Get recent transactions (limit 10)
    const recentTransactions = categoryTransactions.slice(0, 10).map((t) => ({
      id: t.id,
      description: t.description,
      amount: Number(t.amount),
      date: t.transactionDate.toISOString(),
      merchant: t.merchant || undefined,
    }))

    // Check for budget info (optional - may not exist for all categories)
    // For now, we'll skip budget info as it may require additional implementation
    // This can be added later if budgets are category-specific

    const response = {
      summary: {
        totalAmount: Number(totalAmount.toFixed(2)),
        transactionCount,
        avgTransactionAmount: Number(avgTransactionAmount.toFixed(2)),
        trend,
        trendPercentage: Number(trendPercentage.toFixed(2)),
      },
      trendData,
      monthlyComparison,
      recentTransactions,
      budgetInfo: null, // TODO: Implement budget lookup if needed
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching category detail:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
