import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { investmentScenarios } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { z } from 'zod'

const scenarioSchema = z.object({
  name: z.string().min(1, 'Scenario name is required').max(100),
  investmentType: z.enum(['stocks', 'etf', 'bonds', 'savings', 'crypto', 'custom']).default('custom'),
  initialAmount: z.number().min(0),
  monthlyContribution: z.number().min(0),
  annualReturnRate: z.number().min(0).max(100),
  years: z.number().int().min(1).max(50),
  inflationRate: z.number().min(0).max(30),
  contributionIncreaseRate: z.number().min(0).max(50),
  taxRate: z.number().min(0).max(100),
})

// GET /api/investments — list all scenarios for the authenticated user
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db
    .select()
    .from(investmentScenarios)
    .where(eq(investmentScenarios.userId, userId))
    .orderBy(desc(investmentScenarios.createdAt))

  return NextResponse.json(rows)
}

// POST /api/investments — create a new scenario
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const data = scenarioSchema.parse(body)

  const [row] = await db
    .insert(investmentScenarios)
    .values({
      userId,
      name: data.name,
      investmentType: data.investmentType,
      initialAmount: data.initialAmount.toString(),
      monthlyContribution: data.monthlyContribution.toString(),
      annualReturnRate: data.annualReturnRate.toString(),
      years: data.years,
      inflationRate: data.inflationRate.toString(),
      contributionIncreaseRate: data.contributionIncreaseRate.toString(),
      taxRate: data.taxRate.toString(),
    })
    .returning()

  return NextResponse.json(row, { status: 201 })
}
