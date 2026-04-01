import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { transactions, wfhLogs, taxSettings } from '@/db/schema'
import { and, eq, gte, lte, asc } from 'drizzle-orm'
import { CURRENT_FY, FY_START, FY_END, WFH_RATE_PER_HOUR, TAX_CATEGORIES } from '@/lib/tax-utils'

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function row(...cells: (string | number | null | undefined)[]): string {
  return cells.map(escapeCSV).join(',')
}

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
        )
        .orderBy(asc(transactions.transactionDate)),
      db
        .select()
        .from(wfhLogs)
        .where(
          and(
            eq(wfhLogs.userId, userId),
            gte(wfhLogs.logDate, '2025-07-01'),
            lte(wfhLogs.logDate, '2026-06-30')
          )
        )
        .orderBy(asc(wfhLogs.logDate)),
      db
        .select()
        .from(taxSettings)
        .where(and(eq(taxSettings.userId, userId), eq(taxSettings.financialYear, CURRENT_FY)))
        .limit(1),
    ])

    const settings = settingsRows[0] ?? null
    const lines: string[] = []

    // ─── Section 1: Deductible Transactions ───────────────────────────────────
    lines.push('SECTION 1: WORK-RELATED DEDUCTIONS')
    lines.push(row('Date', 'Description', 'Merchant', 'Amount (AUD)', 'ATO Category'))
    for (const txn of deductibleTxns) {
      const date = new Date(txn.transactionDate).toISOString().split('T')[0]
      const catLabel = TAX_CATEGORIES.find((c) => c.value === txn.taxCategory)?.label ?? txn.taxCategory ?? 'Other Work Expenses'
      lines.push(row(date, txn.description, txn.merchant ?? '', Math.abs(parseFloat(txn.amount)).toFixed(2), catLabel))
    }
    const totalDeductions = deductibleTxns.reduce((s, t) => s + Math.abs(parseFloat(t.amount)), 0)
    lines.push(row('', '', 'TOTAL', totalDeductions.toFixed(2), ''))
    lines.push('')

    // ─── Section 2: WFH Log ───────────────────────────────────────────────────
    lines.push('SECTION 2: WORK FROM HOME (ATO Fixed Rate 70c/hr)')
    lines.push(row('Date', 'Hours', 'Notes', 'Deduction (AUD)'))
    for (const log of wfhRows) {
      const hrs = parseFloat(log.hours)
      lines.push(row(log.logDate, hrs.toFixed(2), log.notes ?? '', (hrs * WFH_RATE_PER_HOUR).toFixed(2)))
    }
    const totalWfhHours = wfhRows.reduce((s, l) => s + parseFloat(l.hours), 0)
    const totalWfhDeduction = totalWfhHours * WFH_RATE_PER_HOUR
    lines.push(row('TOTAL', totalWfhHours.toFixed(2), '', totalWfhDeduction.toFixed(2)))
    lines.push('')

    // ─── Section 3: Super Contributions ───────────────────────────────────────
    lines.push('SECTION 3: SUPER CONTRIBUTIONS SUMMARY')
    lines.push(row('Item', 'Amount (AUD)'))
    const salary = settings?.annualSalary ? parseFloat(settings.annualSalary) : 0
    const superRate = settings?.employerSuperRate ? parseFloat(settings.employerSuperRate) : 11.5
    const sacrifice = settings?.salarySacrificeAmount ? parseFloat(settings.salarySacrificeAmount) : 0
    const personalSuper = settings?.personalSuperContributions ? parseFloat(settings.personalSuperContributions) : 0
    const employerSG = salary * (superRate / 100)
    const totalConcessional = employerSG + sacrifice + personalSuper
    lines.push(row('Annual Salary', salary.toFixed(2)))
    lines.push(row(`Employer SG (${superRate}%)`, employerSG.toFixed(2)))
    lines.push(row('Salary Sacrifice', sacrifice.toFixed(2)))
    lines.push(row('Personal Deductible Contributions', personalSuper.toFixed(2)))
    lines.push(row('Total Concessional Contributions', totalConcessional.toFixed(2)))
    lines.push(row('Concessional Cap (FY 2025-26)', '30000.00'))
    lines.push(row('Remaining Cap', Math.max(0, 30000 - totalConcessional).toFixed(2)))
    lines.push('')
    lines.push('NOTE: This export is a guide only. Verify all figures against your payment summaries and consult a registered tax agent.')

    const csv = lines.join('\n')
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="tax-return-fy${CURRENT_FY}.csv"`,
      },
    })
  } catch (error) {
    console.error('GET /api/tax/export error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
