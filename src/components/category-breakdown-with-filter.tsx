"use client"

import { useState, useEffect } from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface CategoryData {
  category: string
  amount: number
  color: string
  transactionCount?: number
}

interface CategorySpendingResponse {
  period: string
  data: CategoryData[]
  total: number
  dateRange: {
    startDate: string
    endDate: string
  } | null
}

const TIME_PERIODS = [
  { value: 'all-time', label: 'All Time' },
  { value: 'current-month', label: 'This Month' },
  { value: 'last-6-months', label: 'Last 6 Months' },
  { value: 'last-year', label: 'Last Year' },
]

export function CategoryBreakdownWithFilter({ initialData }: { initialData?: CategoryData[] }) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined)
  const [selectedPeriod, setSelectedPeriod] = useState('all-time')
  const [data, setData] = useState<CategoryData[]>(initialData || [])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/analytics/category-spending?period=${selectedPeriod}`)
        if (response.ok) {
          const result: CategorySpendingResponse = await response.json()
          setData(result.data)
        } else {
          console.error('Failed to fetch category data, using initial data')
          // If API fails, fall back to showing all data without filtering
          if (initialData && selectedPeriod === 'all-time') {
            setData(initialData)
          }
        }
      } catch (error) {
        console.error('Error fetching category data:', error)
        // If API fails, fall back to showing all data without filtering
        if (initialData && selectedPeriod === 'all-time') {
          setData(initialData)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedPeriod, initialData])

  // Calculate total for percentage calculations
  const chartTotal = data.reduce((sum, entry) => sum + entry.amount, 0)
  
  // Enhanced data with percentages
  const chartData = data.map((item) => ({
    ...item,
    percentage: chartTotal > 0 ? ((item.amount / chartTotal) * 100).toFixed(1) : '0',
    fill: item.color,
  }))

  const onPieEnter = (_: unknown, index: number) => {
    setActiveIndex(index)
  }

  const onPieLeave = () => {
    setActiveIndex(undefined)
  }

  const renderTooltip = (props: { active?: boolean; payload?: Array<{ payload: CategoryData & { percentage: string } }> }) => {
    if (props.active && props.payload && props.payload.length) {
      const data = props.payload[0].payload
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: data.color }}
            />
            <span className="font-medium text-card-foreground">{data.category}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            <div>Amount: ${data.amount.toLocaleString()}</div>
            <div>Percentage: {data.percentage}%</div>
            {data.transactionCount && (
              <div>Transactions: {data.transactionCount}</div>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Category Breakdown
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod} disabled>
              <SelectTrigger className="w-40">
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
          </CardTitle>
          <CardDescription>Where your money is going</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Category Breakdown
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
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
        </CardTitle>
        <CardDescription>
          Where your money is going
          {selectedPeriod !== 'all-time' && ` - ${TIME_PERIODS.find(p => p.value === selectedPeriod)?.label}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-muted-foreground">No spending data for this period</div>
          </div>
        ) : (
          <div className="w-full">
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={120}
                  innerRadius={60}
                  fill="hsl(var(--primary))"
                  dataKey="amount"
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      className={`
                        transition-all duration-200 
                        ${activeIndex === index ? 'drop-shadow-lg' : ''}
                      `}
                      style={{
                        filter: activeIndex === index ? 'brightness(1.1)' : 'brightness(1)',
                        transform: activeIndex === index ? 'scale(1.05)' : 'scale(1)',
                        transformOrigin: 'center',
                      }}
                    />
                  ))}
                </Pie>
                <Tooltip content={renderTooltip} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Legend with enhanced styling */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {chartData.map((entry, index) => (
                <div 
                  key={entry.category}
                  className={`
                    flex items-center justify-between p-2 rounded-md transition-all cursor-pointer
                    ${activeIndex === index ? 'bg-muted/50' : 'hover:bg-muted/30'}
                  `}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(undefined)}
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-sm font-medium text-card-foreground">
                      {entry.category}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      ${entry.amount.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {entry.percentage}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Total amount display */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total Spending</span>
                <span className="text-lg font-bold text-card-foreground">
                  ${chartTotal.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}