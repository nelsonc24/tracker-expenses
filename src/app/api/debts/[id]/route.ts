import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { debts, debtPayments } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { z } from 'zod'

// Validation schema for updating debts
const updateDebtSchema = z.object({
  name: z.string().min(1).optional(),
  debtType: z.enum([
    'credit_card',
    'personal_loan',
    'student_loan',
    'mortgage',
    'car_loan',
    'medical',
    'personal',
    'line_of_credit',
    'bnpl'
  ]).optional(),
  creditorName: z.string().min(1).optional(),
  accountNumber: z.string().optional(),
  currentBalance: z.string().regex(/^\d+\.?\d{0,2}$/).optional(),
  originalAmount: z.string().regex(/^\d+\.?\d{0,2}$/).optional(),
  creditLimit: z.string().regex(/^\d+\.?\d{0,2}$/).optional(),
  interestRate: z.string().regex(/^\d+\.?\d{0,2}$/).optional(),
  isVariableRate: z.boolean().optional(),
  interestCalculationMethod: z.enum(['simple', 'compound', 'daily']).optional(),
  minimumPayment: z.string().regex(/^\d+\.?\d{0,2}$/).optional(),
  paymentFrequency: z.enum(['weekly', 'biweekly', 'monthly', 'one_time']).optional(),
  paymentDueDay: z.number().min(1).max(31).optional(),
  nextDueDate: z.string().optional(),
  loanStartDate: z.string().optional(),
  loanMaturityDate: z.string().optional(),
  loanTermMonths: z.number().optional(),
  lateFee: z.string().regex(/^\d+\.?\d{0,2}$/).optional(),
  gracePeriodDays: z.number().optional(),
  status: z.enum(['active', 'paid_off', 'in_collections', 'settled', 'archived']).optional(),
  payoffPriority: z.number().min(1).max(10).optional(),
  linkedAccountId: z.string().uuid().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
})

// GET /api/debts/[id] - Get a specific debt
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

    const [debt] = await db
      .select()
      .from(debts)
      .where(and(eq(debts.id, id), eq(debts.userId, userId)))
      .limit(1)

    if (!debt) {
      return NextResponse.json({ error: 'Debt not found' }, { status: 404 })
    }

    // Get payment history for this debt
    const payments = await db
      .select()
      .from(debtPayments)
      .where(eq(debtPayments.debtId, id))
      .orderBy(desc(debtPayments.paymentDate))
      .limit(10)

    return NextResponse.json({
      ...debt,
      recentPayments: payments,
    })
  } catch (error) {
    console.error('Error fetching debt:', error)
    return NextResponse.json(
      { error: 'Failed to fetch debt' },
      { status: 500 }
    )
  }
}

// PUT /api/debts/[id] - Update a specific debt
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = updateDebtSchema.parse(body)

    // Check if debt exists and belongs to user
    const [existingDebt] = await db
      .select()
      .from(debts)
      .where(and(eq(debts.id, id), eq(debts.userId, userId)))
      .limit(1)

    if (!existingDebt) {
      return NextResponse.json({ error: 'Debt not found' }, { status: 404 })
    }

    // Build update object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {
      ...validatedData,
      updatedAt: new Date(),
    }

    // Convert date strings to Date objects
    if (validatedData.nextDueDate) {
      updateData.nextDueDate = new Date(validatedData.nextDueDate)
    }
    if (validatedData.loanStartDate) {
      updateData.loanStartDate = new Date(validatedData.loanStartDate)
    }
    if (validatedData.loanMaturityDate) {
      updateData.loanMaturityDate = new Date(validatedData.loanMaturityDate)
    }

    // Update balance timestamp if balance changed
    if (validatedData.currentBalance) {
      updateData.lastBalanceUpdate = new Date()
    }

    const [updatedDebt] = await db
      .update(debts)
      .set(updateData)
      .where(and(eq(debts.id, id), eq(debts.userId, userId)))
      .returning()

    return NextResponse.json(updatedDebt)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating debt:', error)
    return NextResponse.json(
      { error: 'Failed to update debt' },
      { status: 500 }
    )
  }
}

// DELETE /api/debts/[id] - Delete a specific debt
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if debt exists and belongs to user
    const [existingDebt] = await db
      .select()
      .from(debts)
      .where(and(eq(debts.id, id), eq(debts.userId, userId)))
      .limit(1)

    if (!existingDebt) {
      return NextResponse.json({ error: 'Debt not found' }, { status: 404 })
    }

    // Delete the debt (cascade will delete related payments)
    await db
      .delete(debts)
      .where(and(eq(debts.id, id), eq(debts.userId, userId)))

    return NextResponse.json({ message: 'Debt deleted successfully' })
  } catch (error) {
    console.error('Error deleting debt:', error)
    return NextResponse.json(
      { error: 'Failed to delete debt' },
      { status: 500 }
    )
  }
}
