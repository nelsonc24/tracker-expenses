import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { bills } from '@/db/schema'
import { eq, and, desc, asc } from 'drizzle-orm'
import { z } from 'zod'

const createBillSchema = z.object({
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  amount: z.string(),
  currency: z.string().default('AUD'),
  frequency: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']),
  dueDay: z.number().min(1).max(31).optional(),
  dueDate: z.string().optional(),
  reminderDays: z.number().default(3),
  isActive: z.boolean().default(true),
  isAutoPay: z.boolean().default(false),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.object({
    color: z.string().optional(),
    estimatedAmount: z.number().optional(),
    averageAmount: z.number().optional(),
    paymentMethod: z.string().optional(),
    website: z.string().optional(),
  }).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')
    
    let query = db
      .select()
      .from(bills)
      .where(eq(bills.userId, userId))
      .orderBy(desc(bills.createdAt))

    if (active === 'true') {
      query = db
        .select()
        .from(bills)
        .where(and(eq(bills.userId, userId), eq(bills.isActive, true)))
        .orderBy(asc(bills.dueDate))
    }

    const userBills = await query

    return NextResponse.json({ bills: userBills })
  } catch (error) {
    console.error('Error fetching bills:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bills' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createBillSchema.parse(body)

    // Calculate next due date based on frequency and dueDay
    let dueDate = new Date()
    if (validatedData.dueDate) {
      dueDate = new Date(validatedData.dueDate)
    } else if (validatedData.frequency === 'monthly' && validatedData.dueDay) {
      dueDate = new Date()
      dueDate.setDate(validatedData.dueDay)
      if (dueDate < new Date()) {
        dueDate.setMonth(dueDate.getMonth() + 1)
      }
    }

    const newBill = await db
      .insert(bills)
      .values({
        ...validatedData,
        userId,
        dueDate,
      })
      .returning()

    return NextResponse.json({ bill: newBill[0] }, { status: 201 })
  } catch (error) {
    console.error('Error creating bill:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create bill' },
      { status: 500 }
    )
  }
}
