import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { 
  activities, 
  transactions, 
  transactionActivities 
} from '@/db/schema'
import { eq, and, sum, count, gte, lte, desc } from 'drizzle-orm'

interface Params {
  id: string
}

// GET /api/activities/[id]/analytics - Get spending analytics for a specific activity
export async function GET(
  request: NextRequest,
  context: { params: Promise<Params> }
) {
  try {
    const { userId } = await auth()
    const { id } = await context.params
    const { searchParams } = new URL(request.url)
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const year = searchParams.get('year')

    // Set default date range to current year if not specified
    const currentYear = new Date().getFullYear()
    let dateFrom: Date
    let dateTo: Date

    if (startDate && endDate) {
      dateFrom = new Date(startDate)
      dateTo = new Date(endDate)
    } else if (year) {
      dateFrom = new Date(parseInt(year), 0, 1)
      dateTo = new Date(parseInt(year), 11, 31, 23, 59, 59)
    } else {
      dateFrom = new Date(currentYear, 0, 1)
      dateTo = new Date(currentYear, 11, 31, 23, 59, 59)
    }

    // Verify that the activity exists and belongs to the user
    const activity = await db
      .select()
      .from(activities)
      .where(and(
        eq(activities.id, id),
        eq(activities.userId, userId)
      ))
      .limit(1)

    if (activity.length === 0) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    // Get total spending for the activity within the date range
    const spendingResult = await db
      .select({
        totalSpent: sum(transactions.amount),
        transactionCount: count(transactions.id),
      })
      .from(transactions)
      .innerJoin(transactionActivities, eq(transactions.id, transactionActivities.transactionId))
      .where(and(
        eq(transactionActivities.activityId, id),
        eq(transactions.userId, userId),
        gte(transactions.transactionDate, dateFrom),
        lte(transactions.transactionDate, dateTo)
      ))

    const totalSpent = Math.abs(parseFloat(spendingResult[0]?.totalSpent || '0'))
    const transactionCount = spendingResult[0]?.transactionCount || 0

    // Get monthly breakdown
    const monthlyBreakdown = await db
      .select({
        month: transactions.transactionDate,
        amount: transactions.amount,
      })
      .from(transactions)
      .innerJoin(transactionActivities, eq(transactions.id, transactionActivities.transactionId))
      .where(and(
        eq(transactionActivities.activityId, id),
        eq(transactions.userId, userId),
        gte(transactions.transactionDate, dateFrom),
        lte(transactions.transactionDate, dateTo)
      ))
      .orderBy(transactions.transactionDate)

    // Group by month
    const monthlyTotals: Record<string, number> = {}
    monthlyBreakdown.forEach(transaction => {
      const monthKey = transaction.month.toISOString().substring(0, 7) // YYYY-MM format
      if (!monthlyTotals[monthKey]) {
        monthlyTotals[monthKey] = 0
      }
      monthlyTotals[monthKey] += Math.abs(parseFloat(transaction.amount))
    })

    // Get recent transactions
    const recentTransactions = await db
      .select({
        id: transactions.id,
        amount: transactions.amount,
        description: transactions.description,
        merchant: transactions.merchant,
        transactionDate: transactions.transactionDate,
      })
      .from(transactions)
      .innerJoin(transactionActivities, eq(transactions.id, transactionActivities.transactionId))
      .where(and(
        eq(transactionActivities.activityId, id),
        eq(transactions.userId, userId),
        gte(transactions.transactionDate, dateFrom),
        lte(transactions.transactionDate, dateTo)
      ))
      .orderBy(desc(transactions.transactionDate))
      .limit(10)

    // Calculate budget progress if budget is set
    let budgetProgress = null
    if (activity[0].budgetAmount) {
      const budgetAmount = parseFloat(activity[0].budgetAmount)
      const progressPercentage = (totalSpent / budgetAmount) * 100
      
      budgetProgress = {
        budgetAmount,
        spentAmount: totalSpent,
        remainingAmount: budgetAmount - totalSpent,
        progressPercentage: Math.min(progressPercentage, 100),
        isOverBudget: totalSpent > budgetAmount,
      }
    }

    // Calculate average monthly spending
    const monthsInRange = Object.keys(monthlyTotals).length || 1
    const averageMonthlySpending = totalSpent / monthsInRange

    // Predict annual spending based on current patterns
    const monthsInYear = 12
    const projectedAnnualSpending = averageMonthlySpending * monthsInYear

    return NextResponse.json({
      activity: activity[0],
      period: {
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
      },
      summary: {
        totalSpent,
        transactionCount,
        averageMonthlySpending,
        projectedAnnualSpending,
      },
      budgetProgress,
      monthlyBreakdown: monthlyTotals,
      recentTransactions,
    })
  } catch (error) {
    console.error('Error fetching activity analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity analytics' },
      { status: 500 }
    )
  }
}
