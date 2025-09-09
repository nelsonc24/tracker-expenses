import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { activityBudgets, activities } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

const updateBudgetSchema = z.object({
  budgetAmount: z.number().positive().optional(),
  periodStart: z.string().transform(str => new Date(str)).optional(),
  periodEnd: z.string().transform(str => new Date(str)).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ budgetId: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { budgetId } = await params

    const budget = await db
      .select({
        id: activityBudgets.id,
        activityId: activityBudgets.activityId,
        activityName: activities.name,
        budgetAmount: activityBudgets.budgetAmount,
        spentAmount: activityBudgets.spentAmount,
        transactionCount: activityBudgets.transactionCount,
        periodStart: activityBudgets.periodStart,
        periodEnd: activityBudgets.periodEnd,
        lastUpdated: activityBudgets.lastUpdated,
        createdAt: activityBudgets.createdAt,
      })
      .from(activityBudgets)
      .leftJoin(activities, eq(activityBudgets.activityId, activities.id))
      .where(
        and(
          eq(activityBudgets.id, budgetId),
          eq(activities.userId, userId)
        )
      )
      .limit(1)

    if (budget.length === 0) {
      return NextResponse.json(
        { error: 'Budget not found or does not belong to user' },
        { status: 404 }
      )
    }

    const budgetData = budget[0]
    const budgetAmountNum = parseFloat(budgetData.budgetAmount.toString())
    const spentAmountNum = parseFloat(budgetData.spentAmount.toString())

    const formattedBudget = {
      ...budgetData,
      budgetAmount: budgetAmountNum,
      spentAmount: spentAmountNum,
      utilization: budgetAmountNum > 0 ? (spentAmountNum / budgetAmountNum) * 100 : 0,
      remaining: budgetAmountNum - spentAmountNum,
      isOverBudget: spentAmountNum > budgetAmountNum,
      daysRemaining: Math.max(0, Math.ceil((budgetData.periodEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    }

    return NextResponse.json({ budget: formattedBudget })

  } catch (error) {
    console.error('Get budget error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ budgetId: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateBudgetSchema.parse(body)
    const { budgetId } = await params

    // Verify budget exists and belongs to user
    const existingBudget = await db
      .select({ id: activityBudgets.id })
      .from(activityBudgets)
      .leftJoin(activities, eq(activityBudgets.activityId, activities.id))
      .where(
        and(
          eq(activityBudgets.id, budgetId),
          eq(activities.userId, userId)
        )
      )
      .limit(1)

    if (existingBudget.length === 0) {
      return NextResponse.json(
        { error: 'Budget not found or does not belong to user' },
        { status: 404 }
      )
    }

    // Update budget
    const updateData: Record<string, unknown> = {
      lastUpdated: new Date()
    }

    if (validatedData.budgetAmount !== undefined) {
      updateData.budgetAmount = validatedData.budgetAmount.toString()
    }
    if (validatedData.periodStart !== undefined) {
      updateData.periodStart = validatedData.periodStart
    }
    if (validatedData.periodEnd !== undefined) {
      updateData.periodEnd = validatedData.periodEnd
    }

    const updatedBudget = await db
      .update(activityBudgets)
      .set(updateData)
      .where(eq(activityBudgets.id, budgetId))
      .returning()

    return NextResponse.json({
      message: 'Budget updated successfully',
      budget: {
        ...updatedBudget[0],
        budgetAmount: parseFloat(updatedBudget[0].budgetAmount.toString()),
        spentAmount: parseFloat(updatedBudget[0].spentAmount.toString()),
      }
    })

  } catch (error) {
    console.error('Update budget error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: error.issues 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ budgetId: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { budgetId } = await params

    // Verify budget exists and belongs to user
    const existingBudget = await db
      .select({ id: activityBudgets.id })
      .from(activityBudgets)
      .leftJoin(activities, eq(activityBudgets.activityId, activities.id))
      .where(
        and(
          eq(activityBudgets.id, budgetId),
          eq(activities.userId, userId)
        )
      )
      .limit(1)

    if (existingBudget.length === 0) {
      return NextResponse.json(
        { error: 'Budget not found or does not belong to user' },
        { status: 404 }
      )
    }

    // Delete budget
    await db
      .delete(activityBudgets)
      .where(eq(activityBudgets.id, budgetId))

    return NextResponse.json({
      message: 'Budget deleted successfully'
    })

  } catch (error) {
    console.error('Delete budget error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
