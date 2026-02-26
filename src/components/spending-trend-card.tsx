"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { SpendingTrendChart } from '@/components/charts'
import { InlineChartColorSettings } from '@/components/chart-color-settings'
import { formatCurrency } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

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

const PAGE_SIZE = 5

interface SpendingTrendCardProps {
  initialData?: TrendData[]
}

export function SpendingTrendCard({ initialData }: SpendingTrendCardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('last-7-days')
  const [data, setData] = useState<TrendData[]>(initialData || [])
  const [summary, setSummary] = useState<SpendingTrendResponse['summary'] | null>(null)
  const [loading, setLoading] = useState(false)
  const [aggregationType, setAggregationType] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [page, setPage] = useState(0)

  useEffect(() => {
    // Clear stale data immediately so old period never bleeds into the new period's table
    setData([])
    setSummary(null)
    setPage(0)

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
      case 'daily':   return 'Daily spending over the selected period'
      case 'weekly':  return 'Weekly spending aggregated over the selected period'
      case 'monthly': return 'Monthly spending aggregated over the selected period'
      default:        return 'Spending trend over the selected period'
    }
  }

  const periodLabel = TIME_PERIODS.find((p) => p.value === selectedPeriod)?.label ?? selectedPeriod
  const total = summary?.totalSpending ?? data.reduce((s, d) => s + d.amount, 0)

  // Only rows that have actual spend
  const spendRows = data.filter((d) => d.amount > 0)
  const totalPages = Math.ceil(spendRows.length / PAGE_SIZE)
  const pageRows = spendRows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  const formatRowLabel = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    if (aggregationType === 'monthly') {
      return new Date(year, month - 1, day).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
    }
    if (aggregationType === 'weekly') {
      return `Week of ${new Date(year, month - 1, day).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`
    }
    return new Date(year, month - 1, day).toLocaleDateString('en-AU', {
      weekday: 'short', day: 'numeric', month: 'short',
    })
  }

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

        {/* Per-period detail table with pagination */}
        {!loading && spendRows.length > 0 && (
          <div className="border rounded-lg overflow-hidden text-sm">
            {/* Table header */}
            <div className="flex items-center justify-between bg-muted/50 border-b px-3 py-2">
              <span className="font-medium text-muted-foreground">{periodLabel} — detail</span>
              <span className="font-semibold text-foreground">{formatCurrency(total)} total</span>
            </div>

            {/* Rows */}
            <div className="divide-y">
              {pageRows.map((d) => (
                <div key={d.date} className="px-3 py-2.5">
                  {/* Date row + day total */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-medium text-foreground">{formatRowLabel(d.date)}</span>
                    <span className="font-semibold">{formatCurrency(d.amount)}</span>
                  </div>
                  {/* Category breakdown */}
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
                            <span className="text-foreground w-20 text-right font-medium">{formatCurrency(cat.amount)}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination footer — only shown when more than one page */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-2">
                <span className="text-xs text-muted-foreground">
                  Page {page + 1} of {totalPages} &middot; {spendRows.length} days with spend
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}