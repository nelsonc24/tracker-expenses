"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Target, PiggyBank, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BudgetData {
  id: string
  name: string
  spent: number
  budget: number
  progress: number
  isOverBudget: boolean
  remaining: number
  category: string
  periodType: string
  originalBudget: number
}

interface BudgetProgressResponse {
  period: string
  budgets: BudgetData[]
  overallProgress: number
  dateRange: {
    startDate: string
    endDate: string
  }
}

const TIME_PERIODS = [
  { value: 'current-month', label: 'This Month' },
  { value: 'last-3-months', label: 'Last 3 Months' },
  { value: 'last-6-months', label: 'Last 6 Months' },
  { value: 'last-year', label: 'Last Year' },
]

interface BudgetProgressCardProps {
  initialBudgets?: Array<{
    id: string
    name: string
    spent: number
    budget: number
    category: string
  }>
}

export function BudgetProgressCard({ initialBudgets }: BudgetProgressCardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('current-month')
  const [budgets, setBudgets] = useState<BudgetData[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/analytics/budget-progress?period=${selectedPeriod}`)
        if (response.ok) {
          const result: BudgetProgressResponse = await response.json()
          setBudgets(result.budgets)
        }
      } catch (error) {
        console.error('Error fetching budget progress:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedPeriod])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <div>
              <CardTitle>Budget Progress</CardTitle>
              <CardDescription className="mt-1">
                Track your spending against budget goals
              </CardDescription>
            </div>
          </div>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_PERIODS.map((period) => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : budgets.length === 0 ? (
          <div className="text-center py-6">
            <PiggyBank className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No budgets set up yet</p>
          </div>
        ) : (
          budgets.map((budget) => {
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
                      budget.isOverBudget && 'text-red-500'
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
                    value={Math.min(budget.progress, 100)} 
                    className={cn(
                      'flex-1',
                      budget.isOverBudget && 'bg-red-100'
                    )}
                  />
                  {budget.isOverBudget && (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className={cn(
                    'text-muted-foreground',
                    budget.isOverBudget && 'text-red-500'
                  )}>
                    {budget.isOverBudget ? (
                      <>Over budget by ${(budget.spent - budget.budget).toFixed(2)}</>
                    ) : (
                      <>${budget.remaining.toFixed(2)} remaining</>
                    )}
                  </span>
                  {selectedPeriod !== 'current-month' && (
                    <span className="text-muted-foreground text-[10px]">
                      {budget.periodType} budget: ${budget.originalBudget}
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
