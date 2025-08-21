"use client"

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
  LineChart,
  Line,
} from 'recharts'

interface ChartData {
  name: string
  value: number
  color?: string
}

interface TimeSeriesData {
  date: string
  amount: number
  category?: string
}

interface CategoryData {
  category: string
  amount: number
  color: string
}

// Spending Trend Chart
export function SpendingTrendChart({ data }: { data: TimeSeriesData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="date" 
          className="text-muted-foreground"
          fontSize={12}
        />
        <YAxis 
          className="text-muted-foreground"
          fontSize={12}
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
          formatter={(value) => [`$${value}`, 'Amount']}
        />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="hsl(var(--primary))"
          fill="hsl(var(--primary))"
          fillOpacity={0.2}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// Category Breakdown Chart
export function CategoryBreakdownChart({ data }: { data: CategoryData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ category, percent }: any) => `${category} ${((percent || 0) * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="amount"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
          formatter={(value) => [`$${value}`, 'Amount']}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

// Monthly Comparison Chart
export function MonthlyComparisonChart({ data }: { data: ChartData[] }) {
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
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
          formatter={(value) => [`$${value}`, 'Amount']}
        />
        <Bar
          dataKey="value"
          fill="hsl(var(--primary))"
          radius={[4, 4, 0, 0]}
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
