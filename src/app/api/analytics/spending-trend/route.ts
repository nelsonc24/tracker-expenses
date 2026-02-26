import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { getUserTransactions } from '@/lib/db-utils'

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || 'last-7-days'

    const now = new Date()
    let startDate: Date
    const endDate: Date = now
    let aggregationType: 'daily' | 'weekly' | 'monthly' = 'daily'

    switch (period) {
      case 'last-7-days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        aggregationType = 'daily'
        break
      case 'last-30-days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        aggregationType = 'daily'
        break
      case 'last-3-months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
        aggregationType = 'weekly'
        break
      case 'last-6-months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1)
        aggregationType = 'weekly'
        break
      case 'last-year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        aggregationType = 'monthly'
        break
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        aggregationType = 'daily'
        break
    }

    // Fetch transactions for the period
    const transactions = await getUserTransactions(user.id, {
      startDate,
      endDate,
      limit: 10000 // Large limit to get all transactions in period
    })

    // Aggregate spending data based on period
    type CategoryAccum = { name: string; color: string; amount: number }
    const spendingMap = new Map<string, { total: number; categories: Map<string, CategoryAccum> }>()

    transactions.forEach(({ transaction, category }) => {
      const date = new Date(transaction.transactionDate)
      let key: string

      if (aggregationType === 'daily') {
        // Daily aggregation: YYYY-MM-DD
        key = date.toISOString().split('T')[0]
      } else if (aggregationType === 'weekly') {
        // Weekly aggregation: Get Monday of the week
        const monday = new Date(date)
        monday.setDate(date.getDate() - date.getDay() + 1)
        key = monday.toISOString().split('T')[0]
      } else {
        // Monthly aggregation: YYYY-MM-01
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
      }

      // Only count expenses (negative amounts), not income
      // Spending trend should show how much was spent, not total transaction volume
      const amount = parseFloat(transaction.amount)
      if (amount < 0) {
        const expense = Math.abs(amount)
        if (!spendingMap.has(key)) {
          spendingMap.set(key, { total: 0, categories: new Map() })
        }
        const entry = spendingMap.get(key)!
        entry.total += expense

        const catName = category?.name || 'Uncategorized'
        const catColor = category?.color || '#6b7280'
        if (!entry.categories.has(catName)) {
          entry.categories.set(catName, { name: catName, color: catColor, amount: 0 })
        }
        entry.categories.get(catName)!.amount += expense
      }
    })

    // Convert to array and sort
    let trendData = Array.from(spendingMap.entries())
      .map(([date, { total, categories }]) => ({
        date,
        amount: total,
        categories: Array.from(categories.values()).sort((a, b) => b.amount - a.amount)
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Fill in missing dates/periods with zero values for better visualization
    if (aggregationType === 'daily' && trendData.length > 0) {
      const filledData: Array<{ date: string; amount: number; categories: Array<{ name: string; color: string; amount: number }> }> = []
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0]
        const existing = trendData.find(item => item.date === dateKey)
        filledData.push({
          date: dateKey,
          amount: existing ? existing.amount : 0,
          categories: existing ? existing.categories : []
        })
      }
      trendData = filledData
    }

    // Calculate summary statistics
    const totalSpending = trendData.reduce((sum, item) => sum + item.amount, 0)
    const averageSpending = trendData.length > 0 ? totalSpending / trendData.length : 0
    const maxSpending = trendData.length > 0 ? Math.max(...trendData.map(item => item.amount)) : 0

    return NextResponse.json({
      period,
      aggregationType,
      data: trendData,
      summary: {
        totalSpending,
        averageSpending,
        maxSpending,
        dataPoints: trendData.length
      },
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    })
  } catch (error) {
    console.error('Error fetching spending trend:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
