import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { 
  activityLineItems, 
  transactions, 
  activities
} from '@/db/schema'
import { and, eq, sum } from 'drizzle-orm'
import { z } from 'zod'

const updateLineItemSchema = z.object({
  description: z.string().optional(),
  amount: z.number().positive().optional(),
  subcategory: z.string().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
})

// GET /api/activity-line-items/[id] - Get specific line item
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

    const lineItem = await db
      .select({
        id: activityLineItems.id,
        transactionId: activityLineItems.transactionId,
        activityId: activityLineItems.activityId,
        description: activityLineItems.description,
        amount: activityLineItems.amount,
        subcategory: activityLineItems.subcategory,
        notes: activityLineItems.notes,
        metadata: activityLineItems.metadata,
        createdAt: activityLineItems.createdAt,
        updatedAt: activityLineItems.updatedAt,
        // Join data for context
        transactionDescription: transactions.description,
        transactionAmount: transactions.amount,
        activityName: activities.name,
      })
      .from(activityLineItems)
      .leftJoin(transactions, eq(activityLineItems.transactionId, transactions.id))
      .leftJoin(activities, eq(activityLineItems.activityId, activities.id))
      .where(and(
        eq(activityLineItems.id, id),
        eq(transactions.userId, userId)
      ))
      .limit(1)

    if (lineItem.length === 0) {
      return NextResponse.json(
        { error: 'Line item not found or does not belong to user' },
        { status: 404 }
      )
    }

    return NextResponse.json(lineItem[0])
  } catch (error) {
    console.error('Error fetching activity line item:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity line item' },
      { status: 500 }
    )
  }
}

// PUT /api/activity-line-items/[id] - Update line item
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
    
    // Validate the request body
    const validatedData = updateLineItemSchema.parse(body)

    // Verify line item belongs to user
    const existingLineItem = await db
      .select({
        id: activityLineItems.id,
        transactionId: activityLineItems.transactionId,
        amount: activityLineItems.amount,
        transactionAmount: transactions.amount,
      })
      .from(activityLineItems)
      .leftJoin(transactions, eq(activityLineItems.transactionId, transactions.id))
      .where(and(
        eq(activityLineItems.id, id),
        eq(transactions.userId, userId)
      ))
      .limit(1)

    if (existingLineItem.length === 0) {
      return NextResponse.json(
        { error: 'Line item not found or does not belong to user' },
        { status: 404 }
      )
    }

    // If amount is being updated, check total doesn't exceed transaction amount
    if (validatedData.amount !== undefined) {
      const otherLineItems = await db
        .select({ totalAmount: sum(activityLineItems.amount) })
        .from(activityLineItems)
        .where(and(
          eq(activityLineItems.transactionId, existingLineItem[0].transactionId),
          eq(activityLineItems.id, id) // Exclude current item
        ))

      const otherTotal = parseFloat(otherLineItems[0]?.totalAmount || '0')
      const newAmount = validatedData.amount
      const transactionAmount = parseFloat(existingLineItem[0].transactionAmount || '0')

      if (otherTotal + newAmount > transactionAmount) {
        return NextResponse.json(
          { 
            error: 'Line items total cannot exceed transaction amount',
            details: {
              transactionAmount,
              otherTotal,
              newAmount,
              wouldTotal: otherTotal + newAmount
            }
          },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date()
    }

    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description
    }
    if (validatedData.amount !== undefined) {
      updateData.amount = validatedData.amount.toString()
    }
    if (validatedData.subcategory !== undefined) {
      updateData.subcategory = validatedData.subcategory
    }
    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes
    }
    if (validatedData.metadata !== undefined) {
      updateData.metadata = validatedData.metadata
    }

    const updatedLineItem = await db
      .update(activityLineItems)
      .set(updateData)
      .where(eq(activityLineItems.id, id))
      .returning()

    return NextResponse.json(updatedLineItem[0])
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('Error updating activity line item:', error)
    return NextResponse.json(
      { error: 'Failed to update activity line item' },
      { status: 500 }
    )
  }
}

// DELETE /api/activity-line-items/[id] - Delete line item
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

    // Verify line item belongs to user
    const existingLineItem = await db
      .select({ id: activityLineItems.id })
      .from(activityLineItems)
      .leftJoin(transactions, eq(activityLineItems.transactionId, transactions.id))
      .where(and(
        eq(activityLineItems.id, id),
        eq(transactions.userId, userId)
      ))
      .limit(1)

    if (existingLineItem.length === 0) {
      return NextResponse.json(
        { error: 'Line item not found or does not belong to user' },
        { status: 404 }
      )
    }

    // Delete the line item
    await db
      .delete(activityLineItems)
      .where(eq(activityLineItems.id, id))

    return NextResponse.json({
      message: 'Line item deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting activity line item:', error)
    return NextResponse.json(
      { error: 'Failed to delete activity line item' },
      { status: 500 }
    )
  }
}
