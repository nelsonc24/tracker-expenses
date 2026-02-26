import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { goals, goalContributions } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const MILESTONES = [25, 50, 75, 100] as const

const contributeSchema = z.object({
  amount: z.string().regex(/^\d+\.?\d{0,2}$/, 'Invalid amount'),
  note: z.string().max(200).nullable().optional(),
})

// POST /api/goals/[id]/contribute
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { amount, note } = contributeSchema.parse(body)

  // Fetch current goal
  const [goal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, userId)))

  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const prevAmount = parseFloat(goal.currentAmount ?? '0')
  const prevTarget = parseFloat(goal.targetAmount)
  const prevPercent = prevTarget > 0 ? (prevAmount / prevTarget) * 100 : 0

  const newAmountNum = prevAmount + parseFloat(amount)
  const newAmountStr = newAmountNum.toFixed(2)
  const newPercent = prevTarget > 0 ? (newAmountNum / prevTarget) * 100 : 0

  // Detect the first milestone crossed by this contribution
  const milestoneReached = MILESTONES.find(
    (m) => prevPercent < m && newPercent >= m
  ) ?? null

  // Whether the goal is now complete
  const isNowComplete = newAmountNum >= prevTarget

  // Update goal currentAmount (and status/completedAt if complete)
  await db
    .update(goals)
    .set({
      currentAmount: newAmountStr,
      ...(isNowComplete ? { status: 'completed', completedAt: new Date() } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(goals.id, id), eq(goals.userId, userId)))

  // Insert contribution record
  const [contribution] = await db
    .insert(goalContributions)
    .values({ goalId: id, userId, amount, note: note ?? null })
    .returning()

  return NextResponse.json({
    contribution,
    newAmount: newAmountStr,
    percentComplete: Math.min(100, Math.round(newPercent)),
    milestoneReached,
    isComplete: isNowComplete,
  })
}
