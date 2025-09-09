'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, DollarSign, TrendingUp, Target } from 'lucide-react'
import type { SelectActivity } from '@/db/schema'

interface ActivityAnalyticsDialogProps {
  activity: SelectActivity
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface AnalyticsData {
  summary: {
    totalSpent: number
    transactionCount: number
    averageMonthlySpending: number
    projectedAnnualSpending: number
  }
  budgetProgress?: {
    budgetAmount: number
    spentAmount: number
    remainingAmount: number
    progressPercentage: number
    isOverBudget: boolean
  }
  monthlyBreakdown: Record<string, number>
  recentTransactions: Array<{
    id: string
    amount: string
    description: string
    merchant?: string
    transactionDate: string
  }>
}

export function ActivityAnalyticsDialog({ activity, open, onOpenChange }: ActivityAnalyticsDialogProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!activity) return
      
      setIsLoading(true)
      try {
        const response = await fetch(`/api/activities/${activity.id}/analytics`)
        if (response.ok) {
          const data = await response.json()
          setAnalytics(data)
        } else {
          console.error('Failed to fetch analytics')
        }
      } catch (error) {
        console.error('Error fetching analytics:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (open && activity) {
      fetchAnalytics()
    }
  }, [open, activity])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {activity.name} Analytics
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : analytics ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Spent (This Year)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(analytics.summary.totalSpent)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.summary.transactionCount}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Monthly Average
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(analytics.summary.averageMonthlySpending)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Projected Annual
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(analytics.summary.projectedAnnualSpending)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Budget Progress */}
            {analytics.budgetProgress && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Budget Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Budget: {formatCurrency(analytics.budgetProgress.budgetAmount)}</span>
                    <Badge variant={analytics.budgetProgress.isOverBudget ? "destructive" : "default"}>
                      {analytics.budgetProgress.progressPercentage.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Spent: {formatCurrency(analytics.budgetProgress.spentAmount)}</span>
                    <span>
                      Remaining: {formatCurrency(Math.max(0, analytics.budgetProgress.remainingAmount))}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Monthly Breakdown */}
            {Object.keys(analytics.monthlyBreakdown).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Monthly Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(analytics.monthlyBreakdown)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([month, amount]) => (
                        <div key={month} className="flex justify-between items-center">
                          <span className="text-sm">
                            {new Date(month + '-01').toLocaleDateString('en-AU', { 
                              year: 'numeric', 
                              month: 'long' 
                            })}
                          </span>
                          <span className="font-medium">{formatCurrency(amount)}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Transactions */}
            {analytics.recentTransactions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Recent Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.recentTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                        <div className="space-y-1">
                          <div className="font-medium">{transaction.description}</div>
                          {transaction.merchant && (
                            <div className="text-sm text-muted-foreground">{transaction.merchant}</div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {new Date(transaction.transactionDate).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="font-medium">
                          {formatCurrency(Math.abs(parseFloat(transaction.amount)))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No analytics data available yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Assign some transactions to this activity to see analytics.
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
