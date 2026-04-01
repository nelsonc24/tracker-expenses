import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { taxSettings } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { CURRENT_FY } from '@/lib/tax-utils'

const upsertSchema = z.object({
  annualSalary: z.number().positive().nullable().optional(),
  employerSuperRate: z.number().min(0).max(30).optional(),
  salarySacrificeAmount: z.number().min(0).optional(),
  personalSuperContributions: z.number().min(0).optional(),
  hasPrivateHealthInsurance: z.boolean().optional(),
})

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rows = await db
      .select()
      .from(taxSettings)
      .where(and(eq(taxSettings.userId, userId), eq(taxSettings.financialYear, CURRENT_FY)))
      .limit(1)

    if (rows.length === 0) {
      // Return sensible defaults — no row yet
      return NextResponse.json({
        financialYear: CURRENT_FY,
        annualSalary: null,
        employerSuperRate: '11.5',
        salarySacrificeAmount: '0',
        personalSuperContributions: '0',
        hasPrivateHealthInsurance: false,
      })
    }

    return NextResponse.json(rows[0])
  } catch (error) {
    console.error('GET /api/tax/settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const data = upsertSchema.parse(body)

    const existing = await db
      .select({ id: taxSettings.id })
      .from(taxSettings)
      .where(and(eq(taxSettings.userId, userId), eq(taxSettings.financialYear, CURRENT_FY)))
      .limit(1)

    const updateValues: Record<string, unknown> = { updatedAt: new Date() }
    if (data.annualSalary !== undefined) updateValues.annualSalary = data.annualSalary?.toString() ?? null
    if (data.employerSuperRate !== undefined) updateValues.employerSuperRate = data.employerSuperRate.toString()
    if (data.salarySacrificeAmount !== undefined) updateValues.salarySacrificeAmount = data.salarySacrificeAmount.toString()
    if (data.personalSuperContributions !== undefined) updateValues.personalSuperContributions = data.personalSuperContributions.toString()
    if (data.hasPrivateHealthInsurance !== undefined) updateValues.hasPrivateHealthInsurance = data.hasPrivateHealthInsurance

    if (existing.length > 0) {
      const updated = await db
        .update(taxSettings)
        .set(updateValues)
        .where(and(eq(taxSettings.userId, userId), eq(taxSettings.financialYear, CURRENT_FY)))
        .returning()
      return NextResponse.json(updated[0])
    }

    const inserted = await db
      .insert(taxSettings)
      .values({
        userId,
        financialYear: CURRENT_FY,
        annualSalary: data.annualSalary?.toString() ?? null,
        employerSuperRate: (data.employerSuperRate ?? 11.5).toString(),
        salarySacrificeAmount: (data.salarySacrificeAmount ?? 0).toString(),
        personalSuperContributions: (data.personalSuperContributions ?? 0).toString(),
        hasPrivateHealthInsurance: data.hasPrivateHealthInsurance ?? false,
      })
      .returning()

    return NextResponse.json(inserted[0])
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 })
    }
    console.error('PUT /api/tax/settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
