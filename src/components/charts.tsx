"use client"

import { useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useChartColors } from '@/contexts/chart-color-context'
import { formatCurrency } from '@/lib/utils'
import { PieLabelProps } from 'recharts/types/polar/Pie'

interface ChartData {
  name: string
  value: number
  color?: string
}

interface CategoryBreakdown {
  name: string
  color: string
  amount: number
}

interface TimeSeriesData {
  date: string
  amount: number
  category?: string
  categories?: CategoryBreakdown[]
}

interface CategoryData {
  category: string
  amount: number
  color: string
}

// Spending Trend Chart
export function SpendingTrendChart({ data }: { data: TimeSeriesData[] }) {
  const { currentScheme } = useChartColors()
  
  // Helper to format date string without timezone issues
  const formatDate = (dateStr: string, format: 'short' | 'long' = 'short') => {
    // Parse YYYY-MM-DD without timezone conversion
    const [year, month, day] = dateStr.split('-').map(Number)
    if (format === 'long') {
      const date = new Date(year, month - 1, day)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
    // Return short format: MM/DD
    return `${month}/${day}`
  }

  // Custom tooltip showing category breakdown
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean
    payload?: Array<{ value: number; payload: TimeSeriesData }>
    label?: string
  }) => {
    if (!active || !payload || payload.length === 0) return null
    const entry = payload[0].payload
    const categories = entry.categories || []
    const total = entry.amount

    return (
      <div
        style={{
          backgroundColor: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '8px',
          padding: '10px 14px',
          minWidth: '200px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        }}
      >
        <p style={{ marginBottom: '8px', fontWeight: 600, fontSize: '13px', color: 'hsl(var(--foreground))' }}>
          {label ? formatDate(label, 'long') : ''}
        </p>
        <p style={{ marginBottom: categories.length > 0 ? '8px' : 0, fontSize: '14px', color: 'hsl(var(--foreground))' }}>
          Total: <strong>{formatCurrency(total)}</strong>
        </p>
        {categories.length > 0 && (
          <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: '8px' }}>
            {categories.map((cat) => (
              <div key={cat.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: cat.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }}>{cat.name}</span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'hsl(var(--foreground))' }}>
                  {formatCurrency(cat.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="date" 
          className="text-muted-foreground"
          fontSize={12}
          tickFormatter={(date) => formatDate(date, 'short')}
        />
        <YAxis 
          className="text-muted-foreground"
          fontSize={12}
          tickFormatter={(value) => `${formatCurrency(value)}`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="amount"
          stroke={currentScheme.spendingTrend.stroke}
          fill={currentScheme.spendingTrend.fill}
          fillOpacity={currentScheme.spendingTrend.fillOpacity}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// Category Breakdown Chart with improved design
export function CategoryBreakdownChart({ data }: { data: CategoryData[] }) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined)
  
  // Calculate total for percentage calculations
  const total = data.reduce((sum, entry) => sum + entry.amount, 0)
  
  // Enhanced data with percentages
  const chartData = data.map((item) => ({
    ...item,
    percentage: ((item.amount / total) * 100).toFixed(1),
    fill: item.color,
  }))

  const onPieEnter = (_: unknown, index: number) => {
    setActiveIndex(index)
  }

  const onPieLeave = () => {
    setActiveIndex(undefined)
  }

  const renderCustomLabel = (entry: PieLabelProps) => {
    const percentage = parseFloat(entry.percentage)
    // Only show label if percentage is greater than 5%
    return percentage > 5 ? `${percentage}%` : ''
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
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
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
            ${total.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  )
}

// Monthly Comparison Chart
export function MonthlyComparisonChart({ data }: { data: ChartData[] }) {
  const { currentScheme } = useChartColors()
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="name" 
          className="text-muted-foreground"
          fontSize={12}
        />
        <YAxis 
          className="text-muted-foreground"
          fontSize={12}
          tickFormatter={(value) => `${formatCurrency(value)}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
          formatter={(value) => [`${formatCurrency(value as number)}`, 'Amount']}
        />
        <Bar
          dataKey="value"
          fill={currentScheme.monthlyComparison.primary}
          radius={[4, 4, 0, 0]}
          fillOpacity={currentScheme.monthlyComparison.fillOpacity}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

// Budget Progress Chart
export function BudgetProgressChart({ data }: { data: Array<{ category: string; spent: number; budget: number }> }) {
  const chartData = data.map(item => ({
    category: item.category,
    spent: item.spent,
    remaining: Math.max(0, item.budget - item.spent),
    over: Math.max(0, item.spent - item.budget),
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="horizontal">
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          type="number"
          className="text-muted-foreground"
          fontSize={12}
          tickFormatter={(value) => `$${value}`}
        />
        <YAxis 
          type="category"
          dataKey="category"
          className="text-muted-foreground"
          fontSize={12}
          width={100}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
          formatter={(value, name) => [`$${value}`, name === 'spent' ? 'Spent' : name === 'remaining' ? 'Remaining' : 'Over Budget']}
        />
        <Bar dataKey="spent" stackId="a" fill="hsl(var(--primary))" />
        <Bar dataKey="remaining" stackId="a" fill="hsl(var(--muted))" />
        <Bar dataKey="over" stackId="a" fill="hsl(var(--destructive))" />
      </BarChart>
    </ResponsiveContainer>
  )
}

// Enhanced Interactive Pie Chart Component
export function InteractivePieChart({ 
  data, 
  title, 
  description,
  showLegend = true,
  showTotal = true,
  innerRadius = 60,
  outerRadius = 120,
  height = 350,
}: { 
  data: CategoryData[]
  title?: string
  description?: string
  showLegend?: boolean
  showTotal?: boolean
  innerRadius?: number
  outerRadius?: number
  height?: number
}) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined)
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
  
  const total = data.reduce((sum, entry) => sum + entry.amount, 0)
  
  const chartData = data.map((item, index) => ({
    ...item,
    percentage: ((item.amount / total) * 100).toFixed(1),
    fill: item.color,
  }))

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index)
    setHoveredCategory(chartData[index].category)
  }

  const onPieLeave = () => {
    setActiveIndex(undefined)
    setHoveredCategory(null)
  }

  const centerContent = hoveredCategory ? (
    <g>
      <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-sm font-medium">
        {hoveredCategory}
      </text>
      <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-xs">
        {chartData.find(d => d.category === hoveredCategory)?.percentage}%
      </text>
    </g>
  ) : (
    <g>
      <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-lg font-bold">
        ${total.toLocaleString()}
      </text>
      <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-xs">
        Total Spending
      </text>
    </g>
  )

  return (
    <Card>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        <div className="w-full">
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={innerRadius}
                outerRadius={outerRadius}
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
                    className="transition-all duration-200"
                    style={{
                      filter: activeIndex === index ? 'brightness(1.1)' : 'brightness(1)',
                      transform: activeIndex === index ? 'scale(1.05)' : 'scale(1)',
                      transformOrigin: 'center',
                    }}
                  />
                ))}
              </Pie>
              {/* Center content overlay */}
              <g>
                {centerContent}
              </g>
            </PieChart>
          </ResponsiveContainer>
          
          {showLegend && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {chartData.map((entry, index) => (
                <div 
                  key={entry.category}
                  className={`
                    flex items-center justify-between p-2 rounded-md transition-all cursor-pointer
                    ${activeIndex === index ? 'bg-muted/50' : 'hover:bg-muted/30'}
                  `}
                  onMouseEnter={() => {
                    setActiveIndex(index)
                    setHoveredCategory(entry.category)
                  }}
                  onMouseLeave={() => {
                    setActiveIndex(undefined)
                    setHoveredCategory(null)
                  }}
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
          )}
          
          {showTotal && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total Spending</span>
                <span className="text-lg font-bold text-card-foreground">
                  ${total.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
