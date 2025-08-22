import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { budgets, transactions, categories } from '@/db/schema'
import { eq, and, gte, lte, desc } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'current' // current, previous, last3months, last6months, lastyear
    const budgetId = searchParams.get('budgetId')

    // Calculate date ranges based on period
    const now = new Date()
    let startDate: Date
    let endDate: Date

    switch (period) {
      case 'current':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
      case 'previous':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        endDate = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case 'last3months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
      case 'last6months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
      case 'lastyear':
        startDate = new Date(now.getFullYear() - 1, 0, 1)
        endDate = new Date(now.getFullYear() - 1, 11, 31)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    }

    // Get budgets with conditions
    const budgetConditions = [eq(budgets.userId, userId)]
    if (budgetId) {
      budgetConditions.push(eq(budgets.id, budgetId))
    }

    const userBudgets = await db
      .select({
        budget: budgets,
      })
      .from(budgets)
      .where(and(...budgetConditions))
      .orderBy(desc(budgets.createdAt))

    // Calculate variance for each budget
    const budgetVariances = await Promise.all(
      userBudgets.map(async ({ budget }) => {
        // Get actual spending for this budget's categories in the date range
        const transactionConditions = [
          eq(transactions.userId, userId),
          gte(transactions.transactionDate, startDate),
          lte(transactions.transactionDate, endDate)
        ]

        // If budget has specific categories, filter by them
        let categoryTransactions
        if (budget.categoryIds && budget.categoryIds.length > 0) {
          // Get transactions for all categories in this budget
          const categoryConditions = budget.categoryIds.map(categoryId => 
            eq(transactions.categoryId, categoryId)
          )
          
          categoryTransactions = await db
            .select({
              amount: transactions.amount,
              transactionDate: transactions.transactionDate,
              categoryId: transactions.categoryId,
            })
            .from(transactions)
            .where(and(...transactionConditions))
          
          // Filter transactions that match any of the budget's categories
          categoryTransactions = categoryTransactions.filter(t => 
            budget.categoryIds?.includes(t.categoryId || '')
          )
        } else {
          // If no specific categories, get all transactions
          categoryTransactions = await db
            .select({
              amount: transactions.amount,
              transactionDate: transactions.transactionDate,
              categoryId: transactions.categoryId,
            })
            .from(transactions)
            .where(and(...transactionConditions))
        }

        // Get category names for this budget
        let categoryNames = ['All Categories']
        if (budget.categoryIds && budget.categoryIds.length > 0) {
          try {
            const budgetCategories = await db
              .select({ id: categories.id, name: categories.name, color: categories.color })
              .from(categories)
              .where(eq(categories.userId, userId))
            
            // Filter to get categories that are in this budget
            const matchingCategories = budgetCategories.filter(cat => 
              budget.categoryIds?.includes(cat.id)
            )
            
            if (matchingCategories.length > 0) {
              categoryNames = matchingCategories.map(cat => cat.name)
            }
          } catch (error) {
            console.warn('Error fetching category names:', error)
          }
        }

        // Calculate actual spending (expenses only, so negative amounts)
        const actualSpent = categoryTransactions
          .filter(t => parseFloat(t.amount) < 0)
          .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0)

        // Calculate budget amount for the period
        const budgetAmount = parseFloat(budget.amount)
        
        // Calculate variance
        const variance = actualSpent - budgetAmount
        const variancePercentage = budgetAmount > 0 ? (variance / budgetAmount) * 100 : 0

        // Determine variance status
        let status: 'under' | 'on-track' | 'over' | 'critical'
        if (variance < -budgetAmount * 0.1) {
          status = 'under' // More than 10% under budget
        } else if (variance <= budgetAmount * 0.05) {
          status = 'on-track' // Within 5% of budget
        } else if (variance <= budgetAmount * 0.2) {
          status = 'over' // 5-20% over budget
        } else {
          status = 'critical' // More than 20% over budget
        }

        // Calculate daily trend
        const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        const dailyBudget = budgetAmount / daysInPeriod
        const dailyActual = actualSpent / daysInPeriod

        // Calculate projection for end of period
        const daysElapsed = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        const projectedSpending = (actualSpent / Math.max(daysElapsed, 1)) * daysInPeriod

        return {
          budgetId: budget.id,
          budgetName: budget.name,
          categoryNames: categoryNames.join(', '),
          categoryColor: '#6b7280', // Default color, could enhance to get actual category colors
          period,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          budgetAmount,
          actualSpent,
          variance,
          variancePercentage,
          status,
          dailyBudget,
          dailyActual,
          projectedSpending,
          projectedVariance: projectedSpending - budgetAmount,
          projectedVariancePercentage: budgetAmount > 0 ? ((projectedSpending - budgetAmount) / budgetAmount) * 100 : 0,
          transactionCount: categoryTransactions.length,
          daysInPeriod,
          daysElapsed: Math.max(daysElapsed, 1),
          remainingDays: Math.max(daysInPeriod - daysElapsed, 0)
        }
      })
    )

    // Calculate summary statistics
    const totalBudgetAmount = budgetVariances.reduce((sum, bv) => sum + bv.budgetAmount, 0)
    const totalActualSpent = budgetVariances.reduce((sum, bv) => sum + bv.actualSpent, 0)
    const totalVariance = totalActualSpent - totalBudgetAmount
    const totalVariancePercentage = totalBudgetAmount > 0 ? (totalVariance / totalBudgetAmount) * 100 : 0

    const summary = {
      totalBudgets: budgetVariances.length,
      totalBudgetAmount,
      totalActualSpent,
      totalVariance,
      totalVariancePercentage,
      budgetsUnder: budgetVariances.filter(bv => bv.status === 'under').length,
      budgetsOnTrack: budgetVariances.filter(bv => bv.status === 'on-track').length,
      budgetsOver: budgetVariances.filter(bv => bv.status === 'over').length,
      budgetsCritical: budgetVariances.filter(bv => bv.status === 'critical').length,
      avgVariancePercentage: budgetVariances.length > 0 
        ? budgetVariances.reduce((sum, bv) => sum + bv.variancePercentage, 0) / budgetVariances.length 
        : 0
    }

    return NextResponse.json({
      period,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      },
      summary,
      budgetVariances
    })

  } catch (error) {
    console.error('Error fetching budget variance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch budget variance' },
      { status: 500 }
    )
  }
}
