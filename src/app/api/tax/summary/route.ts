import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { transactions, wfhLogs, taxSettings } from '@/db/schema'
import { and, eq, gte, lte, sum, count } from 'drizzle-orm'
import {
  CURRENT_FY,
  FY_START,
  FY_END,
  WFH_RATE_PER_HOUR,
  CONCESSIONAL_CAP,
  TAX_CATEGORIES,
  calculateIncomeTax,
  estimateDeductionSaving,
  calculateEmployerSG,
  getMarginalRate,
} from '@/lib/tax-utils'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch all in parallel
    const [deductibleTxns, wfhRows, settingsRows] = await Promise.all([
      db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.taxDeductible, true),
            gte(transactions.transactionDate, FY_START),
            lte(transactions.transactionDate, FY_END)
          )
        ),
      db
        .select()
        .from(wfhLogs)
        .where(
          and(
            eq(wfhLogs.userId, userId),
            gte(wfhLogs.logDate, '2025-07-01'),
            lte(wfhLogs.logDate, '2026-06-30')
          )
        ),
      db
        .select()
        .from(taxSettings)
        .where(and(eq(taxSettings.userId, userId), eq(taxSettings.financialYear, CURRENT_FY)))
        .limit(1),
    ])

    const settings = settingsRows[0] ?? null

    // --- Deductible transactions ---
    let totalDeductions = 0
    const byCategory: Record<string, { label: string; total: number; count: number }> = {}

    for (const txn of deductibleTxns) {
      const amt = Math.abs(parseFloat(txn.amount))
      totalDeductions += amt

      const cat = txn.taxCategory ?? 'other_work'
      const label = TAX_CATEGORIES.find((c) => c.value === cat)?.label ?? 'Other Work Expenses'
      if (!byCategory[cat]) byCategory[cat] = { label, total: 0, count: 0 }
      byCategory[cat].total += amt
      byCategory[cat].count += 1
    }

    // --- WFH ---
    let totalWfhHours = 0
    for (const log of wfhRows) {
      totalWfhHours += parseFloat(log.hours)
    }
    const wfhDeduction = parseFloat((totalWfhHours * WFH_RATE_PER_HOUR).toFixed(2))

    // --- Super ---
    const annualSalary = settings?.annualSalary ? parseFloat(settings.annualSalary) : null
    const employerSuperRate = settings?.employerSuperRate ? parseFloat(settings.employerSuperRate) : 11.5
    const salarySacrifice = settings?.salarySacrificeAmount ? parseFloat(settings.salarySacrificeAmount) : 0
    const personalSuper = settings?.personalSuperContributions ? parseFloat(settings.personalSuperContributions) : 0

    const employerSG = annualSalary ? calculateEmployerSG(annualSalary, employerSuperRate) : 0
    const totalConcessional = parseFloat((employerSG + salarySacrifice + personalSuper).toFixed(2))
    const superCapRemaining = Math.max(0, CONCESSIONAL_CAP - totalConcessional)
    const superCapExceeded = totalConcessional > CONCESSIONAL_CAP

    // --- Tax estimate ---
    let estimatedSaving = 0
    let marginalRate = 0
    let taxWithoutDeductions = 0
    let taxWithDeductions = 0

    if (annualSalary !== null) {
      marginalRate = getMarginalRate(annualSalary)
      const taxableIncome = Math.max(0, annualSalary - salarySacrifice - personalSuper)
      const { totalTax: taxBefore } = calculateIncomeTax(taxableIncome)
      taxWithoutDeductions = taxBefore

      const totalWorkDeductions = totalDeductions + wfhDeduction
      const reducedIncome = Math.max(0, taxableIncome - totalWorkDeductions)
      const { totalTax: taxAfter } = calculateIncomeTax(reducedIncome)
      taxWithDeductions = taxAfter
      estimatedSaving = parseFloat((taxBefore - taxAfter).toFixed(2))
    }

    return NextResponse.json({
      financialYear: CURRENT_FY,
      deductions: {
        total: parseFloat(totalDeductions.toFixed(2)),
        transactionCount: deductibleTxns.length,
        byCategory: Object.entries(byCategory).map(([key, val]) => ({
          category: key,
          label: val.label,
          total: parseFloat(val.total.toFixed(2)),
          count: val.count,
        })),
      },
      wfh: {
        totalHours: parseFloat(totalWfhHours.toFixed(2)),
        deduction: wfhDeduction,
        ratePerHour: WFH_RATE_PER_HOUR,
        logCount: wfhRows.length,
      },
      super: {
        employerSG: parseFloat(employerSG.toFixed(2)),
        salarySacrifice,
        personalContributions: personalSuper,
        totalConcessional,
        cap: CONCESSIONAL_CAP,
        capRemaining: superCapRemaining,
        capExceeded: superCapExceeded,
      },
      taxEstimate: {
        hasData: annualSalary !== null,
        annualSalary,
        marginalRate,
        taxWithoutDeductions: parseFloat(taxWithoutDeductions.toFixed(2)),
        taxWithDeductions: parseFloat(taxWithDeductions.toFixed(2)),
        estimatedSaving,
      },
    })
  } catch (error) {
    console.error('GET /api/tax/summary error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
