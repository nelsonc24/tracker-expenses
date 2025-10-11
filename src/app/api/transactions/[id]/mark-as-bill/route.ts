import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { transactions, bills } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

const markAsBillSchema = z.object({
  frequency: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']),
  dueDay: z.number().min(1).max(31).optional(),
  dueDate: z.string().optional(),
  reminderDays: z.number().default(3),
  isAutoPay: z.boolean().default(false),
  notes: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = markAsBillSchema.parse(body)
    const { id } = await params

    // Get the transaction
    const transaction = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .limit(1)

    if (transaction.length === 0) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const txn = transaction[0]

    // Calculate next due date
    let dueDate: Date
    
    if (validatedData.dueDate) {
      // Use explicit due date if provided (for non-monthly frequencies)
      dueDate = new Date(validatedData.dueDate)
    } else if (validatedData.frequency === 'monthly' && validatedData.dueDay) {
      // Monthly bills use dueDay
      dueDate = new Date()
      dueDate.setDate(validatedData.dueDay)
      if (dueDate < new Date()) {
        dueDate.setMonth(dueDate.getMonth() + 1)
      }
    } else {
      // For other frequencies without explicit date, use transaction date + frequency interval
      dueDate = new Date(txn.transactionDate)
      switch (validatedData.frequency) {
        case 'weekly':
          dueDate.setDate(dueDate.getDate() + 7)
          break
        case 'biweekly':
          dueDate.setDate(dueDate.getDate() + 14)
          break
        case 'quarterly':
          dueDate.setMonth(dueDate.getMonth() + 3)
          break
        case 'yearly':
          dueDate.setFullYear(dueDate.getFullYear() + 1)
          break
        default:
          dueDate.setMonth(dueDate.getMonth() + 1)
      }
    }

    // Create the bill
    const newBill = await db
      .insert(bills)
      .values({
        userId,
        accountId: txn.accountId,
        categoryId: txn.categoryId,
        name: txn.description,
        description: `Created from transaction: ${txn.reference || txn.description}`,
        amount: txn.amount,
        currency: txn.currency,
        frequency: validatedData.frequency,
        dueDay: validatedData.dueDay,
        dueDate,
        lastPaidDate: txn.transactionDate,
        lastPaidAmount: txn.amount,
        reminderDays: validatedData.reminderDays,
        isActive: true,
        isAutoPay: validatedData.isAutoPay,
        notes: validatedData.notes,
        tags: txn.tags || [],
      })
      .returning()

    // Update the transaction to mark it as a bill
    await db
      .update(transactions)
      .set({
        isBill: true,
        billId: newBill[0].id,
        updatedAt: new Date(),
      })
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))

    return NextResponse.json({ bill: newBill[0] }, { status: 201 })
  } catch (error) {
    console.error('Error marking transaction as bill:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to mark transaction as bill' },
      { status: 500 }
    )
  }
}
