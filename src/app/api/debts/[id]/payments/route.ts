import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { debtPayments, debts, type InsertDebtPayment } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { z } from 'zod'

// Validation schema for creating payments
const paymentSchema = z.object({
  paymentDate: z.string(),
  paymentAmount: z.string().regex(/^\d+\.?\d{0,2}$/, 'Invalid payment amount'),
  principalAmount: z.string().regex(/^\d+\.?\d{0,2}$/, 'Invalid principal amount'),
  interestAmount: z.string().regex(/^\d+\.?\d{0,2}$/).optional(),
  feesAmount: z.string().regex(/^\d+\.?\d{0,2}$/).optional(),
  fromAccountId: z.string().uuid().optional(),
  transactionId: z.string().uuid().optional(),
  confirmationNumber: z.string().optional(),
  paymentMethod: z.enum(['bank_transfer', 'credit_card', 'cash', 'check', 'auto_pay']).optional(),
  notes: z.string().optional(),
  isExtraPayment: z.boolean().default(false),
  isAutomated: z.boolean().default(false),
})

// GET /api/debts/[id]/payments - Get all payments for a specific debt
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify debt belongs to user
    const [debt] = await db
      .select()
      .from(debts)
      .where(and(eq(debts.id, id), eq(debts.userId, userId)))
      .limit(1)

    if (!debt) {
      return NextResponse.json({ error: 'Debt not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const payments = await db
      .select()
      .from(debtPayments)
      .where(eq(debtPayments.debtId, id))
      .orderBy(desc(debtPayments.paymentDate))
      .limit(limit)
      .offset(offset)

    return NextResponse.json(payments)
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}

// POST /api/debts/[id]/payments - Create a new payment for a debt
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: debtId } = await params
    const body = await request.json()
    const validatedData = paymentSchema.parse(body)

    // Verify debt belongs to user and get current balance
    const [debt] = await db
      .select()
      .from(debts)
      .where(and(eq(debts.id, debtId), eq(debts.userId, userId)))
      .limit(1)

    if (!debt) {
      return NextResponse.json({ error: 'Debt not found' }, { status: 404 })
    }

    // Calculate new balance
    const currentBalance = parseFloat(debt.currentBalance)
    const paymentAmount = parseFloat(validatedData.paymentAmount)
    const newBalance = Math.max(0, currentBalance - paymentAmount)

    // Create payment record
    const newPayment: InsertDebtPayment = {
      userId,
      debtId,
      paymentDate: new Date(validatedData.paymentDate),
      paymentAmount: validatedData.paymentAmount,
      principalAmount: validatedData.principalAmount,
      interestAmount: validatedData.interestAmount || '0.00',
      feesAmount: validatedData.feesAmount || '0.00',
      fromAccountId: validatedData.fromAccountId,
      transactionId: validatedData.transactionId,
      balanceAfterPayment: newBalance.toFixed(2),
      confirmationNumber: validatedData.confirmationNumber,
      paymentMethod: validatedData.paymentMethod,
      notes: validatedData.notes,
      isExtraPayment: validatedData.isExtraPayment,
      isAutomated: validatedData.isAutomated,
    }

    const [createdPayment] = await db
      .insert(debtPayments)
      .values(newPayment)
      .returning()

    // Update debt balance and payment tracking
    const updateData: Record<string, unknown> = {
      currentBalance: newBalance.toFixed(2),
      lastPaymentDate: new Date(validatedData.paymentDate),
      lastPaymentAmount: validatedData.paymentAmount,
      lastBalanceUpdate: new Date(),
      updatedAt: new Date(),
    }

    // If balance is zero, mark as paid off
    if (newBalance === 0) {
      updateData.status = 'paid_off'
    }

    await db
      .update(debts)
      .set(updateData)
      .where(eq(debts.id, debtId))

    return NextResponse.json(createdPayment, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating payment:', error)
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    )
  }
}
