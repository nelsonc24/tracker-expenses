import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { transactions, budgets, recurringTransactions, categories } from '@/db/schema'
import { eq, and, gte, lte, desc } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const forecastMonths = parseInt(searchParams.get('months') || '3')
    const analysisType = searchParams.get('type') || 'comprehensive' // spending, income, cashflow, comprehensive

    // Get historical data (last 12 months for better predictions)
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth() - 12, 1)
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Fetch historical transactions
    const historicalTransactions = await db
      .select({
        transaction: transactions,
        category: categories,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(
        eq(transactions.userId, userId),
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate)
      ))
      .orderBy(desc(transactions.transactionDate))

    // Fetch active recurring transactions
    const activeRecurring = await db
      .select()
      .from(recurringTransactions)
      .where(and(
        eq(recurringTransactions.userId, userId),
        eq(recurringTransactions.isActive, true)
      ))

    // Fetch active budgets
    const activeBudgets = await db
      .select()
      .from(budgets)
      .where(and(
        eq(budgets.userId, userId),
        eq(budgets.isActive, true)
      ))

    // Group transactions by month for trend analysis
    const monthlyData = new Map<string, {
      income: number
      expenses: number
      netAmount: number
      transactionCount: number
      categorySpending: Map<string, number>
    }>()

    historicalTransactions.forEach(({ transaction, category }) => {
      const monthKey = `${transaction.transactionDate.getFullYear()}-${String(transaction.transactionDate.getMonth() + 1).padStart(2, '0')}`
      const amount = parseFloat(transaction.amount)
      const isIncome = amount > 0
      const isExpense = amount < 0

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          income: 0,
          expenses: 0,
          netAmount: 0,
          transactionCount: 0,
          categorySpending: new Map()
        })
      }

      const monthData = monthlyData.get(monthKey)!
      monthData.transactionCount++
      monthData.netAmount += amount

      if (isIncome) {
        monthData.income += amount
      } else if (isExpense) {
        monthData.expenses += Math.abs(amount)
        
        // Track category spending
        const categoryName = category?.name || 'Uncategorized'
        const currentCategorySpending = monthData.categorySpending.get(categoryName) || 0
        monthData.categorySpending.set(categoryName, currentCategorySpending + Math.abs(amount))
      }
    })

    // Convert to array and sort by date
    const monthlyDataArray = Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        ...data,
        categorySpending: Object.fromEntries(data.categorySpending)
      }))
      .sort((a, b) => a.month.localeCompare(b.month))

    // Calculate trend analysis
    const calculateTrend = (values: number[]): { trend: 'increasing' | 'decreasing' | 'stable'; rate: number } => {
      if (values.length < 2) return { trend: 'stable', rate: 0 }
      
      // Simple linear regression
      const n = values.length
      const sumX = values.reduce((sum, _, i) => sum + i, 0)
      const sumY = values.reduce((sum, val) => sum + val, 0)
      const sumXY = values.reduce((sum, val, i) => sum + (i * val), 0)
      const sumXX = values.reduce((sum, _, i) => sum + (i * i), 0)
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
      const avgY = sumY / n
      
      const rate = Math.abs(slope / avgY * 100) // Percentage change per month
      
      if (Math.abs(slope) < avgY * 0.02) { // Less than 2% change
        return { trend: 'stable', rate: 0 }
      }
      
      return {
        trend: slope > 0 ? 'increasing' : 'decreasing',
        rate: Math.round(rate * 100) / 100
      }
    }

    // Analyze spending trends
    const expenseTrend = calculateTrend(monthlyDataArray.map(m => m.expenses))
    const incomeTrend = calculateTrend(monthlyDataArray.map(m => m.income))
    
    // Calculate seasonal patterns (if we have enough data)
    const seasonalPatterns = new Map<number, number>() // month -> multiplier
    if (monthlyDataArray.length >= 6) {
      const monthlyAverages = new Map<number, { total: number; count: number }>()
      
      monthlyDataArray.forEach(data => {
        const month = parseInt(data.month.split('-')[1])
        const current = monthlyAverages.get(month) || { total: 0, count: 0 }
        monthlyAverages.set(month, {
          total: current.total + data.expenses,
          count: current.count + 1
        })
      })
      
      const overallAverage = monthlyDataArray.reduce((sum, m) => sum + m.expenses, 0) / monthlyDataArray.length
      
      monthlyAverages.forEach((data, month) => {
        const monthAverage = data.total / data.count
        const multiplier = monthAverage / overallAverage
        seasonalPatterns.set(month, multiplier)
      })
    }

    // Generate forecasts
    const forecasts = []
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    for (let i = 1; i <= forecastMonths; i++) {
      const forecastDate = new Date(currentYear, currentMonth - 1 + i, 1)
      const forecastMonth = forecastDate.getMonth() + 1
      const forecastYear = forecastDate.getFullYear()
      const monthKey = `${forecastYear}-${String(forecastMonth).padStart(2, '0')}`

      // Base projections on recent 3-month average
      const recentMonths = monthlyDataArray.slice(-3)
      const avgExpenses = recentMonths.reduce((sum, m) => sum + m.expenses, 0) / recentMonths.length
      const avgIncome = recentMonths.reduce((sum, m) => sum + m.income, 0) / recentMonths.length

      // Apply trend adjustment
      let forecastExpenses = avgExpenses
      let forecastIncome = avgIncome

      if (expenseTrend.trend !== 'stable') {
        const trendMultiplier = expenseTrend.trend === 'increasing' ? 1 + (expenseTrend.rate / 100) : 1 - (expenseTrend.rate / 100)
        forecastExpenses *= Math.pow(trendMultiplier, i)
      }

      if (incomeTrend.trend !== 'stable') {
        const trendMultiplier = incomeTrend.trend === 'increasing' ? 1 + (incomeTrend.rate / 100) : 1 - (incomeTrend.rate / 100)
        forecastIncome *= Math.pow(trendMultiplier, i)
      }

      // Apply seasonal adjustment
      const seasonalMultiplier = seasonalPatterns.get(forecastMonth) || 1
      forecastExpenses *= seasonalMultiplier

      // Add recurring transactions
      let recurringIncome = 0
      let recurringExpenses = 0

      activeRecurring.forEach(recurring => {
        const amount = parseFloat(recurring.amount)
        const frequency = recurring.frequency

        // Calculate monthly equivalent
        let monthlyAmount = 0
        switch (frequency) {
          case 'daily':
            monthlyAmount = amount * 30
            break
          case 'weekly':
            monthlyAmount = amount * 4.33
            break
          case 'biweekly':
            monthlyAmount = amount * 2.17
            break
          case 'monthly':
            monthlyAmount = amount
            break
          case 'quarterly':
            monthlyAmount = amount / 3
            break
          case 'yearly':
            monthlyAmount = amount / 12
            break
        }

        if (monthlyAmount > 0) {
          recurringIncome += monthlyAmount
        } else {
          recurringExpenses += Math.abs(monthlyAmount)
        }
      })

      forecastIncome += recurringIncome
      forecastExpenses += recurringExpenses

      // Calculate confidence based on data availability and volatility
      const dataPoints = monthlyDataArray.length
      const expenseVolatility = calculateVolatility(monthlyDataArray.map(m => m.expenses))
      const confidence = Math.max(0.3, Math.min(0.95, (dataPoints / 12) * (1 - expenseVolatility / 100)))

      forecasts.push({
        month: monthKey,
        forecastIncome: Math.round(forecastIncome),
        forecastExpenses: Math.round(forecastExpenses),
        forecastNetAmount: Math.round(forecastIncome - forecastExpenses),
        confidence: Math.round(confidence * 100),
        recurringIncome: Math.round(recurringIncome),
        recurringExpenses: Math.round(recurringExpenses),
        baseIncome: Math.round(forecastIncome - recurringIncome),
        baseExpenses: Math.round(forecastExpenses - recurringExpenses)
      })
    }

    // Calculate savings opportunities
    const savingsOpportunities: Array<{
      category: string
      currentMonthlySpending: number
      potentialSavings: number
      annualSavings: number
      recommendation: string
    }> = []
    
    // High spending categories
    const categoryTotals = new Map<string, number>()
    monthlyDataArray.forEach(month => {
      Object.entries(month.categorySpending).forEach(([category, amount]) => {
        categoryTotals.set(category, (categoryTotals.get(category) || 0) + amount)
      })
    })

    const sortedCategories = Array.from(categoryTotals.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)

    sortedCategories.forEach(([category, totalAmount]) => {
      const monthlyAverage = totalAmount / monthlyDataArray.length
      const potentialSavings = monthlyAverage * 0.1 // Assume 10% reduction potential
      
      savingsOpportunities.push({
        category,
        currentMonthlySpending: Math.round(monthlyAverage),
        potentialSavings: Math.round(potentialSavings),
        annualSavings: Math.round(potentialSavings * 12),
        recommendation: `Consider reducing ${category} spending by 10%`
      })
    })

    // Budget optimization suggestions
    const budgetSuggestions: Array<{
      budgetName: string
      currentAmount: number
      avgSpending: number
      utilizationRate: number
      suggestedAmount?: number
      potentialSavings?: number
      additionalNeeded?: number
      type: 'reduce' | 'increase'
    }> = []
    
    for (const budget of activeBudgets) {
      const categoryIds = budget.categoryIds || []
      if (categoryIds.length === 0) continue

      // Calculate average spending for budget categories
      const relevantTransactions = historicalTransactions.filter(({ transaction }) => 
        categoryIds.includes(transaction.categoryId || '')
      )

      const monthlySpending = relevantTransactions.reduce((sum, { transaction }) => 
        sum + Math.abs(parseFloat(transaction.amount)), 0
      ) / Math.max(monthlyDataArray.length, 1)

      const budgetAmount = parseFloat(budget.amount)
      const utilizationRate = (monthlySpending / budgetAmount) * 100

      if (utilizationRate < 70) {
        budgetSuggestions.push({
          budgetName: budget.name,
          currentAmount: budgetAmount,
          avgSpending: Math.round(monthlySpending),
          utilizationRate: Math.round(utilizationRate),
          suggestedAmount: Math.round(monthlySpending * 1.1), // 10% buffer
          potentialSavings: Math.round(budgetAmount - (monthlySpending * 1.1)),
          type: 'reduce'
        })
      } else if (utilizationRate > 120) {
        budgetSuggestions.push({
          budgetName: budget.name,
          currentAmount: budgetAmount,
          avgSpending: Math.round(monthlySpending),
          utilizationRate: Math.round(utilizationRate),
          suggestedAmount: Math.round(monthlySpending * 1.15), // 15% buffer
          additionalNeeded: Math.round((monthlySpending * 1.15) - budgetAmount),
          type: 'increase'
        })
      }
    }

    return NextResponse.json({
      analysisType,
      forecastPeriod: `${forecastMonths} months`,
      dataRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        monthsAnalyzed: monthlyDataArray.length
      },
      trends: {
        expenses: expenseTrend,
        income: incomeTrend,
        seasonalPatterns: Object.fromEntries(seasonalPatterns)
      },
      historicalData: monthlyDataArray,
      forecasts,
      insights: {
        savingsOpportunities,
        budgetSuggestions,
        recurringTransactionsCount: activeRecurring.length,
        activeBudgetsCount: activeBudgets.length
      },
      confidence: {
        dataQuality: monthlyDataArray.length >= 6 ? 'good' : 'limited',
        forecastReliability: forecasts.length > 0 ? forecasts[0].confidence : 0
      }
    })

  } catch (error) {
    console.error('Error generating predictive analytics:', error)
    return NextResponse.json(
      { error: 'Failed to generate predictive analytics' },
      { status: 500 }
    )
  }
}

// Helper function to calculate volatility
function calculateVolatility(values: number[]): number {
  if (values.length < 2) return 0
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  const standardDeviation = Math.sqrt(variance)
  
  return (standardDeviation / mean) * 100 // Coefficient of variation as percentage
}
