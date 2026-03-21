import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { budgets, transactions } from '@/db/schema'
import { eq, and, gte, lte, inArray, sql } from 'drizzle-orm'
import { startOfMonth, endOfMonth } from 'date-fns'

// GET /api/mobile/budgets
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') !== 'false'

    const conditions = [eq(budgets.userId, userId)]
    if (activeOnly) {
      conditions.push(eq(budgets.isActive, true))
    }

    const userBudgets = await db.select().from(budgets).where(and(...conditions))

    // Calculate spent amounts for the current month
    const now = new Date()
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)

    const enriched = await Promise.all(
      userBudgets.map(async (budget) => {
        // Determine the period window (use current period if set, else current month)
        const periodStart = budget.currentPeriodStart ?? monthStart
        const periodEnd = budget.currentPeriodEnd ?? monthEnd

        // Build account/category filters from budget config
        const categoryIds = budget.categoryIds as string[] | null
        const accountIds = budget.accountIds as string[] | null

        const spentConditions = [
          eq(transactions.userId, userId),
          eq(transactions.type, 'debit'),
          sql`${transactions.isTransfer} IS NOT TRUE`,
          gte(transactions.transactionDate, periodStart),
          lte(transactions.transactionDate, periodEnd),
        ]

        if (categoryIds && categoryIds.length > 0) {
          spentConditions.push(inArray(transactions.categoryId, categoryIds))
        }
        if (accountIds && accountIds.length > 0) {
          spentConditions.push(inArray(transactions.accountId, accountIds))
        }

        const spentResult = await db
          .select({
            total: sql<string>`COALESCE(SUM(ABS(CAST(${transactions.amount} AS NUMERIC))), 0)`,
          })
          .from(transactions)
          .where(and(...spentConditions))

        const spent = parseFloat(spentResult[0]?.total ?? '0')
        const total = parseFloat(budget.amount)
        const remaining = Math.max(0, total - spent)
        const percentage = total > 0 ? Math.min(100, (spent / total) * 100) : 0

        return {
          id: budget.id,
          name: budget.name,
          description: budget.description,
          amount: total,
          currency: budget.currency,
          period: budget.period,
          spent,
          remaining,
          percentage: Math.round(percentage),
          isActive: budget.isActive,
          alertThreshold: budget.alertThreshold ? parseFloat(budget.alertThreshold) : 80,
          categoryIds: categoryIds ?? [],
          accountIds: accountIds ?? [],
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          nextResetDate: budget.nextResetDate,
          color: (budget.metadata as { color?: string } | null)?.color ?? null,
          createdAt: budget.createdAt,
        }
      })
    )

    return NextResponse.json(enriched)
  } catch (error) {
    console.error('[Mobile Budgets Error]:', error)
    return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 })
  }
}
