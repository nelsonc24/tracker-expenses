// ---------------------------------------------------------------------------
// Debt payoff calculation utilities
// ---------------------------------------------------------------------------

export interface PayoffPoint {
  /** 1-based month index */
  month: number
  /** Human-readable label, e.g. "Apr 2026" */
  label: string
  /** Remaining balance after this month's payment */
  balance: number
  /** Cumulative interest paid up to and including this month */
  cumulativeInterest: number
}

export interface PayoffSummary {
  /** Total months to pay off (Infinity if payment never covers interest) */
  months: number
  /** Total interest paid over the life of the loan */
  totalInterest: number
  /** Projected payoff date (undefined when months is Infinity) */
  payoffDate: Date | undefined
  /** Full month-by-month amortisation schedule (downsampled for charts) */
  schedule: PayoffPoint[]
}

export interface DebtInput {
  id: string
  name: string
  currentBalance: string | number
  interestRate: string | number // APR in % e.g. 18.99
  minimumPayment: string | number
  paymentFrequency: string // 'weekly' | 'biweekly' | 'monthly' | 'one_time'
  status: string
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const MAX_MONTHS = 360 // 30 years cap

/** Convert any payment frequency to a monthly equivalent amount */
function toMonthlyPayment(amount: number, frequency: string): number {
  switch (frequency) {
    case 'weekly':
      return amount * (52 / 12)   // ~4.333
    case 'biweekly':
      return amount * (26 / 12)   // ~2.167
    case 'monthly':
    default:
      return amount
  }
}

/** Format a Date as "MMM YYYY", e.g. "Apr 2026" */
function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })
}

/**
 * Downsample an array to at most `maxPoints` by taking every Nth element.
 * Always includes the first and last elements.
 */
function downsample<T>(arr: T[], maxPoints: number): T[] {
  if (arr.length <= maxPoints) return arr
  const step = Math.ceil(arr.length / maxPoints)
  const result: T[] = []
  for (let i = 0; i < arr.length; i += step) {
    result.push(arr[i])
  }
  // Ensure last point is always included
  if (result[result.length - 1] !== arr[arr.length - 1]) {
    result.push(arr[arr.length - 1])
  }
  return result
}

// ---------------------------------------------------------------------------
// Single-debt payoff calculation
// ---------------------------------------------------------------------------

/**
 * Calculate the amortisation schedule for a single debt.
 *
 * @param balance   Current outstanding balance
 * @param apr       Annual percentage rate as a percentage (e.g. 18.99)
 * @param monthlyPayment  The monthly payment amount (already normalised)
 * @param startDate  Reference date for axis labels (defaults to today)
 * @param maxChartPoints  Downsample target for chart data (default 72)
 */
export function calculatePayoff(
  balance: number,
  apr: number,
  monthlyPayment: number,
  startDate: Date = new Date(),
  maxChartPoints = 72,
): PayoffSummary {
  const monthlyRate = apr / 100 / 12

  // Guard: payment doesn't even cover interest
  const monthlyInterestOnStart = balance * monthlyRate
  if (monthlyPayment <= monthlyInterestOnStart && monthlyRate > 0) {
    return {
      months: Infinity,
      totalInterest: Infinity,
      payoffDate: undefined,
      schedule: [],
    }
  }

  const fullSchedule: PayoffPoint[] = []
  let remaining = balance
  let cumulativeInterest = 0
  let month = 0

  const cursor = new Date(startDate)
  cursor.setDate(1) // normalise to 1st of month

  while (remaining > 0.005 && month < MAX_MONTHS) {
    month++
    cursor.setMonth(cursor.getMonth() + 1)

    const interestThisMonth = remaining * monthlyRate
    cumulativeInterest += interestThisMonth

    const principal = Math.min(monthlyPayment - interestThisMonth, remaining)
    remaining = Math.max(remaining - principal, 0)

    fullSchedule.push({
      month,
      label: formatMonthLabel(cursor),
      balance: Math.round(remaining * 100) / 100,
      cumulativeInterest: Math.round(cumulativeInterest * 100) / 100,
    })
  }

  return {
    months: month,
    totalInterest: Math.round(cumulativeInterest * 100) / 100,
    payoffDate: month > 0 ? new Date(cursor) : undefined,
    schedule: downsample(fullSchedule, maxChartPoints),
  }
}

// ---------------------------------------------------------------------------
// Multi-debt payoff (combined strategy) calculation
// ---------------------------------------------------------------------------

export type Strategy = 'avalanche' | 'snowball'

export interface MultiDebtMonthPoint {
  month: number
  label: string
  /** Combined remaining balance across all debts */
  balance: number
  cumulativeInterest: number
}

export interface MultiDebtPayoffResult {
  totalMonths: number
  totalInterest: number
  debtFreeDate: Date | undefined
  schedule: MultiDebtMonthPoint[]
}

/**
 * Calculate combined payoff schedule across all active debts.
 *
 * Extra budget is applied each month to the priority debt after all
 * minimum payments are made:
 *  - Avalanche: highest APR first
 *  - Snowball:  lowest balance first
 *
 * @param debts        Array of active debt inputs
 * @param extraBudget  Additional monthly dollars beyond all minimums ($0 = minimum only)
 * @param strategy     'avalanche' | 'snowball'
 * @param startDate    Reference date for labels
 * @param maxChartPoints Downsample target
 */
export function calculateMultiDebtPayoff(
  debts: DebtInput[],
  extraBudget: number,
  strategy: Strategy = 'avalanche',
  startDate: Date = new Date(),
  maxChartPoints = 72,
): MultiDebtPayoffResult {
  if (debts.length === 0) {
    return { totalMonths: 0, totalInterest: 0, debtFreeDate: undefined, schedule: [] }
  }

  // Build working state for each debt
  const state = debts.map((d) => ({
    id: d.id,
    name: d.name,
    balance: parseFloat(String(d.currentBalance)),
    monthlyRate: parseFloat(String(d.interestRate)) / 100 / 12,
    apr: parseFloat(String(d.interestRate)),
    minPayment: toMonthlyPayment(
      parseFloat(String(d.minimumPayment)),
      d.paymentFrequency,
    ),
  }))

  const fullSchedule: MultiDebtMonthPoint[] = []
  let month = 0
  let cumulativeInterest = 0

  const cursor = new Date(startDate)
  cursor.setDate(1)

  while (month < MAX_MONTHS) {
    const activeDebts = state.filter((d) => d.balance > 0.005)
    if (activeDebts.length === 0) break

    month++
    cursor.setMonth(cursor.getMonth() + 1)

    // Apply interest + minimum payments to each debt
    for (const d of activeDebts) {
      const interest = d.balance * d.monthlyRate
      cumulativeInterest += interest
      const payment = Math.min(d.minPayment, d.balance + interest)
      d.balance = Math.max(d.balance + interest - payment, 0)
    }

    // Determine which active debt gets the extra budget
    const stillActiveAfterMin = state.filter((d) => d.balance > 0.005)
    if (stillActiveAfterMin.length > 0 && extraBudget > 0) {
      const sorted = [...stillActiveAfterMin].sort((a, b) =>
        strategy === 'avalanche'
          ? b.apr - a.apr           // highest rate first
          : a.balance - b.balance,  // lowest balance first
      )
      const target = sorted[0]
      const extra = Math.min(extraBudget, target.balance)
      target.balance = Math.max(target.balance - extra, 0)
    }

    const totalBalance = state.reduce((sum, d) => sum + d.balance, 0)

    fullSchedule.push({
      month,
      label: formatMonthLabel(cursor),
      balance: Math.round(totalBalance * 100) / 100,
      cumulativeInterest: Math.round(cumulativeInterest * 100) / 100,
    })
  }

  return {
    totalMonths: month,
    totalInterest: Math.round(cumulativeInterest * 100) / 100,
    debtFreeDate: month > 0 ? new Date(cursor) : undefined,
    schedule: downsample(fullSchedule, maxChartPoints),
  }
}

// ---------------------------------------------------------------------------
// Utility: build two schedules (min-only vs with-extra) for chart comparison
// ---------------------------------------------------------------------------

export interface ComparisonResult {
  minOnly: PayoffSummary | MultiDebtPayoffResult
  withExtra: PayoffSummary | MultiDebtPayoffResult
  monthsSaved: number
  interestSaved: number
}

export function buildSingleDebtComparison(
  balance: number,
  apr: number,
  monthlyMin: number,
  extraPayment: number,
  startDate?: Date,
): ComparisonResult {
  const minOnly = calculatePayoff(balance, apr, monthlyMin, startDate)
  const withExtra = calculatePayoff(balance, apr, monthlyMin + extraPayment, startDate)

  const monthsSaved =
    minOnly.months === Infinity || withExtra.months === Infinity
      ? 0
      : minOnly.months - withExtra.months

  const interestSaved =
    minOnly.totalInterest === Infinity || withExtra.totalInterest === Infinity
      ? 0
      : minOnly.totalInterest - withExtra.totalInterest

  return { minOnly, withExtra, monthsSaved, interestSaved }
}

export function buildMultiDebtComparison(
  debts: DebtInput[],
  extraPayment: number,
  strategy: Strategy,
  startDate?: Date,
): ComparisonResult {
  const minOnly = calculateMultiDebtPayoff(debts, 0, strategy, startDate)
  const withExtra = calculateMultiDebtPayoff(debts, extraPayment, strategy, startDate)

  const monthsSaved = minOnly.totalMonths - withExtra.totalMonths
  const interestSaved = minOnly.totalInterest - withExtra.totalInterest

  return { minOnly, withExtra, monthsSaved, interestSaved }
}

/** Helper to merge two schedules into chart-friendly data [{label, minBalance, extraBalance}] */
export interface ChartPoint {
  label: string
  minBalance: number
  extraBalance: number
}

export function mergeSchedulesForChart(
  minSchedule: PayoffPoint[] | MultiDebtMonthPoint[],
  extraSchedule: PayoffPoint[] | MultiDebtMonthPoint[],
): ChartPoint[] {
  // Build a map from label → values for both schedules
  const minMap = new Map<string, number>()
  for (const p of minSchedule) {
    minMap.set(p.label, p.balance)
  }

  const extraMap = new Map<string, number>()
  for (const p of extraSchedule) {
    extraMap.set(p.label, p.balance)
  }

  // Collect all unique labels ordered by month index
  const allLabels = new Map<string, number>()
  for (const p of minSchedule) allLabels.set(p.label, p.month)
  for (const p of extraSchedule) allLabels.set(p.label, p.month)

  const sorted = Array.from(allLabels.entries()).sort((a, b) => a[1] - b[1])

  return sorted.map(([label]) => ({
    label,
    minBalance: minMap.get(label) ?? 0,
    extraBalance: extraMap.get(label) ?? 0,
  }))
}
