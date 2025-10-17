import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { debtPayments, debts } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { z } from 'zod'

// Validation schema for updating payments
const updatePaymentSchema = z.object({
  paymentDate: z.string().optional(),
  paymentAmount: z.string().regex(/^\d+\.?\d{0,2}$/, 'Invalid payment amount').optional(),
  principalAmount: z.string().regex(/^\d+\.?\d{0,2}$/, 'Invalid principal amount').optional(),
  interestAmount: z.string().regex(/^\d+\.?\d{0,2}$/).optional(),
  feesAmount: z.string().regex(/^\d+\.?\d{0,2}$/).optional(),
  fromAccountId: z.string().uuid().optional().nullable(),
  transactionId: z.string().uuid().optional().nullable(),
  confirmationNumber: z.string().optional().nullable(),
  paymentMethod: z.enum(['bank_transfer', 'credit_card', 'cash', 'check', 'auto_pay']).optional().nullable(),
  notes: z.string().optional().nullable(),
  isExtraPayment: z.boolean().optional(),
  isAutomated: z.boolean().optional(),
})

// Helper function to recalculate debt balance based on all payments
async function recalculateDebtBalance(debtId: string, userId: string) {
  // Get the debt's original/current balance
  const [debt] = await db
    .select()
    .from(debts)
    .where(and(eq(debts.id, debtId), eq(debts.userId, userId)))
    .limit(1)

  if (!debt) {
    throw new Error('Debt not found')
  }

  // Get all payments for this debt ordered by payment date
  const payments = await db
    .select()
    .from(debtPayments)
    .where(eq(debtPayments.debtId, debtId))
    .orderBy(desc(debtPayments.paymentDate))

  // Calculate current balance from original balance minus all payments
  const originalBalance = parseFloat(debt.originalAmount || debt.currentBalance)
  const totalPaid = payments.reduce((sum, payment) => sum + parseFloat(payment.paymentAmount), 0)
  const newBalance = Math.max(0, originalBalance - totalPaid)

  // Get the most recent payment for tracking
  const latestPayment = payments.length > 0 ? payments[0] : null

  // Update debt record
  const updateData: Record<string, unknown> = {
    currentBalance: newBalance.toFixed(2),
    lastBalanceUpdate: new Date(),
    updatedAt: new Date(),
  }

  if (latestPayment) {
    updateData.lastPaymentDate = latestPayment.paymentDate
    updateData.lastPaymentAmount = latestPayment.paymentAmount
  } else {
    updateData.lastPaymentDate = null
    updateData.lastPaymentAmount = null
  }

  // Update status based on balance
  if (newBalance === 0 && payments.length > 0) {
    updateData.status = 'paid_off'
  } else if (debt.status === 'paid_off' && newBalance > 0) {
    updateData.status = 'active'
  }

  await db
    .update(debts)
    .set(updateData)
    .where(eq(debts.id, debtId))

  return newBalance
}

// PATCH /api/debts/[id]/payments/[paymentId] - Update a payment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: debtId, paymentId } = await params
    const body = await request.json()
    const validatedData = updatePaymentSchema.parse(body)

    // Verify payment exists and belongs to user
    const [payment] = await db
      .select()
      .from(debtPayments)
      .where(and(
        eq(debtPayments.id, paymentId),
        eq(debtPayments.debtId, debtId),
        eq(debtPayments.userId, userId)
      ))
      .limit(1)

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (validatedData.paymentDate) {
      updateData.paymentDate = new Date(validatedData.paymentDate)
    }
    if (validatedData.paymentAmount) {
      updateData.paymentAmount = validatedData.paymentAmount
    }
    if (validatedData.principalAmount) {
      updateData.principalAmount = validatedData.principalAmount
    }
    if (validatedData.interestAmount !== undefined) {
      updateData.interestAmount = validatedData.interestAmount || '0.00'
    }
    if (validatedData.feesAmount !== undefined) {
      updateData.feesAmount = validatedData.feesAmount || '0.00'
    }
    if (validatedData.fromAccountId !== undefined) {
      updateData.fromAccountId = validatedData.fromAccountId
    }
    if (validatedData.transactionId !== undefined) {
      updateData.transactionId = validatedData.transactionId
    }
    if (validatedData.confirmationNumber !== undefined) {
      updateData.confirmationNumber = validatedData.confirmationNumber
    }
    if (validatedData.paymentMethod !== undefined) {
      updateData.paymentMethod = validatedData.paymentMethod
    }
    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes
    }
    if (validatedData.isExtraPayment !== undefined) {
      updateData.isExtraPayment = validatedData.isExtraPayment
    }
    if (validatedData.isAutomated !== undefined) {
      updateData.isAutomated = validatedData.isAutomated
    }

    // Update payment record
    const [updatedPayment] = await db
      .update(debtPayments)
      .set(updateData)
      .where(eq(debtPayments.id, paymentId))
      .returning()

    // Recalculate debt balance
    await recalculateDebtBalance(debtId, userId)

    return NextResponse.json(updatedPayment)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating payment:', error)
    return NextResponse.json(
      { error: 'Failed to update payment' },
      { status: 500 }
    )
  }
}

// DELETE /api/debts/[id]/payments/[paymentId] - Delete a payment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: debtId, paymentId } = await params

    // Verify payment exists and belongs to user
    const [payment] = await db
      .select()
      .from(debtPayments)
      .where(and(
        eq(debtPayments.id, paymentId),
        eq(debtPayments.debtId, debtId),
        eq(debtPayments.userId, userId)
      ))
      .limit(1)

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Delete payment
    await db
      .delete(debtPayments)
      .where(eq(debtPayments.id, paymentId))

    // Recalculate debt balance
    await recalculateDebtBalance(debtId, userId)

    return NextResponse.json({ success: true, message: 'Payment deleted successfully' })
  } catch (error) {
    console.error('Error deleting payment:', error)
    return NextResponse.json(
      { error: 'Failed to delete payment' },
      { status: 500 }
    )
  }
}
