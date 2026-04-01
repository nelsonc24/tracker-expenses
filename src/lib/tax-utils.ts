// Australian Tax Utilities - FY 2025-26

export const FY_START = new Date('2025-07-01T00:00:00.000Z')
export const FY_END = new Date('2026-06-30T23:59:59.999Z')
export const CURRENT_FY = '2025-26'

/** ATO fixed rate WFH deduction: 70 cents per hour */
export const WFH_RATE_PER_HOUR = 0.70

/** ATO concessional contributions cap FY 2025-26 */
export const CONCESSIONAL_CAP = 30000

/** Division 293 threshold */
export const DIV293_THRESHOLD = 250000

export const TAX_CATEGORIES = [
  { value: 'work_from_home', label: 'Work from Home' },
  { value: 'vehicle_travel', label: 'Vehicle & Travel' },
  { value: 'tools_equipment', label: 'Tools & Equipment' },
  { value: 'phone_internet', label: 'Phone & Internet' },
  { value: 'self_education', label: 'Self-Education' },
  { value: 'clothing_uniform', label: 'Clothing & Uniform' },
  { value: 'professional_fees', label: 'Professional Fees' },
  { value: 'other_work', label: 'Other Work Expenses' },
  { value: 'investment', label: 'Investment Expenses' },
] as const

export type TaxCategoryValue = typeof TAX_CATEGORIES[number]['value']

/**
 * Calculate ATO 2025-26 income tax + Medicare levy (2%) for a given gross income.
 * Uses the Stage 3 tax cuts brackets effective 2024-25 onwards.
 * This is an estimate — does not include LITO, LMITO, SAPTO, MLS surcharge etc.
 */
export function calculateIncomeTax(grossIncome: number): {
  incomeTax: number
  medicareLevy: number
  totalTax: number
  marginalRate: number
  effectiveRate: number
} {
  let incomeTax = 0
  let marginalRate = 0

  // ATO 2025-26 income tax brackets (Stage 3 cuts effective FY24-25+)
  if (grossIncome <= 18200) {
    incomeTax = 0
    marginalRate = 0
  } else if (grossIncome <= 45000) {
    incomeTax = (grossIncome - 18200) * 0.16
    marginalRate = 16
  } else if (grossIncome <= 135000) {
    incomeTax = (45000 - 18200) * 0.16 + (grossIncome - 45000) * 0.30
    marginalRate = 30
  } else if (grossIncome <= 190000) {
    incomeTax = (45000 - 18200) * 0.16 + (135000 - 45000) * 0.30 + (grossIncome - 135000) * 0.37
    marginalRate = 37
  } else {
    incomeTax = (45000 - 18200) * 0.16 + (135000 - 45000) * 0.30 + (190000 - 135000) * 0.37 + (grossIncome - 190000) * 0.45
    marginalRate = 45
  }

  // Low-income tax offset (LITO) — reduces tax for incomes up to $66,667
  let lito = 0
  if (grossIncome <= 37500) {
    lito = 700
  } else if (grossIncome <= 45000) {
    lito = 700 - (grossIncome - 37500) * 0.05
  } else if (grossIncome <= 66667) {
    lito = 325 - (grossIncome - 45000) * 0.015
  }
  incomeTax = Math.max(0, incomeTax - lito)

  // Medicare levy: 2% above the low-income threshold (~$26,000 for singles in 2025-26)
  const medicareLevy = grossIncome > 26000 ? grossIncome * 0.02 : 0

  const totalTax = incomeTax + medicareLevy
  const effectiveRate = grossIncome > 0 ? (totalTax / grossIncome) * 100 : 0

  return { incomeTax, medicareLevy, totalTax, marginalRate, effectiveRate }
}

/**
 * Calculate marginal tax rate for a given gross income (income tax only, no Medicare).
 */
export function getMarginalRate(grossIncome: number): number {
  if (grossIncome <= 18200) return 0
  if (grossIncome <= 45000) return 16
  if (grossIncome <= 135000) return 30
  if (grossIncome <= 190000) return 37
  return 45
}

/**
 * Estimate tax saving from a deduction at the marginal rate.
 * Deduction reduces gross income → saving = deduction × marginalRate/100
 */
export function estimateDeductionSaving(grossIncome: number, deductionAmount: number): number {
  const marginalRate = getMarginalRate(grossIncome) / 100
  return deductionAmount * marginalRate
}

/**
 * Calculate employer super guarantee (SG) contribution.
 */
export function calculateEmployerSG(grossSalary: number, employerSuperRate: number): number {
  return grossSalary * (employerSuperRate / 100)
}

/**
 * Calculate total concessional super contributions.
 */
export function calculateTotalConcessional(
  grossSalary: number,
  employerSuperRate: number,
  salarySacrifice: number,
  personalDeductible: number
): number {
  const employerSG = calculateEmployerSG(grossSalary, employerSuperRate)
  return employerSG + salarySacrifice + personalDeductible
}
