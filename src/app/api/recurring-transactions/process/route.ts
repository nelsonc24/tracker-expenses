import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { recurringTransactions, transactions } from '@/db/schema'
import { eq, and, lte } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, processAll = false } = body

    let processedCount = 0
    let errors: string[] = []

    if (processAll) {
      // Process all due recurring transactions for the user
      const dueRecurringTransactions = await db
        .select()
        .from(recurringTransactions)
        .where(
          and(
            eq(recurringTransactions.userId, user.id),
            eq(recurringTransactions.isActive, true),
            lte(recurringTransactions.nextDate, new Date())
          )
        )

      for (const recurring of dueRecurringTransactions) {
        try {
          await processRecurringTransaction(recurring)
          processedCount++
        } catch (error) {
          errors.push(`Failed to process ${recurring.name}: ${error}`)
        }
      }
    } else if (id) {
      // Process a specific recurring transaction
      const recurring = await db
        .select()
        .from(recurringTransactions)
        .where(
          and(
            eq(recurringTransactions.id, id),
            eq(recurringTransactions.userId, user.id),
            eq(recurringTransactions.isActive, true)
          )
        )
        .limit(1)

      if (recurring.length === 0) {
        return NextResponse.json({ error: 'Recurring transaction not found or inactive' }, { status: 404 })
      }

      try {
        await processRecurringTransaction(recurring[0])
        processedCount = 1
      } catch (error) {
        errors.push(`Failed to process ${recurring[0].name}: ${error}`)
      }
    } else {
      return NextResponse.json({ error: 'Either id or processAll must be provided' }, { status: 400 })
    }

    return NextResponse.json({ 
      processedCount, 
      errors,
      success: errors.length === 0
    })
  } catch (error) {
    console.error('Error processing recurring transactions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function processRecurringTransaction(recurring: any) {
  // Create the actual transaction
  await db.insert(transactions).values({
    userId: recurring.userId,
    accountId: recurring.accountId,
    categoryId: recurring.categoryId,
    amount: recurring.amount,
    description: recurring.description || recurring.name,
    transactionDate: new Date(),
    type: parseFloat(recurring.amount) >= 0 ? 'credit' : 'debit',
    tags: recurring.tags || []
  })

  // Calculate next occurrence
  const nextDate = calculateNextDate(recurring.nextDate, recurring.frequency)
  
  // Check if we've reached the end date
  const shouldContinue = !recurring.endDate || nextDate <= recurring.endDate

  // Update the recurring transaction
  await db
    .update(recurringTransactions)
    .set({
      nextDate: shouldContinue ? nextDate : recurring.nextDate,
      lastProcessed: new Date(),
      isActive: shouldContinue,
      updatedAt: new Date()
    })
    .where(eq(recurringTransactions.id, recurring.id))
}

function calculateNextDate(currentDate: Date, frequency: string): Date {
  const next = new Date(currentDate)
  
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
