"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  ComposedChart, Legend
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Filter
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

// Enhanced sample data for analytics
const monthlySpendingData = [
  { month: 'Jan 2024', income: 5200, expenses: 3800, savings: 1400, net: 1400 },
  { month: 'Feb 2024', income: 5200, expenses: 4200, savings: 1000, net: 1000 },
  { month: 'Mar 2024', income: 5400, expenses: 3900, savings: 1500, net: 1500 },
  { month: 'Apr 2024', income: 5200, expenses: 4100, savings: 1100, net: 1100 },
  { month: 'May 2024', income: 5200, expenses: 3750, savings: 1450, net: 1450 },
  { month: 'Jun 2024', income: 5400, expenses: 4300, savings: 1100, net: 1100 },
]

const categoryTrendsData = [
  { category: 'Groceries', jan: 650, feb: 720, mar: 680, apr: 710, may: 645, jun: 690 },
  { category: 'Entertainment', jan: 280, feb: 320, mar: 290, apr: 310, may: 275, jun: 340 },
  { category: 'Transport', jan: 180, feb: 210, mar: 195, apr: 185, may: 170, jun: 220 },
  { category: 'Dining', jan: 420, feb: 380, mar: 450, apr: 410, may: 430, jun: 465 },
  { category: 'Utilities', jan: 280, feb: 290, mar: 275, apr: 285, may: 270, jun: 295 },
]

const weeklySpendingData = [
  { week: 'Week 1', spending: 420, budget: 500 },
  { week: 'Week 2', spending: 380, budget: 500 },
  { week: 'Week 3', spending: 520, budget: 500 },
  { week: 'Week 4', spending: 445, budget: 500 },
]

const topMerchantsData = [
  { name: 'Woolworths', amount: 280, transactions: 12, category: 'Groceries' },
  { name: 'Shell', amount: 190, transactions: 8, category: 'Transport' },
  { name: 'Netflix', amount: 20, transactions: 1, category: 'Entertainment' },
  { name: 'Coles', amount: 165, transactions: 7, category: 'Groceries' },
  { name: 'Uber', amount: 120, transactions: 6, category: 'Transport' },
]

const incomeVsExpensesData = [
  { date: '2024-01-01', income: 5200, expenses: 3800 },
  { date: '2024-02-01', income: 5200, expenses: 4200 },
  { date: '2024-03-01', income: 5400, expenses: 3900 },
  { date: '2024-04-01', income: 5200, expenses: 4100 },
  { date: '2024-05-01', income: 5200, expenses: 3750 },
  { date: '2024-06-01', income: 5400, expenses: 4300 },
]

const COLORS = ['#22c55e', '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#06b6d4']

export default function AnalyticsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('6m')
  const [selectedView, setSelectedView] = useState('overview')

  const totalIncome = monthlySpendingData.reduce((sum, month) => sum + month.income, 0)
  const totalExpenses = monthlySpendingData.reduce((sum, month) => sum + month.expenses, 0)
  const avgMonthlyIncome = totalIncome / monthlySpendingData.length
  const avgMonthlyExpenses = totalExpenses / monthlySpendingData.length
  const savingsRate = ((totalIncome - totalExpenses) / totalIncome) * 100

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Deep insights into your spending patterns and financial trends
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">1 Month</SelectItem>
              <SelectItem value="3m">3 Months</SelectItem>
              <SelectItem value="6m">6 Months</SelectItem>
              <SelectItem value="1y">1 Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Monthly Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${avgMonthlyIncome.toLocaleString('en-AU')}
            </div>
            <p className="text-xs text-muted-foreground">
              +8.2% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Monthly Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${avgMonthlyExpenses.toLocaleString('en-AU')}
            </div>
            <p className="text-xs text-muted-foreground">
              -2.1% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Savings Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {savingsRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Target: 20%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Cashflow</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${(totalIncome - totalExpenses).toLocaleString('en-AU')}
            </div>
            <p className="text-xs text-muted-foreground">
              Last 6 months
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics */}
      <Tabs value={selectedView} onValueChange={setSelectedView} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="merchants">Merchants</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Income vs Expenses</CardTitle>
                <CardDescription>Monthly comparison over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={incomeVsExpensesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-AU', { month: 'short' })}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any) => [`$${value.toLocaleString()}`, '']}
                      labelFormatter={(label) => new Date(label).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}
                    />
                    <Legend />
                    <Bar dataKey="income" fill="#22c55e" name="Income" />
                    <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Savings Trend</CardTitle>
                <CardDescription>Monthly savings and net worth growth</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlySpendingData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => [`$${value.toLocaleString()}`, '']} />
                    <Area 
                      type="monotone" 
                      dataKey="savings" 
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Weekly Spending vs Budget</CardTitle>
              <CardDescription>Current month breakdown by week</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklySpendingData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => [`$${value.toLocaleString()}`, '']} />
                  <Legend />
                  <Bar dataKey="spending" fill="#ef4444" name="Actual Spending" />
                  <Bar dataKey="budget" fill="#22c55e" name="Budget" fillOpacity={0.3} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Category Spending Trends</CardTitle>
              <CardDescription>How your spending in each category has changed over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {categoryTrendsData.map((category, index) => (
                    <Line 
                      key={category.category}
                      type="monotone" 
                      dataKey={category.category}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Spending Velocity</CardTitle>
                <CardDescription>Daily spending rate trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Average Daily Spend</span>
                    <span className="text-2xl font-bold">$127.50</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>This week</span>
                      <div className="flex items-center space-x-2">
                        <span>$142.30</span>
                        <ArrowUpRight className="h-3 w-3 text-red-500" />
                        <span className="text-red-500">+11.6%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Last week</span>
                      <div className="flex items-center space-x-2">
                        <span>$115.80</span>
                        <ArrowDownRight className="h-3 w-3 text-green-500" />
                        <span className="text-green-500">-9.2%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Spending Patterns</CardTitle>
                <CardDescription>When you spend the most</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">Weekend</div>
                      <p className="text-sm text-muted-foreground">40% higher</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">Evening</div>
                      <p className="text-sm text-muted-foreground">Peak time</p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    You typically spend more on weekends and during evening hours (5-8 PM).
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Spending by Category</CardTitle>
                <CardDescription>Current month breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Groceries', value: 690, color: '#22c55e' },
                        { name: 'Entertainment', value: 340, color: '#8b5cf6' },
                        { name: 'Transport', value: 220, color: '#3b82f6' },
                        { name: 'Dining', value: 465, color: '#f59e0b' },
                        { name: 'Utilities', value: 295, color: '#06b6d4' },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[
                        { name: 'Groceries', value: 690, color: '#22c55e' },
                        { name: 'Entertainment', value: 340, color: '#8b5cf6' },
                        { name: 'Transport', value: 220, color: '#3b82f6' },
                        { name: 'Dining', value: 465, color: '#f59e0b' },
                        { name: 'Utilities', value: 295, color: '#06b6d4' },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [`$${value.toLocaleString()}`, '']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Performance</CardTitle>
                <CardDescription>vs budget and previous month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { category: 'Groceries', spent: 690, budget: 700, change: +5.2 },
                    { category: 'Entertainment', spent: 340, budget: 300, change: -2.1 },
                    { category: 'Transport', spent: 220, budget: 250, change: +12.8 },
                    { category: 'Dining', spent: 465, budget: 400, change: -8.4 },
                    { category: 'Utilities', spent: 295, budget: 300, change: +1.8 },
                  ].map((item) => (
                    <div key={item.category} className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium">{item.category}</div>
                        <div className="text-sm text-muted-foreground">
                          ${item.spent} / ${item.budget}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <Badge variant={item.spent > item.budget ? "destructive" : "secondary"}>
                          {((item.spent / item.budget) * 100).toFixed(0)}%
                        </Badge>
                        <div className={cn(
                          "text-sm flex items-center space-x-1",
                          item.change > 0 ? "text-red-500" : "text-green-500"
                        )}>
                          {item.change > 0 ? (
                            <ArrowUpRight className="h-3 w-3" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3" />
                          )}
                          <span>{Math.abs(item.change).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Merchants Tab */}
        <TabsContent value="merchants" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Merchants</CardTitle>
              <CardDescription>Where you spend the most money</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topMerchantsData.map((merchant, index) => (
                  <div key={merchant.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{merchant.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {merchant.transactions} transactions • {merchant.category}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">${merchant.amount.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">
                        ${(merchant.amount / merchant.transactions).toFixed(2)} avg
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
