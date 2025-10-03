"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  DollarSign,
  Calendar
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import Link from 'next/link'

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
  href?: string
  onClick?: () => void
}

export function InsightCard({ 
  title, 
  value, 
  change, 
  icon, 
  description,
  className,
  href,
  onClick 
}: InsightCardProps) {
  const cardContent = (
    <>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium truncate">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="pb-3 flex-1 flex flex-col justify-between">
        <div className="text-lg sm:text-2xl font-bold break-all mb-2">{value}</div>
        <div className="space-y-1">
          {change && (
            <div className="flex items-center space-x-1 sm:space-x-2 text-xs">
              {change.type === 'increase' ? (
                <TrendingUp className="h-3 w-3 text-green-500 flex-shrink-0" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 flex-shrink-0" />
              )}
              <span className={cn(
                "truncate",
                change.type === 'increase' ? 'text-green-500' : 'text-red-500'
              )}>
                {Math.abs(change.value).toFixed(1)}% from {change.period}
              </span>
            </div>
          )}
          {description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {description}
            </p>
          )}
        </div>
      </CardContent>
    </>
  )

  if (href) {
    return (
      <Link href={href} className="block h-full">
        <Card className={cn(
          "transition-all duration-200 hover:shadow-md hover:scale-[1.02] cursor-pointer h-full flex flex-col",
          className
        )}>
          {cardContent}
        </Card>
      </Link>
    )
  }

  if (onClick) {
    return (
      <Card 
        className={cn(
          "transition-all duration-200 hover:shadow-md hover:scale-[1.02] cursor-pointer h-full flex flex-col",
          className
        )}
        onClick={onClick}
      >
        {cardContent}
      </Card>
    )
  }

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      {cardContent}
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
