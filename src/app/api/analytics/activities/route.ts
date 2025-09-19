import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { transactions, activities, transactionActivities, activityBudgets } from '@/db/schema'
import { and, eq, sql, gte, lte } from 'drizzle-orm'
import { z } from 'zod'

const analyticsParamsSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  activityId: z.string().optional(),
  timeframe: z.enum(['week', 'month', 'quarter', 'year', 'all']).default('month'),
})

export async function GET(request: NextRequest) {
  try {
    console.log('Analytics API: Starting request')
    const { userId } = await auth()
    
    console.log('Analytics API: Auth result:', { userId })
    
    if (!userId) {
      console.log('Analytics API: No userId found, returning 401')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    console.log('Analytics API: Search params:', Object.fromEntries(searchParams))
    
    // Transform null values to undefined for Zod parsing
    const dateFromParam = searchParams.get('dateFrom')
    const dateToParam = searchParams.get('dateTo') 
    const activityIdParam = searchParams.get('activityId')
    const timeframeParam = searchParams.get('timeframe')
    
    const params = analyticsParamsSchema.parse({
      dateFrom: dateFromParam || undefined,
      dateTo: dateToParam || undefined,
      activityId: activityIdParam || undefined,
      timeframe: timeframeParam || 'month',
    })
    
    console.log('Analytics API: Parsed params:', params)

    // Calculate date range based on timeframe
    const now = new Date()
    let dateFrom: Date
    const dateTo = params.dateTo ? new Date(params.dateTo) : now

    switch (params.timeframe) {
      case 'week':
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'quarter':
        dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case 'year':
        dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      case 'all':
        dateFrom = new Date('2020-01-01') // Reasonable start date
        break
      default: // month
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    if (params.dateFrom) {
      dateFrom = new Date(params.dateFrom)
    }

    console.log('Analytics API: Date range calculated:', { dateFrom, dateTo })

    console.log('Analytics API: Starting activity spending query')
    
    // 1. Activity Spending Overview - Simplified approach
    const activitySpending = await db
      .select({
        activityId: activities.id,
        activityName: activities.name,
        activityDescription: activities.description,
        totalSpent: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`.mapWith(Number),
        transactionCount: sql<number>`COUNT(${transactions.id})`.mapWith(Number),
        avgTransaction: sql<number>`COALESCE(ROUND(AVG(${transactions.amount}), 2), 0)`.mapWith(Number),
      })
      .from(activities)
      .leftJoin(transactionActivities, eq(activities.id, transactionActivities.activityId))
      .leftJoin(transactions, and(
        eq(transactionActivities.transactionId, transactions.id),
        eq(transactions.userId, userId),
        gte(transactions.transactionDate, dateFrom),
        lte(transactions.transactionDate, dateTo)
      ))
      .where(eq(activities.userId, userId))
      .groupBy(activities.id, activities.name, activities.description)
      .orderBy(sql`COALESCE(SUM(${transactions.amount}), 0) DESC`)

    console.log('Analytics API: Activity spending query completed, results:', activitySpending.length)

    // 2. Spending Trends (monthly breakdown) - Simplified
    console.log('Analytics API: Starting monthly trends query')
    const monthlyTrends = await db
      .select({
        month: sql<string>`to_char(${transactions.transactionDate}, 'YYYY-MM-01')`,
        activityId: activities.id,
        activityName: activities.name,
        totalSpent: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`.mapWith(Number),
        transactionCount: sql<number>`COUNT(${transactions.id})`.mapWith(Number),
      })
      .from(activities)
      .leftJoin(transactionActivities, eq(activities.id, transactionActivities.activityId))
      .leftJoin(transactions, and(
        eq(transactionActivities.transactionId, transactions.id),
        eq(transactions.userId, userId),
        gte(transactions.transactionDate, dateFrom),
        lte(transactions.transactionDate, dateTo)
      ))
      .where(eq(activities.userId, userId))
      .groupBy(
        sql`to_char(${transactions.transactionDate}, 'YYYY-MM-01')`,
        activities.id,
        activities.name
      )
      .orderBy(
        sql`to_char(${transactions.transactionDate}, 'YYYY-MM-01')`,
        sql`COALESCE(SUM(${transactions.amount}), 0) DESC`
      )

    console.log('Analytics API: Monthly trends query completed, results:', monthlyTrends.length)

    // 3. Budget vs Actual (if activity has budgets) - Simplified
    console.log('Analytics API: Starting budget comparison query')
    const budgetComparison = await db
      .select({
        activityId: activities.id,
        activityName: activities.name,
        budgetAmount: activityBudgets.budgetAmount,
        periodStart: activityBudgets.periodStart,
        periodEnd: activityBudgets.periodEnd,
        actualSpent: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`.mapWith(Number),
        budgetUtilization: sql<number>`
          CASE 
            WHEN ${activityBudgets.budgetAmount} > 0 
            THEN ROUND((COALESCE(SUM(${transactions.amount}), 0) / ${activityBudgets.budgetAmount}) * 100, 2)
            ELSE 0 
          END
        `.mapWith(Number),
      })
      .from(activities)
      .leftJoin(activityBudgets, eq(activities.id, activityBudgets.activityId))
      .leftJoin(transactionActivities, eq(activities.id, transactionActivities.activityId))
      .leftJoin(transactions, and(
        eq(transactionActivities.transactionId, transactions.id),
        eq(transactions.userId, userId),
        gte(transactions.transactionDate, dateFrom),
        lte(transactions.transactionDate, dateTo)
      ))
      .where(
        and(
          eq(activities.userId, userId),
          sql`${activityBudgets.budgetAmount} IS NOT NULL`
        )
      )
      .groupBy(
        activities.id,
        activities.name,
        activityBudgets.budgetAmount,
        activityBudgets.periodStart,
        activityBudgets.periodEnd
      )

    console.log('Analytics API: Budget comparison query completed, results:', budgetComparison.length)

    // 4. Activity Insights
    const totalSpentAllActivities = activitySpending.reduce(
      (sum, activity) => sum + (activity.totalSpent || 0), 
      0
    )

    const activitiesWithSpending = activitySpending.filter(
      activity => (activity.totalSpent || 0) > 0
    ).length

    const highestSpendingActivity = activitySpending.find(
      activity => (activity.totalSpent || 0) > 0
    )
    
    const budgetAlerts = budgetComparison.filter(
      comparison => (comparison.budgetUtilization || 0) > 80
    )

    console.log('Analytics API: Processing analytics data...', {
      totalActivities: activitySpending.length,
      activitiesWithSpending,
      totalSpentAllActivities,
      budgetComparisonCount: budgetComparison.length,
      trendsCount: monthlyTrends.length
    })

    // Format response
    const analytics = {
      summary: {
        totalActivities: activitySpending.length,
        activitiesWithSpending,
        totalSpentAllActivities: totalSpentAllActivities,
        averagePerActivity: activitiesWithSpending > 0 
          ? (totalSpentAllActivities / activitiesWithSpending) 
          : 0,
        timeframe: params.timeframe,
        dateRange: {
          from: dateFrom.toISOString(),
          to: dateTo.toISOString()
        }
      },
      activities: activitySpending.map(activity => ({
        ...activity,
        totalSpent: (activity.totalSpent || 0),
        avgTransaction: (activity.avgTransaction || 0),
        percentageOfTotal: totalSpentAllActivities > 0 
          ? ((activity.totalSpent || 0) / totalSpentAllActivities) * 100 
          : 0
      })),
      trends: monthlyTrends.map(trend => ({
        ...trend,
        totalSpent: (trend.totalSpent || 0)
      })),
      budgets: budgetComparison.map(comparison => ({
        ...comparison,
        budgetAmount: comparison.budgetAmount ? parseFloat(comparison.budgetAmount.toString()) : 0,
        actualSpent: (comparison.actualSpent || 0),
        remaining: comparison.budgetAmount 
          ? parseFloat(comparison.budgetAmount.toString()) - (comparison.actualSpent || 0)
          : 0,
        isOverBudget: comparison.budgetAmount 
          ? (comparison.actualSpent || 0) > parseFloat(comparison.budgetAmount.toString())
          : false
      })),
      insights: {
        topActivity: highestSpendingActivity ? {
          name: highestSpendingActivity.activityName,
          spent: (highestSpendingActivity.totalSpent || 0),
          transactionCount: highestSpendingActivity.transactionCount || 0
        } : null,
        budgetAlerts: budgetAlerts.map(alert => ({
          activityName: alert.activityName,
          utilization: alert.budgetUtilization || 0,
          budget: alert.budgetAmount ? parseFloat(alert.budgetAmount.toString()) : 0,
          spent: (alert.actualSpent || 0)
        }))
      }
    }

    console.log('Analytics API: Returning successful response')
    return NextResponse.json(analytics)

  } catch (error) {
    console.error('Activity analytics error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request parameters', 
          details: error.issues 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
