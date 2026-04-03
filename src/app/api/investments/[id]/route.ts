import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { investmentScenarios } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  investmentType: z.enum(['stocks', 'etf', 'bonds', 'savings', 'crypto', 'custom']).optional(),
  initialAmount: z.number().min(0).optional(),
  monthlyContribution: z.number().min(0).optional(),
  annualReturnRate: z.number().min(0).max(100).optional(),
  years: z.number().int().min(1).max(50).optional(),
  inflationRate: z.number().min(0).max(30).optional(),
  contributionIncreaseRate: z.number().min(0).max(50).optional(),
  taxRate: z.number().min(0).max(100).optional(),
})

// GET /api/investments/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const [row] = await db
    .select()
    .from(investmentScenarios)
    .where(and(eq(investmentScenarios.id, id), eq(investmentScenarios.userId, userId)))

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

// PUT /api/investments/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const data = updateSchema.parse(body)

  const updates: Record<string, string | number> = {}
  if (data.name !== undefined) updates.name = data.name
  if (data.investmentType !== undefined) updates.investmentType = data.investmentType
  if (data.initialAmount !== undefined) updates.initialAmount = data.initialAmount.toString()
  if (data.monthlyContribution !== undefined) updates.monthlyContribution = data.monthlyContribution.toString()
  if (data.annualReturnRate !== undefined) updates.annualReturnRate = data.annualReturnRate.toString()
  if (data.years !== undefined) updates.years = data.years
  if (data.inflationRate !== undefined) updates.inflationRate = data.inflationRate.toString()
  if (data.contributionIncreaseRate !== undefined) updates.contributionIncreaseRate = data.contributionIncreaseRate.toString()
  if (data.taxRate !== undefined) updates.taxRate = data.taxRate.toString()

  const [row] = await db
    .update(investmentScenarios)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(investmentScenarios.id, id), eq(investmentScenarios.userId, userId)))
    .returning()

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

// DELETE /api/investments/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const [row] = await db
    .delete(investmentScenarios)
    .where(and(eq(investmentScenarios.id, id), eq(investmentScenarios.userId, userId)))
    .returning()

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
