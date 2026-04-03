export interface ProjectionInput {
  initialAmount: number
  monthlyContribution: number
  annualReturnRate: number // % e.g. 8 = 8%
  years: number
  inflationRate: number // % e.g. 2.5
  contributionIncreaseRate: number // % per year e.g. 3
  taxRate: number // % capital gains tax on gains
}

export interface YearlyDataPoint {
  year: number
  nominalValue: number
  realValue: number
  bearValue: number
  bullValue: number
  totalInvested: number
  totalReturns: number
}

export interface ProjectionMilestone {
  label: string
  year: number | null
  targetValue: number
}

export interface ProjectionSummary {
  finalValue: number
  totalInvested: number
  totalReturns: number
  afterTaxValue: number
  realFinalValue: number
  bearFinalValue: number
  bullFinalValue: number
}

export interface ProjectionResult {
  yearlyData: YearlyDataPoint[]
  milestones: ProjectionMilestone[]
  summary: ProjectionSummary
}

const BEAR_OFFSET = 4 // subtract from base rate
const BULL_OFFSET = 4 // add to base rate

function runScenario(
  input: ProjectionInput,
  rateOverride?: number,
): { yearlyData: Array<{ year: number; value: number; invested: number }>; finalValue: number; totalInvested: number } {
  const annualRate = (rateOverride ?? input.annualReturnRate) / 100
  const monthlyRate = annualRate / 12
  let balance = input.initialAmount
  let totalInvested = input.initialAmount
  const yearlyData: Array<{ year: number; value: number; invested: number }> = []

  for (let year = 1; year <= input.years; year++) {
    const yearlyContribution =
      input.monthlyContribution * Math.pow(1 + input.contributionIncreaseRate / 100, year - 1)

    for (let month = 0; month < 12; month++) {
      balance = balance * (1 + monthlyRate) + yearlyContribution
      totalInvested += yearlyContribution
    }
    yearlyData.push({ year, value: balance, invested: totalInvested })
  }

  return { yearlyData, finalValue: balance, totalInvested }
}

export function calculateProjection(input: ProjectionInput): ProjectionResult {
  const baseRun = runScenario(input)
  const bearRun = runScenario(input, Math.max(0, input.annualReturnRate - BEAR_OFFSET))
  const bullRun = runScenario(input, input.annualReturnRate + BULL_OFFSET)

  const yearlyData: YearlyDataPoint[] = baseRun.yearlyData.map((d, i) => {
    const realValue = d.value / Math.pow(1 + input.inflationRate / 100, d.year)
    return {
      year: d.year,
      nominalValue: Math.round(d.value * 100) / 100,
      realValue: Math.round(realValue * 100) / 100,
      bearValue: Math.round(bearRun.yearlyData[i].value * 100) / 100,
      bullValue: Math.round(bullRun.yearlyData[i].value * 100) / 100,
      totalInvested: Math.round(d.invested * 100) / 100,
      totalReturns: Math.round((d.value - d.invested) * 100) / 100,
    }
  })

  const totalInvested = baseRun.totalInvested
  const finalValue = baseRun.finalValue
  const totalReturns = finalValue - totalInvested
  const afterTaxGains = totalReturns * (1 - input.taxRate / 100)
  const afterTaxValue = totalInvested + afterTaxGains
  const realFinalValue = finalValue / Math.pow(1 + input.inflationRate / 100, input.years)

  // Milestones: multiples of total invested
  const multipleMilestones = [2, 5, 10].map((mult) => {
    const target = totalInvested * mult
    const point = yearlyData.find((d) => d.nominalValue >= target)
    return {
      label: `${mult}× your money`,
      year: point ? point.year : null,
      targetValue: target,
    }
  })

  // Milestones: fixed dollar amounts
  const dollarMilestones = [100_000, 250_000, 500_000, 1_000_000].map((target) => {
    const point = yearlyData.find((d) => d.nominalValue >= target)
    return {
      label: `$${(target / 1000).toFixed(0)}k`,
      year: point ? point.year : null,
      targetValue: target,
    }
  })

  const milestones = [...multipleMilestones, ...dollarMilestones]

  return {
    yearlyData,
    milestones,
    summary: {
      finalValue: Math.round(finalValue * 100) / 100,
      totalInvested: Math.round(totalInvested * 100) / 100,
      totalReturns: Math.round(totalReturns * 100) / 100,
      afterTaxValue: Math.round(afterTaxValue * 100) / 100,
      realFinalValue: Math.round(realFinalValue * 100) / 100,
      bearFinalValue: Math.round(bearRun.finalValue * 100) / 100,
      bullFinalValue: Math.round(bullRun.finalValue * 100) / 100,
    },
  }
}

export const INVESTMENT_TYPE_PRESETS: Record<string, { label: string; returnRate: number }> = {
  stocks: { label: 'Stocks', returnRate: 10 },
  etf: { label: 'ETF', returnRate: 8 },
  bonds: { label: 'Bonds', returnRate: 4 },
  savings: { label: 'Savings Account', returnRate: 3 },
  crypto: { label: 'Crypto', returnRate: 15 },
  custom: { label: 'Custom', returnRate: 7 },
}
