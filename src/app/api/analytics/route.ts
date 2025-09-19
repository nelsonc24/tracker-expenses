import { NextResponse, NextRequest } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/db'
import { transactions, categories } from '@/db/schema'
import { eq, sql, and, gte, desc, lt } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '6m'

    // Calculate date ranges based on period
    const now = new Date()
    let months: number

    switch (period) {
      case '1m':
        months = 1
        break
      case '3m':
        months = 3
        break
      case '6m':
        months = 6
        break
      case '1y':
        months = 12
        break
      case 'all':
        months = 120 // 10 years as "all time"
        break
      default:
        months = 6
    }

    const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1)

    // 1. Monthly spending data
    const monthlyData = await db
      .select({
        month: sql<string>`to_char(${transactions.transactionDate}, 'YYYY-MM')`.as('month'),
        income: sql<number>`COALESCE(sum(case when ${transactions.amount} > 0 then ${transactions.amount} else 0 end), 0)`.as('income'),
        expenses: sql<number>`COALESCE(abs(sum(case when ${transactions.amount} < 0 then ${transactions.amount} else 0 end)), 0)`.as('expenses'),
        transactionCount: sql<number>`count(*)`.as('transaction_count')
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.id),
          gte(transactions.transactionDate, startDate)
        )
      )
      .groupBy(sql`to_char(${transactions.transactionDate}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${transactions.transactionDate}, 'YYYY-MM')`)

    // 2. Category spending (both income and expenses)
    const categorySpending = await db
      .select({
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        totalAmount: sql<number>`abs(sum(${transactions.amount}))`.as('total_amount'),
        transactionCount: sql<number>`count(*)`.as('transaction_count')
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.userId, user.id),
          gte(transactions.transactionDate, startDate)
          // Removed the filter for expenses only to include both income and expenses
        )
      )
      .groupBy(transactions.categoryId, categories.name, categories.color)
      .orderBy(desc(sql`abs(sum(${transactions.amount}))`))
      .limit(10)

    // 3. Top merchants/descriptions
    const topMerchants = await db
      .select({
        description: transactions.description,
        totalAmount: sql<number>`abs(sum(${transactions.amount}))`.as('total_amount'),
        transactionCount: sql<number>`count(*)`.as('transaction_count'),
        avgAmount: sql<number>`abs(avg(${transactions.amount}))`.as('avg_amount')
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.id),
          gte(transactions.transactionDate, startDate),
          lt(transactions.amount, '0') // Only expenses
        )
      )
      .groupBy(transactions.description)
      .having(sql`count(*) > 1`) // Only merchants with multiple transactions
      .orderBy(desc(sql`abs(sum(${transactions.amount}))`))
      .limit(10)

    // 4. Weekly spending trend (last 4 weeks)
    const fourWeeksAgo = new Date(now.getTime() - (4 * 7 * 24 * 60 * 60 * 1000))
    const weeklySpending = await db
      .select({
        week: sql<string>`'Week ' || (extract(week from ${transactions.transactionDate}) - extract(week from current_date) + 5)`.as('week'),
        weekNumber: sql<number>`extract(week from ${transactions.transactionDate})`.as('week_number'),
        spending: sql<number>`abs(sum(case when ${transactions.amount} < 0 then ${transactions.amount} else 0 end))`.as('spending')
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.id),
          gte(transactions.transactionDate, fourWeeksAgo)
        )
      )
      .groupBy(sql`extract(week from ${transactions.transactionDate})`)
      .orderBy(sql`extract(week from ${transactions.transactionDate})`)

    // 5. Overall summary stats
    const totalSummary = await db
      .select({
        totalTransactions: sql<number>`count(*)`.as('total_transactions'),
        totalIncome: sql<number>`sum(case when ${transactions.amount} > 0 then ${transactions.amount} else 0 end)`.as('total_income'),
        totalExpenses: sql<number>`abs(sum(case when ${transactions.amount} < 0 then ${transactions.amount} else 0 end))`.as('total_expenses')
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.id),
          gte(transactions.transactionDate, startDate)
        )
      )

    // Process monthly data to include savings and net
    const processedMonthlyData = monthlyData.map(month => {
      const income = Number(month.income || 0)
      const expenses = Number(month.expenses || 0)
      const savings = income - expenses
      const net = savings

      // Format month for display
      const [year, monthNum] = month.month.split('-')
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const formattedMonth = `${monthNames[parseInt(monthNum) - 1]} ${year}`

      return {
        month: formattedMonth,
        income,
        expenses,
        savings,
        net
      }
    })

    // Process category data for pie chart
    const processedCategoryData = categorySpending.map((cat) => ({
      name: cat.categoryName || 'Uncategorized',
      value: Number(cat.totalAmount || 0),
      color: cat.categoryColor || `#${Math.floor(Math.random()*16777215).toString(16)}`,
      transactions: Number(cat.transactionCount || 0)
    }))

    // Calculate summary metrics
    const summary = totalSummary[0]
    const totalIncome = Number(summary?.totalIncome || 0)
    const totalExpenses = Number(summary?.totalExpenses || 0)
    const avgMonthlyIncome = totalIncome / Math.max(processedMonthlyData.length, 1)
    const avgMonthlyExpenses = totalExpenses / Math.max(processedMonthlyData.length, 1)
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0

    return NextResponse.json({
      period,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: now.toISOString()
      },
      summary: {
        totalIncome,
        totalExpenses,
        totalTransactions: Number(summary?.totalTransactions || 0),
        avgMonthlyIncome,
        avgMonthlyExpenses,
        savingsRate,
        netAmount: totalIncome - totalExpenses
      },
      monthlyData: processedMonthlyData,
      categoryData: processedCategoryData,
      topMerchants: topMerchants.map(merchant => ({
        name: merchant.description || 'Unknown',
        amount: Number(merchant.totalAmount || 0),
        transactions: Number(merchant.transactionCount || 0),
        avgAmount: Number(merchant.avgAmount || 0)
      })),
      weeklySpending: weeklySpending.map((week, index) => ({
        week: `Week ${index + 1}`,
        spending: Number(week.spending || 0)
      }))
    })

  } catch (error) {
    console.error('Error fetching analytics data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
