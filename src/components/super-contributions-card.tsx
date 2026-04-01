'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AlertTriangle, PiggyBank, CheckCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { CONCESSIONAL_CAP } from '@/lib/tax-utils'

interface SuperData {
  employerSG: number
  salarySacrifice: number
  personalContributions: number
  totalConcessional: number
  cap: number
  capRemaining: number
  capExceeded: boolean
}

interface SuperContributionsCardProps {
  data: SuperData | null
  loading?: boolean
}

export function SuperContributionsCard({ data, loading }: SuperContributionsCardProps) {
  const progressPct = data
    ? Math.min(100, (data.totalConcessional / CONCESSIONAL_CAP) * 100)
    : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-emerald-600" />
            <CardTitle className="text-base">Super Contributions</CardTitle>
          </div>
          {data?.capExceeded ? (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Cap exceeded
            </Badge>
          ) : data ? (
            <Badge variant="outline" className="gap-1 text-emerald-600">
              <CheckCircle className="h-3 w-3" />
              Within cap
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : !data ? (
          <p className="text-sm text-muted-foreground">
            Enter your salary in Settings to see super projections.
          </p>
        ) : (
          <>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Employer SG ({((data.employerSG / (data.totalConcessional - data.salarySacrifice - data.personalContributions + data.employerSG || 1)) * 100).toFixed(1)}%)</span>
                <span className="font-medium">{formatCurrency(data.employerSG)}</span>
              </div>
              {data.salarySacrifice > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Salary sacrifice</span>
                  <span className="font-medium">{formatCurrency(data.salarySacrifice)}</span>
                </div>
              )}
              {data.personalContributions > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Personal (deductible) contributions</span>
                  <span className="font-medium">{formatCurrency(data.personalContributions)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>Total concessional</span>
                <span className={data.capExceeded ? 'text-destructive' : ''}>{formatCurrency(data.totalConcessional)}</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatCurrency(data.totalConcessional)} used</span>
                <span>{formatCurrency(CONCESSIONAL_CAP)} cap</span>
              </div>
              <Progress
                value={progressPct}
                className={data.capExceeded ? '[&>div]:bg-destructive' : '[&>div]:bg-emerald-500'}
              />
              {data.capExceeded ? (
                <p className="text-xs text-destructive">
                  You&apos;re {formatCurrency(Math.abs(data.capRemaining))} over the concessional cap. Excess is taxed at your marginal rate.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(data.capRemaining)} remaining before the ${CONCESSIONAL_CAP / 1000}k cap — consider extra contributions.
                </p>
              )}
            </div>

            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
              Concessional cap for FY 2025-26 is ${CONCESSIONAL_CAP.toLocaleString()}. Check your MyGov super statements for exact figures.
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
