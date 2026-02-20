import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { getCategorySpending } from '@/lib/db-utils'

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || 'all'

    let startDate: Date | undefined
    let endDate: Date | undefined

    const now = new Date()
    
    switch (period) {
      case '1m':
      case 'current-month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        break
      case '3m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
        endDate = now
        break
      case '6m':
      case 'last-6-months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1)
        endDate = now
        break
      case '1y':
      case 'last-year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        endDate = now
        break
      case 'all':
      case 'all-time':
      default:
        // No date filters for all-time
        break
    }

    const categorySpending = await getCategorySpending(user.id, startDate, endDate)

    // Transform the data for the chart
    // Note: getCategorySpending already filters for debit transactions and excludes transfers
    const categoryData = categorySpending
      .map((cs, index) => ({
        category: cs.categoryName || 'Uncategorized',
        amount: parseFloat(cs.totalAmount || '0'),
        color: cs.categoryColor || `hsl(${index * 60}, 70%, 50%)`,
        transactionCount: cs.transactionCount
      }))

    return NextResponse.json({
      period,
      data: categoryData,
      total: categoryData.reduce((sum, item) => sum + item.amount, 0),
      dateRange: startDate && endDate ? {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      } : null
    })
  } catch (error) {
    console.error('Error fetching category spending:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}