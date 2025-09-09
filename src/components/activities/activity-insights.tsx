"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, TrendingDown, Minus, Target, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Activity {
  id: string
  name: string
  description?: string
  totalSpent: number
  transactionCount: number
  avgTransaction: number
  percentageOfTotal: number
  trend?: 'up' | 'down' | 'stable'
  trendPercentage?: number
}

interface ActivityBudget {
  activityId: string
  activityName: string
  budgetAmount: number
  actualSpent: number
  remaining: number
  isOverBudget: boolean
  budgetUtilization: number
  daysRemaining?: number
}

interface ActivitySpendingTrendsProps {
  activities: Activity[]
  className?: string
  showTrends?: boolean
  maxItems?: number
}

interface ActivityBudgetProgressProps {
  budgets: ActivityBudget[]
  className?: string
  showAlerts?: boolean
}

interface ActivityComparisonProps {
  activities: Activity[]
  className?: string
  comparisonPeriod?: string
}

export function ActivitySpendingTrends({ 
  activities, 
  className, 
  showTrends = true,
  maxItems = 10 
}: ActivitySpendingTrendsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount)
  }

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const sortedActivities = activities
    .filter(activity => activity.totalSpent > 0)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, maxItems)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Activity Spending Trends
        </CardTitle>
        <CardDescription>
          Track spending patterns across your activities
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedActivities.map((activity, index) => (
            <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    #{index + 1}
                  </span>
                  <h4 className="font-medium">{activity.name}</h4>
                  {showTrends && activity.trend && (
                    <div className="flex items-center gap-1">
                      {getTrendIcon(activity.trend)}
                      {activity.trendPercentage && (
                        <span className={cn(
                          "text-xs",
                          activity.trend === 'up' ? "text-green-600" : 
                          activity.trend === 'down' ? "text-red-600" : "text-gray-600"
                        )}>
                          {activity.trendPercentage > 0 ? '+' : ''}{activity.trendPercentage}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {activity.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {activity.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {activity.transactionCount} transactions
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Avg {formatCurrency(activity.avgTransaction)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">
                  {formatCurrency(activity.totalSpent)}
                </div>
                <Badge variant="secondary" className="text-xs">
                  {activity.percentageOfTotal.toFixed(1)}%
                </Badge>
              </div>
            </div>
          ))}
          {sortedActivities.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <TrendingUp className="h-8 w-8 mx-auto mb-2" />
              <p>No spending data available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function ActivityBudgetProgress({ 
  budgets, 
  className, 
  showAlerts = true 
}: ActivityBudgetProgressProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount)
  }

  const alertBudgets = budgets.filter(budget => budget.budgetUtilization > 80)
  const sortedBudgets = budgets.sort((a, b) => b.budgetUtilization - a.budgetUtilization)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Budget Progress
          {showAlerts && alertBudgets.length > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {alertBudgets.length} alerts
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Monitor budget utilization across activities
        </CardDescription>
      </CardHeader>
      <CardContent>
        {budgets.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Target className="h-8 w-8 mx-auto mb-2" />
            <p>No budgets configured</p>
            <p className="text-sm">Set budgets to track spending limits</p>
          </div>
        ) : (
          <div className="space-y-6">
            {showAlerts && alertBudgets.length > 0 && (
              <div className="p-4 border border-amber-200 bg-amber-50 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <h4 className="font-medium text-amber-800">Budget Alerts</h4>
                </div>
                <div className="space-y-2">
                  {alertBudgets.map((budget, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-amber-700">{budget.activityName}</span>
                      <Badge 
                        variant={budget.isOverBudget ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {budget.budgetUtilization.toFixed(0)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              {sortedBudgets.map((budget, index) => (
                <div key={index} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{budget.activityName}</h4>
                      {budget.daysRemaining !== undefined && (
                        <p className="text-xs text-muted-foreground">
                          {budget.daysRemaining} days remaining
                        </p>
                      )}
                    </div>
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
                    <span className={cn(
                      budget.isOverBudget ? "text-red-600" : "text-green-600"
                    )}>
                      {budget.isOverBudget ? "Over budget" : "On track"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ActivityComparison({ 
  activities, 
  className, 
  comparisonPeriod = "last month" 
}: ActivityComparisonProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount)
  }

  const topActivities = activities
    .filter(activity => activity.totalSpent > 0)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5)

  const totalSpent = activities.reduce((sum, activity) => sum + activity.totalSpent, 0)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Activity Comparison</CardTitle>
        <CardDescription>
          Compare spending across your top activities vs {comparisonPeriod}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topActivities.map((activity, index) => (
            <div key={activity.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {index + 1}
                  </span>
                  <span className="font-medium">{activity.name}</span>
                  {activity.trend && (
                    <div className="flex items-center gap-1">
                      {activity.trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
                      {activity.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
                      {activity.trend === 'stable' && <Minus className="h-3 w-3 text-gray-500" />}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatCurrency(activity.totalSpent)}</div>
                  <div className="text-xs text-muted-foreground">
                    {activity.percentageOfTotal.toFixed(1)}% of total
                  </div>
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min((activity.totalSpent / totalSpent) * 100, 100)}%` 
                  }}
                />
              </div>
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{activity.transactionCount} transactions</span>
                <span>Avg {formatCurrency(activity.avgTransaction)}</span>
              </div>
            </div>
          ))}
          
          {topActivities.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <TrendingUp className="h-8 w-8 mx-auto mb-2" />
              <p>No activity data to compare</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
