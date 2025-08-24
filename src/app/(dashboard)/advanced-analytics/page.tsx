'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
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
  ComposedChart, Legend, ReferenceLine
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Calendar,
  BarChart3,
  AlertTriangle,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { ExportDialog } from '@/components/export-dialog'

interface BudgetVariance {
  budgetId: string
  budgetName: string
  categoryNames: string
  categoryColor: string
  period: string
  startDate: string
  endDate: string
  budgetAmount: number
  actualSpent: number
  variance: number
  variancePercentage: number
  status: 'under' | 'on-track' | 'over' | 'critical'
  dailyBudget: number
  dailyActual: number
  projectedSpending: number
  projectedVariance: number
  projectedVariancePercentage: number
  transactionCount: number
  daysInPeriod: number
  daysElapsed: number
  remainingDays: number
}

interface BudgetVarianceResponse {
  period: string
  dateRange: {
    startDate: string
    endDate: string
  }
  summary: {
    totalBudgets: number
    totalBudgetAmount: number
    totalActualSpent: number
    totalVariance: number
    totalVariancePercentage: number
    budgetsUnder: number
    budgetsOnTrack: number
    budgetsOver: number
    budgetsCritical: number
    avgVariancePercentage: number
  }
  budgetVariances: BudgetVariance[]
}

interface PredictiveAnalyticsResponse {
  analysisType: string
  forecastPeriod: string
  dataRange: {
    startDate: string
    endDate: string
    monthsAnalyzed: number
  }
  trends: {
    expenses: { trend: 'increasing' | 'decreasing' | 'stable'; rate: number }
    income: { trend: 'increasing' | 'decreasing' | 'stable'; rate: number }
    seasonalPatterns: Record<string, number>
  }
  historicalData: Array<{
    month: string
    income: number
    expenses: number
    netAmount: number
    transactionCount: number
    categorySpending: Record<string, number>
  }>
  forecasts: Array<{
    month: string
    forecastIncome: number
    forecastExpenses: number
    forecastNetAmount: number
    confidence: number
    recurringIncome: number
    recurringExpenses: number
    baseIncome: number
    baseExpenses: number
  }>
  insights: {
    savingsOpportunities: Array<{
      category: string
      currentMonthlySpending: number
      potentialSavings: number
      annualSavings: number
      recommendation: string
    }>
    budgetSuggestions: Array<{
      budgetName: string
      currentAmount: number
      avgSpending: number
      utilizationRate: number
      suggestedAmount?: number
      potentialSavings?: number
      additionalNeeded?: number
      type: 'reduce' | 'increase'
    }>
    recurringTransactionsCount: number
    activeBudgetsCount: number
  }
  confidence: {
    dataQuality: 'good' | 'limited'
    forecastReliability: number
  }
}

const COLORS = {
  under: '#22c55e',
  'on-track': '#3b82f6', 
  over: '#f59e0b',
  critical: '#ef4444'
}

export default function AdvancedAnalyticsPage() {
  const { user, isLoaded } = useUser()
  const [budgetVarianceData, setBudgetVarianceData] = useState<BudgetVarianceResponse | null>(null)
  const [predictiveData, setPredictiveData] = useState<PredictiveAnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [predictiveLoading, setPredictiveLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState('current')
  const [forecastMonths, setForecastMonths] = useState(3)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!isLoaded || !user) return
    fetchBudgetVariance()
    fetchPredictiveAnalytics()
  }, [isLoaded, user, selectedPeriod])

  async function fetchBudgetVariance() {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/analytics/budget-variance?period=${selectedPeriod}`)
      if (!response.ok) {
        throw new Error('Failed to fetch budget variance data')
      }
      
      const data = await response.json()
      setBudgetVarianceData(data)
    } catch (err) {
      console.error('Error fetching budget variance:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  async function fetchPredictiveAnalytics() {
    try {
      setPredictiveLoading(true)
      
      const response = await fetch(`/api/analytics/predictive?months=${forecastMonths}&type=comprehensive`)
      if (!response.ok) {
        throw new Error('Failed to fetch predictive analytics')
      }
      
      const data = await response.json()
      setPredictiveData(data)
    } catch (err) {
      console.error('Error fetching predictive analytics:', err)
      // Don't set general error for predictive analytics failures
    } finally {
      setPredictiveLoading(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    await Promise.all([fetchBudgetVariance(), fetchPredictiveAnalytics()])
    setRefreshing(false)
  }

  function getStatusIcon(status: BudgetVariance['status']) {
    switch (status) {
      case 'under':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'on-track':
        return <CheckCircle className="h-4 w-4 text-blue-600" />
      case 'over':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-600" />
    }
  }

  function getStatusBadgeVariant(status: BudgetVariance['status']) {
    switch (status) {
      case 'under':
        return 'default'
      case 'on-track':
        return 'default'
      case 'over':
        return 'secondary'
      case 'critical':
        return 'destructive'
    }
  }

  if (!isLoaded) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Authentication Required</CardTitle>
          <CardDescription>Please sign in to view advanced analytics.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Prepare chart data
  const varianceDistributionData = budgetVarianceData ? [
    { name: 'Under Budget', value: budgetVarianceData.summary.budgetsUnder, color: COLORS.under },
    { name: 'On Track', value: budgetVarianceData.summary.budgetsOnTrack, color: COLORS['on-track'] },
    { name: 'Over Budget', value: budgetVarianceData.summary.budgetsOver, color: COLORS.over },
    { name: 'Critical', value: budgetVarianceData.summary.budgetsCritical, color: COLORS.critical }
  ].filter(item => item.value > 0) : []

  const budgetPerformanceData = budgetVarianceData?.budgetVariances.map(bv => ({
    name: bv.budgetName.substring(0, 20) + (bv.budgetName.length > 20 ? '...' : ''),
    budget: bv.budgetAmount,
    actual: bv.actualSpent,
    projected: bv.projectedSpending,
    variance: bv.variance,
    status: bv.status
  })) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advanced Analytics</h1>
          <p className="text-muted-foreground">
            Deep insights into your budget performance and spending patterns
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Month</SelectItem>
              <SelectItem value="previous">Previous Month</SelectItem>
              <SelectItem value="last3months">Last 3 Months</SelectItem>
              <SelectItem value="last6months">Last 6 Months</SelectItem>
              <SelectItem value="lastyear">Last Year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          
          <ExportDialog 
            trigger={
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            }
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      )}

      {/* Budget Variance Analytics */}
      {!loading && budgetVarianceData && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Variance</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "text-2xl font-bold",
                  budgetVarianceData.summary.totalVariance > 0 ? "text-red-600" : "text-green-600"
                )}>
                  ${Math.abs(budgetVarianceData.summary.totalVariance).toLocaleString('en-US', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {budgetVarianceData.summary.totalVariancePercentage > 0 ? 'Over' : 'Under'} budget by{' '}
                  {Math.abs(budgetVarianceData.summary.totalVariancePercentage).toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Budget Performance</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {budgetVarianceData.summary.budgetsOnTrack + budgetVarianceData.summary.budgetsUnder}/
                  {budgetVarianceData.summary.totalBudgets}
                </div>
                <p className="text-xs text-muted-foreground">
                  Budgets on track or under
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alert Status</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {budgetVarianceData.summary.budgetsCritical}
                </div>
                <p className="text-xs text-muted-foreground">
                  Critical budget alerts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Variance</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "text-2xl font-bold",
                  budgetVarianceData.summary.avgVariancePercentage > 0 ? "text-red-600" : "text-green-600"
                )}>
                  {budgetVarianceData.summary.avgVariancePercentage > 0 ? '+' : ''}
                  {budgetVarianceData.summary.avgVariancePercentage.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Average across all budgets
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="variance" className="space-y-4">
            <TabsList>
              <TabsTrigger value="variance">Budget Variance</TabsTrigger>
              <TabsTrigger value="performance">Performance Analysis</TabsTrigger>
              <TabsTrigger value="projections">Projections</TabsTrigger>
              <TabsTrigger value="predictive">Predictive Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="variance" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Variance Distribution Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Budget Status Distribution</CardTitle>
                    <CardDescription>
                      How your budgets are performing this period
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={varianceDistributionData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {varianceDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Budget Performance Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Budget vs Actual Spending</CardTitle>
                    <CardDescription>
                      Comparison of budgeted vs actual amounts
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={budgetPerformanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                        />
                        <Legend />
                        <Bar dataKey="budget" fill="#3b82f6" name="Budget" fillOpacity={0.6} />
                        <Bar dataKey="actual" fill="#ef4444" name="Actual" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Budget Details Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Budget Variance Details</CardTitle>
                  <CardDescription>
                    Detailed breakdown of each budget&apos;s performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {budgetVarianceData.budgetVariances.map((variance) => (
                      <div key={variance.budgetId} 
                           className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center space-x-4">
                          {getStatusIcon(variance.status)}
                          <div>
                            <h4 className="font-medium">{variance.budgetName}</h4>
                            <p className="text-sm text-muted-foreground">
                              {variance.categoryNames}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-6">
                          <div className="text-center">
                            <p className="text-sm font-medium">
                              ${variance.actualSpent.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              of ${variance.budgetAmount.toLocaleString()}
                            </p>
                          </div>
                          
                          <div className="text-center">
                            <div className={cn(
                              "text-sm font-medium",
                              variance.variance > 0 ? "text-red-600" : "text-green-600"
                            )}>
                              {variance.variance > 0 ? '+' : ''}${variance.variance.toLocaleString()}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {variance.variancePercentage > 0 ? '+' : ''}
                              {variance.variancePercentage.toFixed(1)}%
                            </p>
                          </div>
                          
                          <Badge variant={getStatusBadgeVariant(variance.status)}>
                            {variance.status.replace('-', ' ')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Daily Spending Analysis</CardTitle>
                  <CardDescription>
                    Daily budget vs actual spending rates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {budgetVarianceData.budgetVariances.map((variance) => (
                      <div key={variance.budgetId} 
                           className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <h4 className="font-medium">{variance.budgetName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {variance.remainingDays} days remaining
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="text-center">
                            <p className="text-sm font-medium">
                              ${variance.dailyBudget.toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">Daily budget</p>
                          </div>
                          
                          <div className="text-center">
                            <p className={cn(
                              "text-sm font-medium",
                              variance.dailyActual > variance.dailyBudget ? "text-red-600" : "text-green-600"
                            )}>
                              ${variance.dailyActual.toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">Daily actual</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="projections" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Spending Projections</CardTitle>
                  <CardDescription>
                    Projected end-of-period spending based on current trends
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={budgetPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                      />
                      <Legend />
                      <Bar dataKey="budget" fill="#3b82f6" name="Budget" fillOpacity={0.6} />
                      <Bar dataKey="actual" fill="#22c55e" name="Current Spending" />
                      <Line 
                        type="monotone" 
                        dataKey="projected" 
                        stroke="#ef4444" 
                        strokeWidth={3}
                        name="Projected Total"
                        dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="predictive" className="space-y-6">
              {predictiveLoading && (
                <div className="space-y-4">
                  <Skeleton className="h-64" />
                  <Skeleton className="h-32" />
                </div>
              )}
              
              {!predictiveLoading && predictiveData && (
                <>
                  {/* Forecast Overview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Spending Forecast ({predictiveData.forecastPeriod})</span>
                        <div className="flex items-center space-x-2">
                          <Select 
                            value={forecastMonths.toString()} 
                            onValueChange={(value) => {
                              setForecastMonths(parseInt(value))
                              fetchPredictiveAnalytics()
                            }}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1M</SelectItem>
                              <SelectItem value="3">3M</SelectItem>
                              <SelectItem value="6">6M</SelectItem>
                              <SelectItem value="12">1Y</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardTitle>
                      <CardDescription>
                        AI-powered forecasts based on {predictiveData.dataRange.monthsAnalyzed} months of historical data
                        {predictiveData.confidence.dataQuality === 'limited' && (
                          <span className="text-orange-600 ml-2">⚠️ Limited data available</span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={400}>
                        <ComposedChart data={[...predictiveData.historicalData.slice(-6), ...predictiveData.forecasts]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip 
                            formatter={(value: number, name: string) => {
                              if (name.includes('forecast')) {
                                return [`$${value.toLocaleString()} (forecast)`, name]
                              }
                              return [`$${value.toLocaleString()}`, name]
                            }}
                          />
                          <Legend />
                          <Bar dataKey="expenses" fill="#ef4444" name="Historical Expenses" />
                          <Bar dataKey="income" fill="#22c55e" name="Historical Income" />
                          <Line 
                            type="monotone" 
                            dataKey="forecastExpenses" 
                            stroke="#f59e0b" 
                            strokeWidth={3}
                            strokeDasharray="5 5"
                            name="Forecast Expenses"
                            dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="forecastIncome" 
                            stroke="#06b6d4" 
                            strokeWidth={3}
                            strokeDasharray="5 5"
                            name="Forecast Income"
                            dot={{ fill: '#06b6d4', strokeWidth: 2, r: 4 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Trends Analysis */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Spending Trends</CardTitle>
                        <CardDescription>Identified patterns in your financial behavior</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 border rounded">
                            <div className="flex items-center space-x-3">
                              {predictiveData.trends.expenses.trend === 'increasing' ? (
                                <TrendingUp className="h-5 w-5 text-red-600" />
                              ) : predictiveData.trends.expenses.trend === 'decreasing' ? (
                                <TrendingDown className="h-5 w-5 text-green-600" />
                              ) : (
                                <Clock className="h-5 w-5 text-blue-600" />
                              )}
                              <div>
                                <p className="font-medium">Expense Trend</p>
                                <p className="text-sm text-muted-foreground">
                                  {predictiveData.trends.expenses.trend === 'stable' 
                                    ? 'Stable spending pattern'
                                    : `${predictiveData.trends.expenses.trend} by ${predictiveData.trends.expenses.rate}%/month`
                                  }
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-3 border rounded">
                            <div className="flex items-center space-x-3">
                              {predictiveData.trends.income.trend === 'increasing' ? (
                                <TrendingUp className="h-5 w-5 text-green-600" />
                              ) : predictiveData.trends.income.trend === 'decreasing' ? (
                                <TrendingDown className="h-5 w-5 text-red-600" />
                              ) : (
                                <Clock className="h-5 w-5 text-blue-600" />
                              )}
                              <div>
                                <p className="font-medium">Income Trend</p>
                                <p className="text-sm text-muted-foreground">
                                  {predictiveData.trends.income.trend === 'stable' 
                                    ? 'Stable income pattern'
                                    : `${predictiveData.trends.income.trend} by ${predictiveData.trends.income.rate}%/month`
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Savings Opportunities</CardTitle>
                        <CardDescription>AI-identified ways to reduce spending</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {predictiveData.insights.savingsOpportunities.slice(0, 4).map((opportunity, index) => (
                            <div key={index} className="flex items-center justify-between p-3 border rounded">
                              <div>
                                <p className="font-medium">{opportunity.category}</p>
                                <p className="text-sm text-muted-foreground">
                                  {opportunity.recommendation}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-green-600">
                                  ${opportunity.potentialSavings}/mo
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  ${opportunity.annualSavings}/year
                                </p>
                              </div>
                            </div>
                          ))}
                          {predictiveData.insights.savingsOpportunities.length === 0 && (
                            <p className="text-muted-foreground text-center py-4">
                              No specific savings opportunities identified. Your spending appears well-optimized!
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Budget Optimization */}
                  {predictiveData.insights.budgetSuggestions.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Budget Optimization Suggestions</CardTitle>
                        <CardDescription>
                          Recommended adjustments to improve budget accuracy
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {predictiveData.insights.budgetSuggestions.map((suggestion, index) => (
                            <div key={index} className="flex items-center justify-between p-4 border rounded">
                              <div>
                                <h4 className="font-medium">{suggestion.budgetName}</h4>
                                <p className="text-sm text-muted-foreground">
                                  Current: ${suggestion.currentAmount} | 
                                  Avg Spending: ${suggestion.avgSpending} | 
                                  Utilization: {suggestion.utilizationRate}%
                                </p>
                              </div>
                              
                              <div className="text-right">
                                {suggestion.type === 'reduce' ? (
                                  <div>
                                    <p className="font-medium text-green-600">
                                      Reduce to ${suggestion.suggestedAmount}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Save ${suggestion.potentialSavings}/month
                                    </p>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="font-medium text-orange-600">
                                      Increase to ${suggestion.suggestedAmount}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Add ${suggestion.additionalNeeded}/month
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
              
              {!predictiveLoading && !predictiveData && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Insufficient Data</h3>
                    <p className="text-muted-foreground mb-4">
                      Need at least 3 months of transaction history to generate predictive analytics.
                    </p>
                    <Button onClick={() => window.location.href = '/transactions'}>
                      View Transactions
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* No Data State */}
      {!loading && !budgetVarianceData && (
        <Card>
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Analytics Data</h3>
            <p className="text-muted-foreground mb-4">
              Create some budgets to see advanced analytics and variance reports.
            </p>
            <Button>Create Your First Budget</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
