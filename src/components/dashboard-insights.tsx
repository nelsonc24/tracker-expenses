"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Target,
  DollarSign,
  Calendar,
  PiggyBank
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

interface InsightCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease'
    period: string
  }
  icon: React.ReactNode
  description?: string
  className?: string
}

export function InsightCard({ 
  title, 
  value, 
  change, 
  icon, 
  description,
  className 
}: InsightCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <div className="flex items-center space-x-2 text-xs">
            {change.type === 'increase' ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
            <span className={cn(
              change.type === 'increase' ? 'text-green-500' : 'text-red-500'
            )}>
              {Math.abs(change.value)}% from {change.period}
            </span>
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

interface BudgetProgressCardProps {
  budgets: Array<{
    id: string
    name: string
    spent: number
    budget: number
    category: string
  }>
}

export function BudgetProgressCard({ budgets }: BudgetProgressCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Target className="h-5 w-5" />
          <span>Budget Progress</span>
        </CardTitle>
        <CardDescription>
          Track your spending against budget goals
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {budgets.length === 0 ? (
          <div className="text-center py-6">
            <PiggyBank className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No budgets set up yet</p>
          </div>
        ) : (
          budgets.map((budget) => {
            const progress = (budget.spent / budget.budget) * 100
            const isOverBudget = progress > 100
            
            return (
              <div key={budget.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{budget.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {budget.category}
                    </Badge>
                  </div>
                  <div className="text-sm">
                    <span className={cn(
                      'font-medium',
                      isOverBudget && 'text-red-500'
                    )}>
                      ${budget.spent.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground">
                      {' '}/ ${budget.budget.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Progress 
                    value={Math.min(progress, 100)} 
                    className={cn(
                      'flex-1',
                      isOverBudget && 'bg-red-100'
                    )}
                  />
                  {isOverBudget && (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isOverBudget ? (
                    <span className="text-red-500">
                      Over budget by ${(budget.spent - budget.budget).toFixed(2)}
                    </span>
                  ) : (
                    <span>
                      ${(budget.budget - budget.spent).toFixed(2)} remaining
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

interface RecentTransactionProps {
  transactions: Array<{
    id: string
    description: string
    amount: number
    category: string
    date: string
    account: string
  }>
}

export function RecentTransactionsCard({ transactions }: RecentTransactionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <span>Recent Transactions</span>
        </CardTitle>
        <CardDescription>
          Your latest spending activity
        </CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-6">
            <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.slice(0, 5).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">{transaction.description}</p>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {transaction.category}
                    </Badge>
                    <span>{transaction.account}</span>
                    <span>•</span>
                    <span>{formatDate(transaction.date)}</span>
                  </div>
                </div>
                <div className={cn(
                  'font-medium',
                  transaction.amount < 0 ? 'text-red-500' : 'text-green-500'
                )}>
                  {transaction.amount < 0 ? '-' : '+'}${Math.abs(transaction.amount).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface SpendingInsightsProps {
  insights: {
    topCategory: { name: string; amount: number; percentage: number }
    avgDailySpend: number
    monthlyTrend: 'up' | 'down' | 'stable'
    trendPercentage: number
    unusualSpending: boolean
  }
}

export function SpendingInsightsCard({ insights }: SpendingInsightsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5" />
          <span>Spending Insights</span>
        </CardTitle>
        <CardDescription>
          AI-powered analysis of your spending patterns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Top Category</p>
            <p className="font-semibold">{insights.topCategory.name}</p>
            <p className="text-sm text-muted-foreground">
              {insights.topCategory.percentage}% of spending
            </p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Daily Average</p>
            <p className="font-semibold">${insights.avgDailySpend.toFixed(2)}</p>
            <div className="flex items-center justify-center space-x-1 text-sm">
              {insights.monthlyTrend === 'up' ? (
                <TrendingUp className="h-3 w-3 text-red-500" />
              ) : insights.monthlyTrend === 'down' ? (
                <TrendingDown className="h-3 w-3 text-green-500" />
              ) : null}
              <span className={cn(
                insights.monthlyTrend === 'up' ? 'text-red-500' : 
                insights.monthlyTrend === 'down' ? 'text-green-500' : 
                'text-muted-foreground'
              )}>
                {insights.trendPercentage}%
              </span>
            </div>
          </div>
        </div>
        
        {insights.unusualSpending && (
          <div className="flex items-center space-x-2 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <p className="text-sm text-orange-700 dark:text-orange-300">
              Unusual spending detected this month. Review your transactions.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
