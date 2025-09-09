import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { activityBudgets, activities } from '@/db/schema'
import { and, eq, desc, lte, gte, sql } from 'drizzle-orm'
import { z } from 'zod'

const createBudgetSchema = z.object({
  activityId: z.string().uuid(),
  budgetAmount: z.number().positive(),
  periodStart: z.string().transform(str => new Date(str)),
  periodEnd: z.string().transform(str => new Date(str)),
})

const updateBudgetSchema = z.object({
  budgetAmount: z.number().positive().optional(),
  periodStart: z.string().transform(str => new Date(str)).optional(),
  periodEnd: z.string().transform(str => new Date(str)).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const activityId = searchParams.get('activityId')

    const whereConditions = [eq(activities.userId, userId)]
    if (activityId) {
      whereConditions.push(eq(activityBudgets.activityId, activityId))
    }

    const budgets = await db
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
      .where(and(...whereConditions))
      .orderBy(desc(activityBudgets.createdAt))

    const formattedBudgets = budgets.map(budget => {
      const budgetAmountNum = parseFloat(budget.budgetAmount.toString())
      const spentAmountNum = parseFloat(budget.spentAmount.toString())
      
      return {
        ...budget,
        budgetAmount: budgetAmountNum,
        spentAmount: spentAmountNum,
        utilization: budgetAmountNum > 0 
          ? (spentAmountNum / budgetAmountNum) * 100
          : 0,
        remaining: budgetAmountNum - spentAmountNum,
        isOverBudget: spentAmountNum > budgetAmountNum,
        daysRemaining: Math.max(0, Math.ceil((budget.periodEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
      }
    })

    return NextResponse.json({ budgets: formattedBudgets })

  } catch (error) {
    console.error('Get budgets error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createBudgetSchema.parse(body)

    // Verify activity exists and belongs to user
    const activity = await db
      .select({ id: activities.id, name: activities.name })
      .from(activities)
      .where(
        and(
          eq(activities.id, validatedData.activityId),
          eq(activities.userId, userId)
        )
      )
      .limit(1)

    if (activity.length === 0) {
      return NextResponse.json(
        { error: 'Activity not found or does not belong to user' },
        { status: 404 }
      )
    }

    // Check for overlapping budget periods  
    // For now, let's skip the overlap check and implement it later
    // This allows for multiple budgets per activity which can be useful
    
    // Create new budget
    const newBudget = await db
      .insert(activityBudgets)
      .values({
        activityId: validatedData.activityId,
        budgetAmount: validatedData.budgetAmount.toString(),
        periodStart: validatedData.periodStart,
        periodEnd: validatedData.periodEnd,
        spentAmount: '0.00',
        transactionCount: 0,
        lastUpdated: new Date(),
      })
      .returning()

    return NextResponse.json({
      message: 'Budget created successfully',
      budget: {
        ...newBudget[0],
        budgetAmount: parseFloat(newBudget[0].budgetAmount.toString()),
        spentAmount: parseFloat(newBudget[0].spentAmount.toString()),
      }
    })

  } catch (error) {
    console.error('Create budget error:', error)
    
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
