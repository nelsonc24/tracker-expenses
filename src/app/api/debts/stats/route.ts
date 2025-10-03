import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { debts, debtPayments } from '@/db/schema'
import { eq, and, sql, gte } from 'drizzle-orm'

// GET /api/debts/stats - Get debt statistics for the user
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all active debts
    const activeDebts = await db
      .select()
      .from(debts)
      .where(and(eq(debts.userId, userId), eq(debts.status, 'active')))

    // Calculate total debt
    const totalDebt = activeDebts.reduce(
      (sum, debt) => sum + parseFloat(debt.currentBalance),
      0
    )

    // Calculate total monthly payments
    const totalMonthlyPayments = activeDebts.reduce((sum, debt) => {
      const payment = parseFloat(debt.minimumPayment)
      if (debt.paymentFrequency === 'weekly') {
        return sum + (payment * 52) / 12
      } else if (debt.paymentFrequency === 'biweekly') {
        return sum + (payment * 26) / 12
      }
      return sum + payment
    }, 0)

    // Calculate weighted average interest rate
    const weightedRate = activeDebts.reduce((sum, debt) => {
      const balance = parseFloat(debt.currentBalance)
      const rate = parseFloat(debt.interestRate)
      return sum + (balance * rate)
    }, 0)
    const avgInterestRate = totalDebt > 0 ? weightedRate / totalDebt : 0

    // Get debt breakdown by type
    const debtByType = activeDebts.reduce((acc, debt) => {
      const type = debt.debtType
      const balance = parseFloat(debt.currentBalance)
      if (!acc[type]) {
        acc[type] = { count: 0, total: 0 }
      }
      acc[type].count++
      acc[type].total += balance
      return acc
    }, {} as Record<string, { count: number; total: number }>)

    // Get YTD interest paid
    const yearStart = new Date(new Date().getFullYear(), 0, 1)
    let totalInterestPaidYTD = 0
    
    try {
      const ytdPayments = await db
        .select({
          totalInterest: sql<string>`COALESCE(SUM(CAST(${debtPayments.interestAmount} AS NUMERIC)), 0)`,
        })
        .from(debtPayments)
        .where(
          and(
            eq(debtPayments.userId, userId),
            gte(debtPayments.paymentDate, yearStart)
          )
        )

      totalInterestPaidYTD = parseFloat(ytdPayments[0]?.totalInterest || '0')
    } catch (error) {
      // If debt_payments table doesn't exist yet or query fails, default to 0
      console.log('Unable to fetch YTD interest, defaulting to 0:', error)
      totalInterestPaidYTD = 0
    }

    // Calculate projected annual interest (simple calculation)
    const projectedAnnualInterest = activeDebts.reduce((sum, debt) => {
      const balance = parseFloat(debt.currentBalance)
      const rate = parseFloat(debt.interestRate) / 100
      return sum + (balance * rate)
    }, 0)

    // Get payment history count
    let paymentCount = 0
    try {
      const paymentCountResult = await db
        .select({
          count: sql<string>`CAST(COUNT(*) AS TEXT)`,
        })
        .from(debtPayments)
        .where(eq(debtPayments.userId, userId))

      paymentCount = parseInt(paymentCountResult[0]?.count || '0')
    } catch (error) {
      // If debt_payments table doesn't exist yet, default to 0
      console.log('Unable to fetch payment count, defaulting to 0:', error)
      paymentCount = 0
    }

    // Get debts by interest rate range
    const debtByRate = {
      low: activeDebts.filter(d => parseFloat(d.interestRate) < 5).length,
      medium: activeDebts.filter(d => {
        const rate = parseFloat(d.interestRate)
        return rate >= 5 && rate < 10
      }).length,
      high: activeDebts.filter(d => {
        const rate = parseFloat(d.interestRate)
        return rate >= 10 && rate < 20
      }).length,
      veryHigh: activeDebts.filter(d => parseFloat(d.interestRate) >= 20).length,
    }

    return NextResponse.json({
      totalDebt: totalDebt.toFixed(2),
      totalMonthlyPayments: totalMonthlyPayments.toFixed(2),
      avgInterestRate: avgInterestRate.toFixed(2),
      activeDebtCount: activeDebts.length,
      debtByType,
      debtByRate,
      totalInterestPaidYTD: totalInterestPaidYTD.toFixed(2),
      projectedAnnualInterest: projectedAnnualInterest.toFixed(2),
      totalPaymentsLogged: paymentCount,
      highestInterestDebt: activeDebts.length > 0
        ? activeDebts.reduce((max, debt) =>
            parseFloat(debt.interestRate) > parseFloat(max.interestRate) ? debt : max
          )
        : null,
      largestDebt: activeDebts.length > 0
        ? activeDebts.reduce((max, debt) =>
            parseFloat(debt.currentBalance) > parseFloat(max.currentBalance) ? debt : max
          )
        : null,
    })
  } catch (error) {
    console.error('Error fetching debt stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch debt statistics' },
      { status: 500 }
    )
  }
}
