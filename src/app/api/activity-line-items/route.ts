import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { 
  activityLineItems, 
  transactions, 
  activities,
  insertActivityLineItemSchema 
} from '@/db/schema'
import { and, eq, sum, desc } from 'drizzle-orm'
import { z } from 'zod'

// GET /api/activity-line-items - Get line items with optional filters
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const transactionId = searchParams.get('transactionId')
    const activityId = searchParams.get('activityId')

    // Build where conditions
    let whereConditions = eq(transactions.userId, userId)

    if (transactionId) {
      whereConditions = and(
        whereConditions,
        eq(activityLineItems.transactionId, transactionId)
      )!
    }

    if (activityId) {
      whereConditions = and(
        whereConditions,
        eq(activityLineItems.activityId, activityId)
      )!
    }

    const lineItems = await db
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
      .where(whereConditions)
      .orderBy(desc(activityLineItems.createdAt))

    return NextResponse.json(lineItems)
  } catch (error) {
    console.error('Error fetching activity line items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity line items' },
      { status: 500 }
    )
  }
}

// POST /api/activity-line-items - Create new line item
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Creating line item:', body)
    
    // Validate the request body
    const validatedData = insertActivityLineItemSchema.parse({
      ...body,
      amount: body.amount.toString(), // Convert to string for decimal handling
    })

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

    // Verify activity belongs to user
    const activity = await db
      .select({ id: activities.id })
      .from(activities)
      .where(and(
        eq(activities.id, validatedData.activityId),
        eq(activities.userId, userId)
      ))
      .limit(1)

    if (activity.length === 0) {
      return NextResponse.json(
        { error: 'Activity not found or does not belong to user' },
        { status: 404 }
      )
    }

    // Check total line items don't exceed transaction amount
    const existingLineItems = await db
      .select({ totalAmount: sum(activityLineItems.amount) })
      .from(activityLineItems)
      .where(eq(activityLineItems.transactionId, validatedData.transactionId))

    const existingTotal = parseFloat(existingLineItems[0]?.totalAmount || '0')
    const newItemAmount = parseFloat(validatedData.amount)
    const transactionAmount = parseFloat(transaction[0].amount)

    if (existingTotal + newItemAmount > transactionAmount) {
      return NextResponse.json(
        { 
          error: 'Line items total cannot exceed transaction amount',
          details: {
            transactionAmount,
            existingTotal,
            newItemAmount,
            wouldTotal: existingTotal + newItemAmount
          }
        },
        { status: 400 }
      )
    }

    const newLineItem = await db
      .insert(activityLineItems)
      .values(validatedData)
      .returning()

    return NextResponse.json(newLineItem[0], { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('Error creating activity line item:', error)
    return NextResponse.json(
      { error: 'Failed to create activity line item' },
      { status: 500 }
    )
  }
}
