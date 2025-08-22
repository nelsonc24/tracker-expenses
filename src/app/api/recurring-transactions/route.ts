import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { recurringTransactions } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'

export async function GET() {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRecurringTransactions = await db
      .select()
      .from(recurringTransactions)
      .where(eq(recurringTransactions.userId, user.id))
      .orderBy(desc(recurringTransactions.createdAt))

    return NextResponse.json(userRecurringTransactions)
  } catch (error) {
    console.error('Error fetching recurring transactions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      autoProcess
    } = body

    // Validate required fields
    if (!accountId || !name || !amount || !frequency || !startDate) {
      return NextResponse.json(
        { error: 'Missing required fields: accountId, name, amount, frequency, startDate' }, 
        { status: 400 }
      )
    }

    // Convert amount to decimal string
    const amountDecimal = parseFloat(amount).toFixed(2)

    // Calculate next date based on frequency
    const start = new Date(startDate)
    const nextDate = calculateNextDate(start, frequency)

    const recurringTransaction = await db
      .insert(recurringTransactions)
      .values({
        userId: user.id,
        accountId,
        categoryId: categoryId || null,
        name,
        description: description || '',
        amount: amountDecimal,
        frequency,
        startDate: start,
        endDate: endDate ? new Date(endDate) : null,
        nextDate,
        autoProcess: autoProcess || false,
        isActive: true,
        tags: []
      })
      .returning()

    return NextResponse.json(recurringTransaction[0])
  } catch (error) {
    console.error('Error creating recurring transaction:', error)
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
