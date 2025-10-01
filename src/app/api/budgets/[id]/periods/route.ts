import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { getBudgetPeriods, getCurrentBudgetPeriod, resetBudgetPeriod } from '@/lib/db-utils'
import { db } from '@/db'
import { budgets } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

/**
 * GET /api/budgets/[id]/periods
 * Get all periods for a budget
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify budget belongs to user
    const budget = await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.id, resolvedParams.id), eq(budgets.userId, user.id)))
      .limit(1)

    if (budget.length === 0) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const currentOnly = searchParams.get('current') === 'true'

    if (currentOnly) {
      const currentPeriod = await getCurrentBudgetPeriod(resolvedParams.id)
      return NextResponse.json(currentPeriod)
    }

    const periods = await getBudgetPeriods(resolvedParams.id)
    return NextResponse.json(periods)
  } catch (error) {
    console.error('Error fetching budget periods:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/budgets/[id]/periods
 * Manually trigger budget reset (creates new period)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify budget belongs to user
    const budgetResult = await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.id, resolvedParams.id), eq(budgets.userId, user.id)))
      .limit(1)

    if (budgetResult.length === 0) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }

    const budget = budgetResult[0]

    // Reset the budget
    await resetBudgetPeriod(budget)

    // Get the new current period
    const newPeriod = await getCurrentBudgetPeriod(resolvedParams.id)

    return NextResponse.json({
      success: true,
      message: 'Budget reset successfully',
      period: newPeriod
    })
  } catch (error) {
    console.error('Error resetting budget:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
