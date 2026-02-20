"use client"

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { InsightCard } from '@/components/dashboard-insights'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Activity,
  AlertCircle
} from 'lucide-react'
import { getIconComponent } from '@/lib/category-icons'

interface CategoryDetailDialogProps {
  categoryId: string | null
  categoryName: string
  categoryColor: string
  categoryIcon: string
  isOpen: boolean
  onClose: () => void
  period: string
}

interface CategoryDetail {
  summary: {
    totalAmount: number
    transactionCount: number
    avgTransactionAmount: number
    trend: 'increasing' | 'decreasing' | 'stable'
    trendPercentage: number
  }
  trendData: Array<{
    date: string
    amount: number
  }>
  monthlyComparison: Array<{
    month: string
    amount: number
  }>
  recentTransactions: Array<{
    id: string
    description: string
    amount: number
    date: string
    merchant?: string
  }>
  budgetInfo?: {
    budgetAmount: number
    spent: number
    remaining: number
    percentage: number
  }
}

export function CategoryDetailDialog({
  categoryId,
  categoryName,
  categoryColor,
  categoryIcon,
  isOpen,
  onClose,
  period
}: CategoryDetailDialogProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<CategoryDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchCategoryDetail = useCallback(async () => {
    if (!categoryId) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/analytics/category-detail/${categoryId}?period=${period}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch category details')
      }

      const detailData = await response.json()
      setData(detailData)
    } catch (err) {
      console.error('Error fetching category detail:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch category details')
    } finally {
      setLoading(false)
    }
  }, [categoryId, period])

  useEffect(() => {
    if (isOpen && categoryId) {
      fetchCategoryDetail()
    }
  }, [isOpen, categoryId, fetchCategoryDetail])

  const IconComponent = getIconComponent(categoryIcon)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:w-4xl sm:max-w-6xl max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: categoryColor }}
            >
              <IconComponent className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">{categoryName}</DialogTitle>
              <DialogDescription>
                Detailed analytics for selected period
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading && (
          <div className="space-y-4">
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-20" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-7 w-16 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>
        )}

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && data && (
          <div className="space-y-4">
            {/* Insights Summary */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              <InsightCard
                title="Total Spending"
                value={`$${data.summary.totalAmount.toLocaleString()}`}
                icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
                description="For selected period"
              />
              <InsightCard
                title="Transactions"
                value={data.summary.transactionCount}
                icon={<Activity className="h-4 w-4 text-muted-foreground" />}
                description="Number of transactions"
              />
              <InsightCard
                title="Average Amount"
                value={`$${data.summary.avgTransactionAmount.toLocaleString()}`}
                icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
                description="Per transaction"
              />
              <InsightCard
                title="Trend"
                value={`${Math.abs(data.summary.trendPercentage).toFixed(1)}%`}
                icon={
                  data.summary.trend === 'increasing' ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : data.summary.trend === 'decreasing' ? (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  ) : (
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  )
                }
                description={
                  data.summary.trend === 'increasing'
                    ? 'Increasing'
                    : data.summary.trend === 'decreasing'
                    ? 'Decreasing'
                    : 'Stable'
                }
              />
            </div>

            {/* Budget Progress (if applicable) */}
            {data.budgetInfo && (
              <Card>
                <CardHeader>
                  <CardTitle>Budget Progress</CardTitle>
                  <CardDescription>
                    Budget allocation for this category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Spent: ${data.budgetInfo.spent.toLocaleString()}</span>
                      <span>Budget: ${data.budgetInfo.budgetAmount.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${
                          data.budgetInfo.percentage > 100
                            ? 'bg-red-500'
                            : data.budgetInfo.percentage > 80
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(data.budgetInfo.percentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{data.budgetInfo.percentage.toFixed(1)}% used</span>
                      <span>
                        {data.budgetInfo.remaining >= 0
                          ? `$${data.budgetInfo.remaining.toLocaleString()} remaining`
                          : `$${Math.abs(data.budgetInfo.remaining).toLocaleString()} over budget`}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Spending Trend Chart */}
            {data.trendData && data.trendData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Spending Trend</CardTitle>
                  <CardDescription>
                    Daily spending pattern for selected period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={data.trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => {
                          const date = new Date(value)
                          return `${date.getMonth() + 1}/${date.getDate()}`
                        }}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']}
                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                      />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke={categoryColor}
                        strokeWidth={2}
                        dot={{ fill: categoryColor }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Monthly Comparison */}
            {data.monthlyComparison && data.monthlyComparison.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Comparison</CardTitle>
                  <CardDescription>
                    Month-over-month spending comparison
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data.monthlyComparison}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']}
                      />
                      <Bar dataKey="amount" fill={categoryColor} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Recent Transactions */}
            {data.recentTransactions && data.recentTransactions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                  <CardDescription>
                    Latest 10 transactions in this category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.recentTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{transaction.description}</div>
                          {transaction.merchant && (
                            <div className="text-sm text-muted-foreground">
                              {transaction.merchant}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {new Date(transaction.date).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            ${Math.abs(transaction.amount).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {!data.recentTransactions || data.recentTransactions.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Transactions</h3>
                  <p className="text-muted-foreground">
                    No transactions found for this category in the selected period.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
