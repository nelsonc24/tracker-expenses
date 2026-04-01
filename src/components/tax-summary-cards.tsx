'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Receipt, Home, TrendingUp, PiggyBank, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface TaxSummary {
  deductions: { total: number; transactionCount: number }
  wfh: { totalHours: number; deduction: number }
  super: { totalConcessional: number; cap: number; capExceeded: boolean }
  taxEstimate: { hasData: boolean; estimatedSaving: number; marginalRate: number }
}

interface TaxSummaryCardsProps {
  summary: TaxSummary | null
  loading: boolean
}

export function TaxSummaryCards({ summary, loading }: TaxSummaryCardsProps) {
  const cards = [
    {
      title: 'Work Deductions',
      value: loading ? '–' : formatCurrency(summary?.deductions.total ?? 0),
      sub: loading ? '' : `${summary?.deductions.transactionCount ?? 0} transactions`,
      icon: Receipt,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      title: 'WFH Deduction',
      value: loading ? '–' : formatCurrency(summary?.wfh.deduction ?? 0),
      sub: loading ? '' : `${summary?.wfh.totalHours ?? 0} hrs × $0.70`,
      icon: Home,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-950',
    },
    {
      title: 'Super Used',
      value: loading ? '–' : formatCurrency(summary?.super.totalConcessional ?? 0),
      sub: loading
        ? ''
        : summary?.super.capExceeded
        ? 'Over $30k cap!'
        : `$${((summary?.super.cap ?? 30000) - (summary?.super.totalConcessional ?? 0)).toFixed(0)} remaining`,
      icon: PiggyBank,
      color: summary?.super.capExceeded ? 'text-red-600' : 'text-green-600',
      bg: summary?.super.capExceeded
        ? 'bg-red-50 dark:bg-red-950'
        : 'bg-green-50 dark:bg-green-950',
      warning: summary?.super.capExceeded,
    },
    {
      title: 'Est. Tax Saving',
      value: loading
        ? '–'
        : summary?.taxEstimate.hasData
        ? formatCurrency(summary.taxEstimate.estimatedSaving)
        : 'Set salary',
      sub: loading
        ? ''
        : summary?.taxEstimate.hasData
        ? `At ${summary.taxEstimate.marginalRate}% marginal rate`
        : 'Enter salary in settings',
      icon: TrendingUp,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`rounded-lg p-2 ${card.bg}`}>
                  {card.warning ? (
                    <AlertTriangle className={`h-4 w-4 ${card.color}`} />
                  ) : (
                    <Icon className={`h-4 w-4 ${card.color}`} />
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{card.sub}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
