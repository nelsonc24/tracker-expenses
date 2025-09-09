import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { transactions, activities, transactionActivities, activityBudgets } from '@/db/schema'
import { and, eq, desc, sum, count, sql, gte, lte } from 'drizzle-orm'
import { z } from 'zod'

const analyticsParamsSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  activityId: z.string().optional(),
  timeframe: z.enum(['week', 'month', 'quarter', 'year', 'all']).default('month'),
})

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const params = analyticsParamsSchema.parse({
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
      activityId: searchParams.get('activityId'),
      timeframe: searchParams.get('timeframe') || 'month',
    })

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

    // Base transaction query conditions
    const baseConditions = [
      eq(transactions.userId, userId),
      gte(transactions.transactionDate, dateFrom),
      lte(transactions.transactionDate, dateTo)
    ]

    // 1. Activity Spending Overview
    const activitySpending = await db
      .select({
        activityId: activities.id,
        activityName: activities.name,
        activityDescription: activities.description,
        totalSpent: sum(transactions.amount).mapWith(Number),
        transactionCount: count(transactions.id),
        avgTransaction: sql<number>`ROUND(AVG(${transactions.amount}), 2)`.mapWith(Number),
      })
      .from(activities)
      .leftJoin(transactionActivities, eq(activities.id, transactionActivities.activityId))
      .leftJoin(transactions, and(
        eq(transactionActivities.transactionId, transactions.id),
        ...baseConditions
      ))
      .where(eq(activities.userId, userId))
      .groupBy(activities.id, activities.name, activities.description)
      .orderBy(desc(sum(transactions.amount)))

    // 2. Spending Trends (monthly breakdown)
    const monthlyTrends = await db
      .select({
        month: sql<string>`DATE_TRUNC('month', ${transactions.transactionDate})::text`,
        activityId: activities.id,
        activityName: activities.name,
        totalSpent: sum(transactions.amount).mapWith(Number),
        transactionCount: count(transactions.id),
      })
      .from(activities)
      .leftJoin(transactionActivities, eq(activities.id, transactionActivities.activityId))
      .leftJoin(transactions, and(
        eq(transactionActivities.transactionId, transactions.id),
        ...baseConditions
      ))
      .where(eq(activities.userId, userId))
      .groupBy(
        sql`DATE_TRUNC('month', ${transactions.transactionDate})`,
        activities.id,
        activities.name
      )
      .orderBy(
        sql`DATE_TRUNC('month', ${transactions.transactionDate})`,
        desc(sum(transactions.amount))
      )

    // 3. Budget vs Actual (if activity has budgets)
    const budgetComparison = await db
      .select({
        activityId: activities.id,
        activityName: activities.name,
        budgetAmount: activityBudgets.budgetAmount,
        periodStart: activityBudgets.periodStart,
        periodEnd: activityBudgets.periodEnd,
        actualSpent: sum(transactions.amount).mapWith(Number),
        budgetUtilization: sql<number>`
          CASE 
            WHEN ${activityBudgets.budgetAmount} > 0 
            THEN ROUND((SUM(${transactions.amount}) / ${activityBudgets.budgetAmount}) * 100, 2)
            ELSE 0 
          END
        `.mapWith(Number),
      })
      .from(activities)
      .leftJoin(activityBudgets, eq(activities.id, activityBudgets.activityId))
      .leftJoin(transactionActivities, eq(activities.id, transactionActivities.activityId))
      .leftJoin(transactions, and(
        eq(transactionActivities.transactionId, transactions.id),
        ...baseConditions
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

    // 4. Activity Insights
    const totalSpentAllActivities = activitySpending.reduce(
      (sum, activity) => sum + (activity.totalSpent || 0), 
      0
    )

    const activitiesWithSpending = activitySpending.filter(
      activity => activity.totalSpent > 0
    ).length

    const highestSpendingActivity = activitySpending[0]
    
    const budgetAlerts = budgetComparison.filter(
      comparison => comparison.budgetUtilization > 80
    )

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
          transactionCount: highestSpendingActivity.transactionCount
        } : null,
        budgetAlerts: budgetAlerts.map(alert => ({
          activityName: alert.activityName,
          utilization: alert.budgetUtilization,
          budget: alert.budgetAmount ? parseFloat(alert.budgetAmount.toString()) : 0,
          spent: (alert.actualSpent || 0)
        }))
      }
    }

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
