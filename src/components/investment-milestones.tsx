'use client'

import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { ProjectionMilestone } from '@/lib/investment-calculations'
import { Trophy, TrendingUp } from 'lucide-react'

interface Props {
  milestones: ProjectionMilestone[]
  years: number
}

export function InvestmentMilestones({ milestones, years }: Props) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-yellow-500" />
        Milestones
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {milestones.map((m) => {
          const reached = m.year !== null && m.year <= years
          return (
            <Card
              key={m.label}
              className={`border ${reached ? 'border-green-500/40 bg-green-500/5' : 'opacity-50'}`}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className={`w-3.5 h-3.5 ${reached ? 'text-green-500' : 'text-muted-foreground'}`} />
                  <span className="text-xs font-medium truncate">{m.label}</span>
                </div>
                <p className={`text-sm font-bold ${reached ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                  {reached ? `Year ${m.year}` : 'Not reached'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatCurrency(m.targetValue)}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
