import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { 
  activityLineItems, 
  transactions
} from '@/db/schema'
import { and, eq, sum } from 'drizzle-orm'
import { z } from 'zod'

const bulkCreateLineItemsSchema = z.object({
  transactionId: z.string().uuid(),
  activityId: z.string().uuid(),
  items: z.array(z.object({
    description: z.string().min(1),
    amount: z.number().positive(),
    subcategory: z.string().optional(),
    notes: z.string().optional(),
  }))
})

// POST /api/activity-line-items/bulk - Create multiple line items for a transaction
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Creating bulk line items:', body)
    
    // Validate the request body
    const validatedData = bulkCreateLineItemsSchema.parse(body)

    // Verify transaction belongs to user
    const transaction = await db
      .select({ id: transactions.id, amount: transactions.amount })
      .from(transactions)
      .where(and(
        eq(transactions.id, validatedData.transactionId),
        eq(transactions.userId, userId)
      ))
      .limit(1)

    if (transaction.length === 0) {
      return NextResponse.json(
        { error: 'Transaction not found or does not belong to user' },
        { status: 404 }
      )
    }

    // Check total of new items doesn't exceed transaction amount
    const existingLineItems = await db
      .select({ totalAmount: sum(activityLineItems.amount) })
      .from(activityLineItems)
      .where(eq(activityLineItems.transactionId, validatedData.transactionId))

    const existingTotal = parseFloat(existingLineItems[0]?.totalAmount || '0')
    const newItemsTotal = validatedData.items.reduce((sum, item) => sum + item.amount, 0)
    const transactionAmount = parseFloat(transaction[0].amount)

    if (existingTotal + newItemsTotal > transactionAmount) {
      return NextResponse.json(
        { 
          error: 'Line items total cannot exceed transaction amount',
          details: {
            transactionAmount,
            existingTotal,
            newItemsTotal,
            wouldTotal: existingTotal + newItemsTotal
          }
        },
        { status: 400 }
      )
    }

    // Create all line items
    const lineItemsToCreate = validatedData.items.map(item => ({
      transactionId: validatedData.transactionId,
      activityId: validatedData.activityId,
      description: item.description,
      amount: item.amount.toString(),
      subcategory: item.subcategory || null,
      notes: item.notes || null,
    }))

    const newLineItems = await db
      .insert(activityLineItems)
      .values(lineItemsToCreate)
      .returning()

    return NextResponse.json({
      message: `Created ${newLineItems.length} line items successfully`,
      lineItems: newLineItems,
      summary: {
        itemCount: newLineItems.length,
        totalAmount: newItemsTotal,
        remainingAmount: transactionAmount - (existingTotal + newItemsTotal)
      }
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('Error creating bulk activity line items:', error)
    return NextResponse.json(
      { error: 'Failed to create activity line items' },
      { status: 500 }
    )
  }
}
