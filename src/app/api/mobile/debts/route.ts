import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { debts } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'

// GET /api/mobile/debts
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'active', 'paid_off', etc. — null = all

    const conditions = [eq(debts.userId, userId)]
    if (status) {
      conditions.push(eq(debts.status, status))
    }

    const userDebts = await db
      .select()
      .from(debts)
      .where(and(...conditions))
      .orderBy(desc(debts.createdAt))

    const formatted = userDebts.map((d) => {
      const currentBalance = parseFloat(d.currentBalance)
      const originalAmount = d.originalAmount ? parseFloat(d.originalAmount) : null
      const creditLimit = d.creditLimit ? parseFloat(d.creditLimit) : null
      const paidAmount = originalAmount !== null ? Math.max(0, originalAmount - currentBalance) : null
      const payoffProgress =
        originalAmount !== null && originalAmount > 0
          ? Math.min(100, Math.round((paidAmount! / originalAmount) * 100))
          : null

      return {
        id: d.id,
        name: d.name,
        debtType: d.debtType,
        creditorName: d.creditorName,
        accountNumber: d.accountNumber,
        currentBalance,
        originalAmount,
        creditLimit,
        paidAmount,
        payoffProgress,
        interestRate: parseFloat(d.interestRate),
        isVariableRate: d.isVariableRate,
        minimumPayment: parseFloat(d.minimumPayment),
        paymentFrequency: d.paymentFrequency,
        paymentDueDay: d.paymentDueDay,
        nextDueDate: d.nextDueDate,
        loanStartDate: d.loanStartDate,
        loanMaturityDate: d.loanMaturityDate,
        loanTermMonths: d.loanTermMonths,
        status: d.status,
        payoffPriority: d.payoffPriority,
        linkedAccountId: d.linkedAccountId,
        color: d.color,
        icon: d.icon,
        currency: d.currency,
        tags: d.tags ?? [],
        notes: d.notes,
        lastPaymentDate: d.lastPaymentDate,
        lastPaymentAmount: d.lastPaymentAmount ? parseFloat(d.lastPaymentAmount) : null,
        createdAt: d.createdAt,
      }
    })

    // Summary totals
    const activeDebts = formatted.filter((d) => d.status === 'active')
    const summary = {
      totalBalance: activeDebts.reduce((sum, d) => sum + d.currentBalance, 0),
      totalMinimumPayments: activeDebts.reduce((sum, d) => sum + d.minimumPayment, 0),
      count: activeDebts.length,
    }

    return NextResponse.json({ data: formatted, summary })
  } catch (error) {
    console.error('[Mobile Debts Error]:', error)
    return NextResponse.json({ error: 'Failed to fetch debts' }, { status: 500 })
  }
}
