"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SpendingTrendChart } from '@/components/charts'
import { InlineChartColorSettings } from '@/components/chart-color-settings'
import { formatCurrency } from '@/lib/utils'

interface TrendData {
  date: string
  amount: number
  categories?: Array<{ name: string; color: string; amount: number }>
}

interface SpendingTrendResponse {
  period: string
  aggregationType: 'daily' | 'weekly' | 'monthly'
  data: TrendData[]
  summary: {
    totalSpending: number
    averageSpending: number
    maxSpending: number
    dataPoints: number
  }
  dateRange: {
    startDate: string
    endDate: string
  }
}

const TIME_PERIODS = [
  { value: 'last-7-days', label: 'Last 7 Days' },
  { value: 'last-30-days', label: 'Last 30 Days' },
  { value: 'last-3-months', label: 'Last 3 Months' },
  { value: 'last-6-months', label: 'Last 6 Months' },
  { value: 'last-year', label: 'Last Year' },
]

interface SpendingTrendCardProps {
  initialData?: TrendData[]
}

export function SpendingTrendCard({ initialData }: SpendingTrendCardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('last-7-days')
  const [data, setData] = useState<TrendData[]>(initialData || [])
  const [summary, setSummary] = useState<SpendingTrendResponse['summary'] | null>(null)
  const [loading, setLoading] = useState(false)
  const [aggregationType, setAggregationType] = useState<'daily' | 'weekly' | 'monthly'>('daily')

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/analytics/spending-trend?period=${selectedPeriod}`)
        if (response.ok) {
          const result: SpendingTrendResponse = await response.json()
          setData(result.data)
          setAggregationType(result.aggregationType)
          setSummary(result.summary)
        }
      } catch (error) {
        console.error('Error fetching spending trend:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedPeriod])

  const getDescription = () => {
    switch (aggregationType) {
      case 'daily':
        return 'Daily spending over the selected period'
      case 'weekly':
        return 'Weekly spending aggregated over the selected period'
      case 'monthly':
        return 'Monthly spending aggregated over the selected period'
      default:
        return 'Spending trend over the selected period'
    }
  }

  const periodLabel = TIME_PERIODS.find((p) => p.value === selectedPeriod)?.label ?? selectedPeriod
  const total = summary?.totalSpending ?? data.reduce((s, d) => s + d.amount, 0)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Spending Trend</CardTitle>
            <CardDescription className="text-sm">{getDescription()}</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_PERIODS.map((period) => (
                  <SelectItem key={period.value} value={period.value}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <InlineChartColorSettings />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-muted-foreground">No spending data available for this period</p>
          </div>
        ) : (
          <SpendingTrendChart data={data} />
        )}

        {/* Per-period detail table */}
        {!loading && data.some((d) => d.amount > 0) && (
          <div className="border rounded-lg overflow-hidden text-sm">
            {/* Header */}
            <div className="grid bg-muted/50 border-b font-medium text-muted-foreground px-3 py-2"
              style={{ gridTemplateColumns: '1fr auto' }}>
              <span>{periodLabel} — daily detail</span>
              <span className="text-right">{formatCurrency(total)} total</span>
            </div>

            {/* Rows — only days with spend */}
            <div className="divide-y max-h-64 overflow-y-auto">
              {data
                .filter((d) => d.amount > 0)
                .map((d) => {
                  const [year, month, day] = d.date.split('-').map(Number)
                  const label = new Date(year, month - 1, day).toLocaleDateString('en-AU', {
                    weekday: 'short', day: 'numeric', month: 'short',
                  })
                  return (
                    <div key={d.date} className="px-3 py-2.5">
                      {/* Date + total */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-medium text-foreground">{label}</span>
                        <span className="font-semibold">{formatCurrency(d.amount)}</span>
                      </div>
                      {/* Category breakdown for this day */}
                      {(d.categories ?? []).length > 0 && (
                        <div className="space-y-1 pl-1">
                          {(d.categories ?? []).map((cat) => {
                            const pct = d.amount > 0 ? (cat.amount / d.amount) * 100 : 0
                            return (
                              <div key={cat.name} className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: cat.color }}
                                />
                                <span className="flex-1 text-muted-foreground truncate">{cat.name}</span>
                                <div className="hidden sm:block w-16 h-1 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{ width: `${pct}%`, backgroundColor: cat.color }}
                                  />
                                </div>
                                <span className="text-muted-foreground w-9 text-right text-xs">{pct.toFixed(0)}%</span>
                                <span className="text-foreground w-18 text-right font-medium">{formatCurrency(cat.amount)}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
