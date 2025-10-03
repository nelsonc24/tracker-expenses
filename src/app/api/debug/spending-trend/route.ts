import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { getUserTransactions } from '@/lib/db-utils'

/**
 * Debug endpoint to verify spending trend calculation
 * GET /api/debug/spending-trend
 */
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const testDate = searchParams.get('date') // Format: YYYY-MM-DD

    // Get last 30 days of transactions
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const now = new Date()

    const transactions = await getUserTransactions(user.id, {
      startDate: thirtyDaysAgo,
      endDate: now,
      limit: 10000
    })

    // Group by date - exactly as the dashboard does
    const dailySpending = new Map<string, number>()
    
    transactions.forEach(({ transaction }) => {
      const date = transaction.transactionDate.toISOString().split('T')[0]
      const amount = Math.abs(parseFloat(transaction.amount))
      dailySpending.set(date, (dailySpending.get(date) || 0) + amount)
    })

    // Get last 7 days as the dashboard does
    const dashboardTrendData = Array.from(dailySpending.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7)

    // Also simulate the API endpoint logic
    const spendingMap = new Map<string, number>()
    
    transactions.forEach(({ transaction }) => {
      const date = new Date(transaction.transactionDate)
      const key = date.toISOString().split('T')[0]
      const amount = Math.abs(parseFloat(transaction.amount))
      spendingMap.set(key, (spendingMap.get(key) || 0) + amount)
    })

    const apiTrendData = Array.from(spendingMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7)

    // Get details for specific date if provided
    let dateDetails = null
    if (testDate) {
      const dateTransactions = transactions
        .filter(({ transaction }) => {
          const txnDate = transaction.transactionDate.toISOString().split('T')[0]
          return txnDate === testDate
        })
        .map(({ transaction }) => ({
          id: transaction.id,
          date: transaction.transactionDate.toISOString(),
          amount: transaction.amount,
          merchant: transaction.merchant,
          description: transaction.description
        }))

      const total = dateTransactions.reduce((sum, txn) => sum + Math.abs(parseFloat(txn.amount)), 0)

      dateDetails = {
        date: testDate,
        transactionCount: dateTransactions.length,
        total,
        transactions: dateTransactions
      }
    }

    // Compare the two datasets
    const comparison = dashboardTrendData.map((dashItem, index) => {
      const apiItem = apiTrendData[index]
      return {
        date: dashItem.date,
        dashboard: dashItem.amount,
        api: apiItem?.amount || 0,
        match: Math.abs(dashItem.amount - (apiItem?.amount || 0)) < 0.01
      }
    })

    return NextResponse.json({
      message: 'Spending Trend Debug Info',
      totalTransactions: transactions.length,
      dateRange: {
        start: thirtyDaysAgo.toISOString(),
        end: now.toISOString()
      },
      dashboardTrendData,
      apiTrendData,
      comparison,
      allDatesMatch: comparison.every(c => c.match),
      dateDetails
    })
  } catch (error) {
    console.error('Error in debug endpoint:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
