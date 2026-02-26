import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { goals } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { z } from 'zod'

const goalSchema = z.object({
  name: z.string().min(1, 'Goal name is required'),
  emoji: z.string().default('🎯'),
  description: z.string().max(300).nullable().optional(),
  type: z.enum(['vacation', 'emergency_fund', 'car', 'home', 'education', 'wedding', 'retirement', 'custom']).default('custom'),
  color: z.string().default('#6366f1'),
  targetAmount: z.string().regex(/^\d+\.?\d{0,2}$/, 'Invalid amount'),
  currentAmount: z.string().regex(/^\d+\.?\d{0,2}$/).optional(),
  currency: z.string().default('AUD'),
  saveFrequency: z.enum(['weekly', 'fortnightly', 'monthly']).nullable().optional(),
  saveAmount: z.string().regex(/^\d+\.?\d{0,2}$/).nullable().optional(),
  targetDate: z.string().nullable().optional(),
  status: z.enum(['active', 'completed', 'paused']).default('active'),
})

// GET /api/goals — list all goals for the authenticated user
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db
    .select()
    .from(goals)
    .where(eq(goals.userId, userId))
    .orderBy(desc(goals.createdAt))

  const enriched = rows.map((g) => {
    const current = parseFloat(g.currentAmount ?? '0')
    const target = parseFloat(g.targetAmount)
    const percentComplete = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
    return { ...g, percentComplete }
  })

  return NextResponse.json(enriched)
}

// POST /api/goals — create a new goal
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const data = goalSchema.parse(body)

  const [row] = await db
    .insert(goals)
    .values({
      userId,
      name: data.name,
      emoji: data.emoji,
      description: data.description ?? null,
      type: data.type,
      color: data.color,
      targetAmount: data.targetAmount,
      currentAmount: data.currentAmount ?? '0.00',
      currency: data.currency,
      saveFrequency: data.saveFrequency ?? null,
      saveAmount: data.saveAmount ?? null,
      targetDate: data.targetDate ? new Date(data.targetDate) : null,
      status: data.status,
    })
    .returning()

  return NextResponse.json(row, { status: 201 })
}
