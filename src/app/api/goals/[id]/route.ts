import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { goals, goalContributions } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  emoji: z.string().optional(),
  description: z.string().max(300).nullable().optional(),
  type: z.enum(['vacation', 'emergency_fund', 'car', 'home', 'education', 'wedding', 'retirement', 'custom']).optional(),
  color: z.string().optional(),
  targetAmount: z.string().regex(/^\d+\.?\d{0,2}$/).optional(),
  currency: z.string().optional(),
  saveFrequency: z.enum(['weekly', 'fortnightly', 'monthly']).nullable().optional(),
  saveAmount: z.string().regex(/^\d+\.?\d{0,2}$/).nullable().optional(),
  targetDate: z.string().nullable().optional(),
  status: z.enum(['active', 'completed', 'paused']).optional(),
})

// GET /api/goals/[id] — single goal + contributions history
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [goal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, userId)))

  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const contributions = await db
    .select()
    .from(goalContributions)
    .where(eq(goalContributions.goalId, id))
    .orderBy(desc(goalContributions.contributedAt))

  const current = parseFloat(goal.currentAmount ?? '0')
  const target = parseFloat(goal.targetAmount)
  const percentComplete = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0

  return NextResponse.json({ ...goal, percentComplete, contributions })
}

// PATCH /api/goals/[id] — update a goal
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const data = updateSchema.parse(body)

  const updates: Record<string, unknown> = {
    ...data,
    targetDate: data.targetDate ? new Date(data.targetDate) : data.targetDate === null ? null : undefined,
    updatedAt: new Date(),
  }

  // Auto-set completedAt when status flips to completed
  if (data.status === 'completed') {
    updates.completedAt = new Date()
  } else if (data.status === 'active' || data.status === 'paused') {
    updates.completedAt = null
  }

  // Clean up undefined values
  Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k])

  const [updated] = await db
    .update(goals)
    .set(updates)
    .where(and(eq(goals.id, id), eq(goals.userId, userId)))
    .returning()

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(updated)
}

// DELETE /api/goals/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  await db.delete(goals).where(and(eq(goals.id, id), eq(goals.userId, userId)))

  return NextResponse.json({ success: true })
}
