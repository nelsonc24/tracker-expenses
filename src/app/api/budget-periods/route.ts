import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/db'
import { budgetPeriods, budgets } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'active', 'completed', or null for all
    const budgetId = searchParams.get('budgetId') // optional filter by budget

    // Build query conditions
    const conditions = [eq(budgetPeriods.userId, user.id)]
    
    if (status && (status === 'active' || status === 'completed')) {
      conditions.push(eq(budgetPeriods.status, status))
    }
    
    if (budgetId) {
      conditions.push(eq(budgetPeriods.budgetId, budgetId))
    }

    // Fetch budget periods
    const periods = await db
      .select({
        id: budgetPeriods.id,
        budgetId: budgetPeriods.budgetId,
        userId: budgetPeriods.userId,
        periodStart: budgetPeriods.periodStart,
        periodEnd: budgetPeriods.periodEnd,
        allocatedAmount: budgetPeriods.allocatedAmount,
        rolloverAmount: budgetPeriods.rolloverAmount,
        totalBudget: budgetPeriods.totalBudget,
        spentAmount: budgetPeriods.spentAmount,
        status: budgetPeriods.status,
        periodLabel: budgetPeriods.periodLabel,
        completedAt: budgetPeriods.completedAt,
        createdAt: budgetPeriods.createdAt,
        // Include budget details
        budgetName: budgets.name,
        budgetPeriod: budgets.period,
        budgetCategoryIds: budgets.categoryIds,
      })
      .from(budgetPeriods)
      .leftJoin(budgets, eq(budgetPeriods.budgetId, budgets.id))
      .where(and(...conditions))
      .orderBy(desc(budgetPeriods.periodStart))

    return NextResponse.json(periods)
  } catch (error) {
    console.error('Error fetching budget periods:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
