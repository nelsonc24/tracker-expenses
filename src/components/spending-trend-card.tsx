"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SpendingTrendChart } from '@/components/charts'
import { InlineChartColorSettings } from '@/components/chart-color-settings'

interface TrendData {
  date: string
  amount: number
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
      <CardContent>
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
      </CardContent>
    </Card>
  )
}
