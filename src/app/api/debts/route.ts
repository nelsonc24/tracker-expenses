import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { debts, type InsertDebt } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { z } from 'zod'

// Validation schema for creating/updating debts
const debtSchema = z.object({
  name: z.string().min(1, 'Debt name is required'),
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
  ]),
  creditorName: z.string().min(1, 'Creditor name is required'),
  accountNumber: z.string().optional(),
  currentBalance: z.string().regex(/^\d+\.?\d{0,2}$/, 'Invalid balance format'),
  originalAmount: z.string().regex(/^\d+\.?\d{0,2}$/).optional(),
  creditLimit: z.string().regex(/^\d+\.?\d{0,2}$/).optional(),
  interestRate: z.string().regex(/^\d+\.?\d{0,2}$/, 'Invalid interest rate'),
  isVariableRate: z.boolean().default(false),
  interestCalculationMethod: z.enum(['simple', 'compound', 'daily']).default('compound'),
  minimumPayment: z.string().regex(/^\d+\.?\d{0,2}$/, 'Invalid minimum payment'),
  paymentFrequency: z.enum(['weekly', 'biweekly', 'monthly', 'one_time']),
  paymentDueDay: z.number().min(1).max(31).optional(),
  nextDueDate: z.string().optional(),
  loanStartDate: z.string().optional(),
  loanMaturityDate: z.string().optional(),
  loanTermMonths: z.number().optional(),
  lateFee: z.string().regex(/^\d+\.?\d{0,2}$/).optional(),
  gracePeriodDays: z.number().default(0),
  status: z.enum(['active', 'paid_off', 'in_collections', 'settled', 'archived']).default('active'),
  payoffPriority: z.number().min(1).max(10).optional(),
  linkedAccountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  color: z.string().default('#dc2626'),
  icon: z.string().default('credit-card'),
  currency: z.string().default('AUD'),
})

// GET /api/debts - Get all debts for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')

    let query = db.select().from(debts).where(eq(debts.userId, userId))

    if (status) {
      query = db
        .select()
        .from(debts)
        .where(and(eq(debts.userId, userId), eq(debts.status, status)))
    }

    const userDebts = await query.orderBy(desc(debts.createdAt))

    return NextResponse.json(userDebts)
  } catch (error) {
    console.error('Error fetching debts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch debts' },
      { status: 500 }
    )
  }
}

// POST /api/debts - Create a new debt
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = debtSchema.parse(body)

    const newDebt: InsertDebt = {
      userId,
      name: validatedData.name,
      debtType: validatedData.debtType,
      creditorName: validatedData.creditorName,
      accountNumber: validatedData.accountNumber,
      currentBalance: validatedData.currentBalance,
      originalAmount: validatedData.originalAmount,
      creditLimit: validatedData.creditLimit,
      interestRate: validatedData.interestRate,
      isVariableRate: validatedData.isVariableRate,
      interestCalculationMethod: validatedData.interestCalculationMethod,
      minimumPayment: validatedData.minimumPayment,
      paymentFrequency: validatedData.paymentFrequency,
      paymentDueDay: validatedData.paymentDueDay,
      nextDueDate: validatedData.nextDueDate ? new Date(validatedData.nextDueDate) : null,
      loanStartDate: validatedData.loanStartDate ? new Date(validatedData.loanStartDate) : null,
      loanMaturityDate: validatedData.loanMaturityDate ? new Date(validatedData.loanMaturityDate) : null,
      loanTermMonths: validatedData.loanTermMonths,
      lateFee: validatedData.lateFee,
      gracePeriodDays: validatedData.gracePeriodDays,
      status: validatedData.status,
      payoffPriority: validatedData.payoffPriority,
      linkedAccountId: validatedData.linkedAccountId,
      categoryId: validatedData.categoryId,
      tags: validatedData.tags,
      notes: validatedData.notes,
      color: validatedData.color,
      icon: validatedData.icon,
      currency: validatedData.currency,
      lastBalanceUpdate: new Date(),
    }

    const [createdDebt] = await db.insert(debts).values(newDebt).returning()

    return NextResponse.json(createdDebt, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating debt:', error)
    return NextResponse.json(
      { error: 'Failed to create debt' },
      { status: 500 }
    )
  }
}
