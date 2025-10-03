'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface DebtStatsProps {
  stats: {
    totalDebt: string
    debtByType: Record<string, { count: number; total: number }>
    debtByRate: { low: number; medium: number; high: number; veryHigh: number }
    projectedAnnualInterest: string
  }
  debts: Array<{ debtType: string; currentBalance: string; interestRate: string }>
}

const DEBT_TYPE_LABELS: Record<string, string> = {
  credit_card: 'Credit Cards',
  personal_loan: 'Personal Loans',
  student_loan: 'Student Loans',
  mortgage: 'Mortgages',
  car_loan: 'Car Loans',
  medical: 'Medical Debt',
  personal: 'Personal Debts',
  line_of_credit: 'Lines of Credit',
  bnpl: 'BNPL',
}

const DEBT_TYPE_COLORS: Record<string, string> = {
  credit_card: 'bg-red-500',
  personal_loan: 'bg-orange-500',
  student_loan: 'bg-yellow-500',
  mortgage: 'bg-blue-500',
  car_loan: 'bg-purple-500',
  medical: 'bg-pink-500',
  personal: 'bg-green-500',
  line_of_credit: 'bg-indigo-500',
  bnpl: 'bg-teal-500',
}

export function DebtStats({ stats, debts }: DebtStatsProps) {
  const totalDebt = parseFloat(stats.totalDebt)

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Debt by Type */}
      <Card>
        <CardHeader>
          <CardTitle>Debt Breakdown by Type</CardTitle>
          <CardDescription>Distribution of your debts by category</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(stats.debtByType).map(([type, data]) => {
            const percentage = totalDebt > 0 ? (data.total / totalDebt) * 100 : 0
            return (
              <div key={type} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{DEBT_TYPE_LABELS[type] || type}</span>
                  <span className="text-muted-foreground">
                    ${data.total.toLocaleString()} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="relative">
                  <Progress value={percentage} className="h-2" />
                  <div
                    className={`absolute top-0 left-0 h-2 rounded-full ${DEBT_TYPE_COLORS[type] || 'bg-gray-500'}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Debt by Interest Rate */}
      <Card>
        <CardHeader>
          <CardTitle>Debt by Interest Rate</CardTitle>
          <CardDescription>Categorized by APR ranges</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: 'Low (< 5%)', count: stats.debtByRate.low, color: 'bg-green-500' },
            { label: 'Medium (5-10%)', count: stats.debtByRate.medium, color: 'bg-yellow-500' },
            { label: 'High (10-20%)', count: stats.debtByRate.high, color: 'bg-orange-500' },
            { label: 'Very High (> 20%)', count: stats.debtByRate.veryHigh, color: 'bg-red-500' },
          ].map((item) => {
            const percentage = debts.length > 0 ? (item.count / debts.length) * 100 : 0
            return (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-muted-foreground">
                    {item.count} {item.count === 1 ? 'debt' : 'debts'} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="relative">
                  <Progress value={percentage} className="h-2" />
                  <div
                    className={`absolute top-0 left-0 h-2 rounded-full ${item.color}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Projected Interest */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Annual Interest Projection</CardTitle>
          <CardDescription>
            Estimated interest you&apos;ll pay this year based on current balances and rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-destructive">
            ${parseFloat(stats.projectedAnnualInterest).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            This is money that could be saved with aggressive debt payoff strategies
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
