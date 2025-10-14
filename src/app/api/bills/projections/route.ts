import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { bills, transactions } from '@/db/schema'
import { eq, and, gte, desc } from 'drizzle-orm'
import { startOfMonth, endOfMonth, addMonths, startOfWeek, endOfWeek, addWeeks, startOfYear, endOfYear, addYears, format } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month' // month, quarter, year
    const periodsAhead = parseInt(searchParams.get('periods') || '6')

    // Get all active bills for the user
    const userBills = await db
      .select()
      .from(bills)
      .where(and(eq(bills.userId, userId), eq(bills.isActive, true)))

    // Calculate projections based on period
    const projections = []
    const now = new Date()

    for (let i = 0; i < periodsAhead; i++) {
      let periodStart: Date
      let periodEnd: Date
      let periodLabel: string

      switch (period) {
        case 'week':
          periodStart = startOfWeek(addWeeks(now, i))
          periodEnd = endOfWeek(addWeeks(now, i))
          periodLabel = `Week of ${format(periodStart, 'MMM dd, yyyy')}`
          break
        case 'quarter':
          periodStart = startOfMonth(addMonths(now, i * 3))
          periodEnd = endOfMonth(addMonths(periodStart, 2))
          periodLabel = `Q${Math.floor((periodStart.getMonth() / 3)) + 1} ${periodStart.getFullYear()}`
          break
        case 'year':
          periodStart = startOfYear(addYears(now, i))
          periodEnd = endOfYear(addYears(now, i))
          periodLabel = `${periodStart.getFullYear()}`
          break
        default: // month
          periodStart = startOfMonth(addMonths(now, i))
          periodEnd = endOfMonth(addMonths(now, i))
          periodLabel = format(periodStart, 'MMMM yyyy')
      }

      const periodBills = []
      let totalAmount = 0

      for (const bill of userBills) {
        // Calculate how many times this bill occurs in the period
        const billFrequencyInPeriod = calculateBillOccurrences(
          bill.frequency,
          periodStart,
          periodEnd,
          bill.dueDate
        )

        if (billFrequencyInPeriod > 0) {
          const billAmount = parseFloat(bill.amount) * billFrequencyInPeriod
          totalAmount += billAmount

          // Get last few payments for this bill to calculate average
          const recentPayments = await db
            .select()
            .from(transactions)
            .where(and(
              eq(transactions.userId, userId),
              eq(transactions.billId, bill.id),
              gte(transactions.transactionDate, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)) // Last 90 days
            ))
            .orderBy(desc(transactions.transactionDate))
            .limit(6)

          const averageAmount = recentPayments.length > 0
            ? recentPayments.reduce((sum, t) => sum + parseFloat(t.amount), 0) / recentPayments.length
            : parseFloat(bill.amount)

          periodBills.push({
            id: bill.id,
            name: bill.name,
            frequency: bill.frequency,
            estimatedAmount: billAmount,
            averageAmount: averageAmount * billFrequencyInPeriod,
            occurrences: billFrequencyInPeriod,
            dueDate: bill.dueDate,
            dueDay: bill.dueDay,
            isAutoPay: bill.isAutoPay,
            category: bill.categoryId,
            tags: bill.tags || [],
            lastPaidAmount: bill.lastPaidAmount,
            lastPaidDate: bill.lastPaidDate,
            notes: bill.notes,
          })
        }
      }

      projections.push({
        period: periodLabel,
        startDate: periodStart,
        endDate: periodEnd,
        totalEstimated: totalAmount,
        billsCount: periodBills.length,
        bills: periodBills.sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime()),
      })
    }

    // Calculate summary statistics
    const totalProjected = projections.reduce((sum, p) => sum + p.totalEstimated, 0)
    const averagePerPeriod = totalProjected / periodsAhead
    const highestPeriod = projections.reduce((max, p) => p.totalEstimated > max.totalEstimated ? p : max, projections[0])
    const lowestPeriod = projections.reduce((min, p) => p.totalEstimated < min.totalEstimated ? p : min, projections[0])

    return NextResponse.json({
      projections,
      summary: {
        totalProjected,
        averagePerPeriod,
        highestPeriod: {
          period: highestPeriod.period,
          amount: highestPeriod.totalEstimated,
        },
        lowestPeriod: {
          period: lowestPeriod.period,
          amount: lowestPeriod.totalEstimated,
        },
        period,
        periodsAhead,
      },
    })
  } catch (error) {
    console.error('Error calculating bill projections:', error)
    return NextResponse.json(
      { error: 'Failed to calculate bill projections' },
      { status: 500 }
    )
  }
}

function calculateBillOccurrences(
  frequency: string,
  periodStart: Date,
  periodEnd: Date,
  dueDate: Date | null
): number {
  if (!dueDate) return 0

  const billDue = new Date(dueDate)
  let occurrences = 0
  const currentDate = new Date(billDue)

  // Adjust current date to be within or after the period start
  while (currentDate < periodStart) {
    switch (frequency) {
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + 7)
        break
      case 'biweekly':
        currentDate.setDate(currentDate.getDate() + 14)
        break
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + 1)
        break
      case 'quarterly':
        currentDate.setMonth(currentDate.getMonth() + 3)
        break
      case 'yearly':
        currentDate.setFullYear(currentDate.getFullYear() + 1)
        break
      default:
        return 0
    }
  }

  // Count occurrences within the period
  while (currentDate <= periodEnd) {
    occurrences++

    switch (frequency) {
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + 7)
        break
      case 'biweekly':
        currentDate.setDate(currentDate.getDate() + 14)
        break
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + 1)
        break
      case 'quarterly':
        currentDate.setMonth(currentDate.getMonth() + 3)
        break
      case 'yearly':
        currentDate.setFullYear(currentDate.getFullYear() + 1)
        break
    }
  }

  return occurrences
}
