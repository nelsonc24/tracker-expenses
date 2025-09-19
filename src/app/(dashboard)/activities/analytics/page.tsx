"use client"

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, Target, AlertTriangle, DollarSign, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActivityAnalytics {
  summary: {
    totalActivities: number
    activitiesWithSpending: number
    totalSpentAllActivities: number
    averagePerActivity: number
    timeframe: string
    dateRange: {
      from: string
      to: string
    }
  }
  activities: Array<{
    activityId: string
    activityName: string
    activityDescription?: string
    totalSpent: number
    transactionCount: number
    avgTransaction: number
    percentageOfTotal: number
  }>
  trends: Array<{
    month: string
    activityId: string
    activityName: string
    totalSpent: number
    transactionCount: number
  }>
  budgets: Array<{
    activityId: string
    activityName: string
    budgetAmount: number
    actualSpent: number
    remaining: number
    isOverBudget: boolean
    budgetUtilization: number
  }>
  insights: {
    topActivity: {
      name: string
      spent: number
      transactionCount: number
    } | null
    budgetAlerts: Array<{
      activityName: string
      utilization: number
      budget: number
      spent: number
    }>
  }
}

export default function ActivityAnalyticsPage() {
  const [analytics, setAnalytics] = useState<ActivityAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('month')
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      console.log('Fetching analytics for timeframe:', timeframe)
      const response = await fetch(`/api/analytics/activities?timeframe=${timeframe}`)
      
      console.log('Analytics response status:', response.status)
      console.log('Analytics response headers:', response.headers)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Analytics API error response:', errorText)
        throw new Error(`Failed to fetch analytics: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('Analytics data received:', data)
      setAnalytics(data)
    } catch (err) {
      console.error('Error fetching analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }, [timeframe])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Activity Analytics</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded animate-pulse mb-2"></div>
                <div className="h-8 bg-muted rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Activity Analytics</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p>{error}</p>
              <Button onClick={fetchAnalytics} className="mt-4">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!analytics) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Activity Analytics</h1>
          <p className="text-muted-foreground">
            Track spending patterns and budget performance by activity
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="quarter">Quarter</SelectItem>
              <SelectItem value="year">Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics.summary.totalSpentAllActivities)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {analytics.summary.activitiesWithSpending} activities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Activities</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.summary.activitiesWithSpending}
            </div>
            <p className="text-xs text-muted-foreground">
              Of {analytics.summary.totalActivities} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average per Activity</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics.summary.averagePerActivity)}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.summary.timeframe} period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.insights.budgetAlerts.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Over 80% utilization
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Alerts */}
      {analytics.insights.budgetAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Budget Alerts
            </CardTitle>
            <CardDescription>
              Activities that are approaching or exceeding their budget limits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.insights.budgetAlerts.map((alert, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg bg-amber-50">
                  <div className="flex-1">
                    <h4 className="font-medium">{alert.activityName}</h4>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(alert.spent)} of {formatCurrency(alert.budget)} spent
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress 
                      value={alert.utilization} 
                      className="w-20"
                    />
                    <Badge variant={alert.utilization > 100 ? "destructive" : "secondary"}>
                      {alert.utilization.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Activities */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Activities by Spending</CardTitle>
            <CardDescription>
              Activities with the highest spending in the selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.activities
                .filter(activity => activity.totalSpent > 0)
                .slice(0, 8)
                .map((activity, index) => (
                  <div key={activity.activityId} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          #{index + 1}
                        </span>
                        <h4 className="font-medium">{activity.activityName}</h4>
                      </div>
                      {activity.activityDescription && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.activityDescription}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {activity.transactionCount} transactions • Avg {formatCurrency(activity.avgTransaction)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {formatCurrency(activity.totalSpent)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {activity.percentageOfTotal.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Budget Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Performance</CardTitle>
            <CardDescription>
              Current budget status for activities with budgets
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.budgets.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Target className="h-8 w-8 mx-auto mb-2" />
                <p>No budgets set for activities</p>
                <p className="text-sm">Create budgets to track spending limits</p>
              </div>
            ) : (
              <div className="space-y-4">
                {analytics.budgets.map((budget, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{budget.activityName}</h4>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {formatCurrency(budget.actualSpent)} / {formatCurrency(budget.budgetAmount)}
                        </div>
                        <Badge 
                          variant={budget.isOverBudget ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {budget.budgetUtilization.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                    <Progress 
                      value={Math.min(budget.budgetUtilization, 100)} 
                      className={cn(
                        "h-2",
                        budget.isOverBudget && "bg-red-100"
                      )}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {budget.remaining > 0 
                          ? `${formatCurrency(budget.remaining)} remaining`
                          : `${formatCurrency(Math.abs(budget.remaining))} over budget`
                        }
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Activity Insights */}
      {analytics.insights.topActivity && (
        <Card>
          <CardHeader>
            <CardTitle>Spending Leader</CardTitle>
            <CardDescription>
              Your highest spending activity in the selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{analytics.insights.topActivity.name}</h3>
                <p className="text-muted-foreground">
                  {analytics.insights.topActivity.transactionCount} transactions
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(analytics.insights.topActivity.spent)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total spent
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
