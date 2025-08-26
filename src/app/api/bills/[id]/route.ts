import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { bills } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const updateBillSchema = z.object({
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  amount: z.string().optional(),
  currency: z.string().optional(),
  frequency: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']).optional(),
  dueDay: z.number().min(1).max(31).optional(),
  dueDate: z.string().optional(),
  reminderDays: z.number().optional(),
  isActive: z.boolean().optional(),
  isAutoPay: z.boolean().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.object({
    color: z.string().optional(),
    estimatedAmount: z.number().optional(),
    averageAmount: z.number().optional(),
    paymentMethod: z.string().optional(),
    website: z.string().optional(),
  }).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const bill = await db
      .select()
      .from(bills)
      .where(and(eq(bills.id, params.id), eq(bills.userId, userId)))
      .limit(1)

    if (bill.length === 0) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    return NextResponse.json({ bill: bill[0] })
  } catch (error) {
    console.error('Error fetching bill:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bill' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateBillSchema.parse(body)

    // Check if bill exists and belongs to user
    const existingBill = await db
      .select()
      .from(bills)
      .where(and(eq(bills.id, params.id), eq(bills.userId, userId)))
      .limit(1)

    if (existingBill.length === 0) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    // Calculate new due date if frequency or dueDay changed
    const updateFields: Record<string, unknown> = { ...validatedData }
    if (validatedData.frequency === 'monthly' && validatedData.dueDay) {
      const dueDate = new Date()
      dueDate.setDate(validatedData.dueDay)
      if (dueDate < new Date()) {
        dueDate.setMonth(dueDate.getMonth() + 1)
      }
      updateFields.dueDate = dueDate
    }

    const updatedBill = await db
      .update(bills)
      .set({
        ...updateFields,
        updatedAt: new Date(),
      })
      .where(and(eq(bills.id, params.id), eq(bills.userId, userId)))
      .returning()

    return NextResponse.json({ bill: updatedBill[0] })
  } catch (error) {
    console.error('Error updating bill:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update bill' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if bill exists and belongs to user
    const existingBill = await db
      .select()
      .from(bills)
      .where(and(eq(bills.id, params.id), eq(bills.userId, userId)))
      .limit(1)

    if (existingBill.length === 0) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    await db
      .delete(bills)
      .where(and(eq(bills.id, params.id), eq(bills.userId, userId)))

    return NextResponse.json({ message: 'Bill deleted successfully' })
  } catch (error) {
    console.error('Error deleting bill:', error)
    return NextResponse.json(
      { error: 'Failed to delete bill' },
      { status: 500 }
    )
  }
}
