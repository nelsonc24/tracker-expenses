import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { 
  activityLineItems, 
  transactions,
  activities
} from '@/db/schema'
import { and, eq } from 'drizzle-orm'

// GET /api/transactions/[id]/breakdown - Get transaction with line item breakdown
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: transactionId } = await params

    // Get transaction details
    const transaction = await db
      .select()
      .from(transactions)
      .where(and(
        eq(transactions.id, transactionId),
        eq(transactions.userId, userId)
      ))
      .limit(1)

    if (transaction.length === 0) {
      return NextResponse.json(
        { error: 'Transaction not found or does not belong to user' },
        { status: 404 }
      )
    }

    // Get line items for this transaction
    const lineItems = await db
      .select({
        id: activityLineItems.id,
        activityId: activityLineItems.activityId,
        description: activityLineItems.description,
        amount: activityLineItems.amount,
        subcategory: activityLineItems.subcategory,
        notes: activityLineItems.notes,
        metadata: activityLineItems.metadata,
        createdAt: activityLineItems.createdAt,
        activityName: activities.name,
        activityCategory: activities.category,
      })
      .from(activityLineItems)
      .leftJoin(activities, eq(activityLineItems.activityId, activities.id))
      .where(eq(activityLineItems.transactionId, transactionId))

    // Calculate totals
    const transactionAmount = parseFloat(transaction[0].amount)
    const lineItemsTotal = lineItems.reduce((sum, item) => sum + parseFloat(item.amount), 0)
    const unassignedAmount = transactionAmount - lineItemsTotal

    // Group by activity
    interface LineItemWithActivity {
      id: string
      activityId: string
      description: string
      amount: string
      subcategory: string | null
      notes: string | null
      metadata: Record<string, unknown> | null
      createdAt: Date
      activityName: string | null
      activityCategory: string | null
    }

    interface ActivityBreakdown {
      activityId: string
      activityName: string | null
      activityCategory: string | null
      items: LineItemWithActivity[]
      totalAmount: number
    }

    const lineItemsByActivity = lineItems.reduce((acc, item) => {
      const activityId = item.activityId
      if (!acc[activityId]) {
        acc[activityId] = {
          activityId,
          activityName: item.activityName,
          activityCategory: item.activityCategory,
          items: [],
          totalAmount: 0,
        }
      }
      acc[activityId].items.push(item)
      acc[activityId].totalAmount += parseFloat(item.amount)
      return acc
    }, {} as Record<string, ActivityBreakdown>)

    // Group by subcategory
    interface SubcategoryBreakdown {
      subcategory: string
      items: LineItemWithActivity[]
      totalAmount: number
    }

    const lineItemsBySubcategory = lineItems.reduce((acc, item) => {
      const subcategory = item.subcategory || 'Other'
      if (!acc[subcategory]) {
        acc[subcategory] = {
          subcategory,
          items: [],
          totalAmount: 0,
        }
      }
      acc[subcategory].items.push(item)
      acc[subcategory].totalAmount += parseFloat(item.amount)
      return acc
    }, {} as Record<string, SubcategoryBreakdown>)

    return NextResponse.json({
      transaction: transaction[0],
      lineItems,
      summary: {
        transactionAmount,
        lineItemsTotal,
        unassignedAmount,
        lineItemsCount: lineItems.length,
        activitiesCount: Object.keys(lineItemsByActivity).length,
        subcategoriesCount: Object.keys(lineItemsBySubcategory).length,
        isFullyAssigned: unassignedAmount === 0,
      },
      breakdowns: {
        byActivity: Object.values(lineItemsByActivity),
        bySubcategory: Object.values(lineItemsBySubcategory),
      },
    })
  } catch (error) {
    console.error('Error fetching transaction breakdown:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transaction breakdown' },
      { status: 500 }
    )
  }
}
