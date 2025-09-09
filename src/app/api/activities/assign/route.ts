import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { 
  transactionActivities, 
  activities, 
  transactions
} from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { z } from 'zod'

// POST /api/activities/assign - Assign transactions to activities
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate the request body
    const assignSchema = z.object({
      transactionIds: z.array(z.string().uuid()),
      activityId: z.string().uuid(),
      assignedBy: z.enum(['user', 'rule', 'auto']).default('user'),
    })

    const { transactionIds, activityId, assignedBy } = assignSchema.parse(body)

    // Verify that the activity belongs to the user
    const activity = await db
      .select()
      .from(activities)
      .where(and(
        eq(activities.id, activityId),
        eq(activities.userId, userId)
      ))
      .limit(1)

    if (activity.length === 0) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    // Verify that all transactions belong to the user
    const userTransactions = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        inArray(transactions.id, transactionIds)
      ))

    const foundTransactionIds = userTransactions.map(t => t.id)
    const invalidTransactionIds = transactionIds.filter(id => !foundTransactionIds.includes(id))

    if (invalidTransactionIds.length > 0) {
      return NextResponse.json(
        { 
          error: 'Some transactions not found or do not belong to user',
          invalidIds: invalidTransactionIds
        }, 
        { status: 400 }
      )
    }

    // Remove existing assignments for these transactions to this activity
    await db
      .delete(transactionActivities)
      .where(and(
        eq(transactionActivities.activityId, activityId),
        inArray(transactionActivities.transactionId, transactionIds)
      ))

    // Create new assignments
    const assignmentData = transactionIds.map(transactionId => ({
      transactionId,
      activityId,
      assignedBy,
    }))

    const newAssignments = await db
      .insert(transactionActivities)
      .values(assignmentData)
      .returning()

    return NextResponse.json({
      message: 'Transactions assigned to activity successfully',
      assignments: newAssignments,
      count: newAssignments.length
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('Error assigning transactions to activity:', error)
    return NextResponse.json(
      { error: 'Failed to assign transactions to activity' },
      { status: 500 }
    )
  }
}

// DELETE /api/activities/assign - Remove activity assignments from transactions
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate the request body
    const unassignSchema = z.object({
      transactionIds: z.array(z.string().uuid()),
      activityId: z.string().uuid(),
    })

    const { transactionIds, activityId } = unassignSchema.parse(body)

    // Verify that the activity belongs to the user
    const activity = await db
      .select()
      .from(activities)
      .where(and(
        eq(activities.id, activityId),
        eq(activities.userId, userId)
      ))
      .limit(1)

    if (activity.length === 0) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    // Remove assignments
    const deletedAssignments = await db
      .delete(transactionActivities)
      .where(and(
        eq(transactionActivities.activityId, activityId),
        inArray(transactionActivities.transactionId, transactionIds)
      ))
      .returning()

    return NextResponse.json({
      message: 'Activity assignments removed successfully',
      removedCount: deletedAssignments.length
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('Error removing activity assignments:', error)
    return NextResponse.json(
      { error: 'Failed to remove activity assignments' },
      { status: 500 }
    )
  }
}
