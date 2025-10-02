import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { getUserBudgets, getCategorySpending } from '@/lib/db-utils'

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || 'current-month'

    let startDate: Date | undefined
    let endDate: Date | undefined

    const now = new Date()
    
    switch (period) {
      case 'current-month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        break
      case 'last-3-months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        break
      case 'last-6-months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        break
      case 'last-year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        endDate = now
        break
      default:
        // Default to current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        break
    }

    // Get budgets and category spending for the selected period
    const [budgets, categorySpending] = await Promise.all([
      getUserBudgets(user.id),
      getCategorySpending(user.id, startDate, endDate)
    ])

    // Calculate budget progress for each budget
    const budgetProgress = budgets.map(budget => {
      const categoryIds = budget.categoryIds as string[] || []
      
      // Calculate spent amount for this budget's categories within the period
      const spent = categorySpending
        .filter(cs => categoryIds.includes(cs.categoryId || ''))
        .reduce((total, cs) => total + Math.abs(parseFloat(cs.totalAmount || '0')), 0)

      const budgetAmount = parseFloat(budget.amount)
      
      // Adjust budget amount based on period
      let adjustedBudgetAmount = budgetAmount
      if (period === 'last-3-months' && budget.period === 'monthly') {
        adjustedBudgetAmount = budgetAmount * 3
      } else if (period === 'last-6-months' && budget.period === 'monthly') {
        adjustedBudgetAmount = budgetAmount * 6
      } else if (period === 'last-year' && budget.period === 'monthly') {
        adjustedBudgetAmount = budgetAmount * 12
      } else if (period === 'last-year' && budget.period === 'quarterly') {
        adjustedBudgetAmount = budgetAmount * 4
      }

      const progress = adjustedBudgetAmount > 0 ? (spent / adjustedBudgetAmount) * 100 : 0
      const isOverBudget = progress > 100

      // Get category names for this budget
      const budgetCategories = categorySpending
        .filter(cs => categoryIds.includes(cs.categoryId || ''))
        .map(cs => cs.categoryName || 'Uncategorized')
        .join(', ') || 'All Categories'

      return {
        id: budget.id,
        name: budget.name,
        spent: spent,
        budget: adjustedBudgetAmount,
        progress: progress,
        isOverBudget: isOverBudget,
        remaining: Math.max(0, adjustedBudgetAmount - spent),
        category: budgetCategories,
        periodType: budget.period,
        originalBudget: budgetAmount
      }
    })

    // Calculate overall progress percentage
    const overallProgress = budgetProgress.length > 0
      ? budgetProgress.reduce((sum, b) => sum + b.progress, 0) / budgetProgress.length
      : 0

    return NextResponse.json({
      period,
      budgets: budgetProgress,
      overallProgress: Math.round(overallProgress),
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    })
  } catch (error) {
    console.error('Error fetching budget progress:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
