import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { recurringTransactions } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const recurringTransaction = await db
      .select()
      .from(recurringTransactions)
      .where(
        and(
          eq(recurringTransactions.id, id),
          eq(recurringTransactions.userId, user.id)
        )
      )
      .limit(1)

    if (recurringTransaction.length === 0) {
      return NextResponse.json({ error: 'Recurring transaction not found' }, { status: 404 })
    }

    return NextResponse.json(recurringTransaction[0])
  } catch (error) {
    console.error('Error fetching recurring transaction:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    // Check if recurring transaction exists and belongs to user
    const existing = await db
      .select()
      .from(recurringTransactions)
      .where(
        and(
          eq(recurringTransactions.id, id),
          eq(recurringTransactions.userId, user.id)
        )
      )
      .limit(1)

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Recurring transaction not found' }, { status: 404 })
    }

    const body = await request.json()
    const { 
      accountId, 
      categoryId, 
      name, 
      description,
      amount, 
      frequency, 
      startDate,
      endDate,
      autoProcess,
      isActive
    } = body

    const updateData: any = {
      updatedAt: new Date()
    }

    if (accountId !== undefined) updateData.accountId = accountId
    if (categoryId !== undefined) updateData.categoryId = categoryId || null
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description || null
    if (amount !== undefined) updateData.amount = parseFloat(amount).toFixed(2)
    if (frequency !== undefined) updateData.frequency = frequency
    if (startDate !== undefined) updateData.startDate = new Date(startDate)
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null
    if (autoProcess !== undefined) updateData.autoProcess = autoProcess
    if (isActive !== undefined) updateData.isActive = isActive

    // Recalculate next date if frequency or start date changed
    if (frequency !== undefined || startDate !== undefined) {
      const start = startDate ? new Date(startDate) : existing[0].startDate
      updateData.nextDate = calculateNextDate(start, frequency || existing[0].frequency)
    }

    const updated = await db
      .update(recurringTransactions)
      .set(updateData)
      .where(
        and(
          eq(recurringTransactions.id, id),
          eq(recurringTransactions.userId, user.id)
        )
      )
      .returning()

    return NextResponse.json(updated[0])
  } catch (error) {
    console.error('Error updating recurring transaction:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const result = await db
      .delete(recurringTransactions)
      .where(
        and(
          eq(recurringTransactions.id, id),
          eq(recurringTransactions.userId, user.id)
        )
      )
      .returning()

    if (result.length === 0) {
      return NextResponse.json({ error: 'Recurring transaction not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting recurring transaction:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function calculateNextDate(startDate: Date, frequency: string): Date {
  const next = new Date(startDate)
  
  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1)
      break
    case 'weekly':
      next.setDate(next.getDate() + 7)
      break
    case 'biweekly':
      next.setDate(next.getDate() + 14)
      break
    case 'monthly':
      next.setMonth(next.getMonth() + 1)
      break
    case 'quarterly':
      next.setMonth(next.getMonth() + 3)
      break
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1)
      break
    default:
      next.setMonth(next.getMonth() + 1) // Default to monthly
  }
  
  return next
}
