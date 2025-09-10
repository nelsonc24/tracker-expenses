'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarIcon, Target, AlertTriangle, DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Activity {
  id: string
  name: string
  description?: string | null
}

interface ActivityBudget {
  id: string
  activityId: string
  activityName: string
  budgetAmount: number
  spentAmount: number
  transactionCount: number
  periodStart: string
  periodEnd: string
  utilization: number
  remaining: number
  isOverBudget: boolean
  daysRemaining: number
}

interface ActivityBudgetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activity: Activity | null
  existingBudget?: ActivityBudget | null
  onSuccess: () => void
}

type BudgetPeriod = 'monthly' | 'quarterly' | 'yearly' | 'custom'

export function ActivityBudgetDialog({
  open,
  onOpenChange,
  activity,
  existingBudget,
  onSuccess
}: ActivityBudgetDialogProps) {
  const [budgetAmount, setBudgetAmount] = useState('')
  const [period, setPeriod] = useState<BudgetPeriod>('monthly')
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Reset form when dialog opens/closes or activity changes
  useEffect(() => {
    if (open && activity) {
      if (existingBudget) {
        setBudgetAmount(existingBudget.budgetAmount.toString())
        setStartDate(new Date(existingBudget.periodStart))
        setEndDate(new Date(existingBudget.periodEnd))
        setPeriod('custom')
        setShowAdvanced(true)
      } else {
        setBudgetAmount('')
        setPeriod('monthly')
        setShowAdvanced(false)
        
        // Set default dates based on period
        const now = new Date()
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        
        setStartDate(firstOfMonth)
        setEndDate(lastOfMonth)
      }
    }
  }, [open, activity, existingBudget])

  // Update dates when period changes
  useEffect(() => {
    if (period !== 'custom') {
      const now = new Date()
      let start: Date
      let end: Date

      switch (period) {
        case 'monthly':
          start = new Date(now.getFullYear(), now.getMonth(), 1)
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          break
        case 'quarterly':
          const quarter = Math.floor(now.getMonth() / 3)
          start = new Date(now.getFullYear(), quarter * 3, 1)
          end = new Date(now.getFullYear(), quarter * 3 + 3, 0)
          break
        case 'yearly':
          start = new Date(now.getFullYear(), 0, 1)
          end = new Date(now.getFullYear(), 11, 31)
          break
        default:
          return
      }

      setStartDate(start)
      setEndDate(end)
    }
  }, [period])

  const handleSubmit = async () => {
    if (!activity || !budgetAmount || !startDate || !endDate) {
      toast.error('Please fill in all required fields')
      return
    }

    const amount = parseFloat(budgetAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid budget amount')
      return
    }

    if (endDate <= startDate) {
      toast.error('End date must be after start date')
      return
    }

    setIsSubmitting(true)

    try {
      const url = existingBudget 
        ? `/api/activities/budgets/${existingBudget.id}`
        : '/api/activities/budgets'
        
      const method = existingBudget ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activityId: activity.id,
          budgetAmount: amount,
          periodStart: startDate.toISOString(),
          periodEnd: endDate.toISOString(),
        }),
      })

      if (response.ok) {
        toast.success(`Budget ${existingBudget ? 'updated' : 'created'} successfully`)
        onSuccess()
        onOpenChange(false)
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to save budget')
      }
    } catch (error) {
      console.error('Error saving budget:', error)
      toast.error('Failed to save budget')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount)
  }

  const getDaysInPeriod = () => {
    if (!startDate || !endDate) return 0
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  }

  const getDailyBudget = () => {
    const amount = parseFloat(budgetAmount)
    const days = getDaysInPeriod()
    return days > 0 ? amount / days : 0
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {existingBudget ? 'Edit' : 'Set'} Budget for {activity?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Budget Overview */}
          {existingBudget && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Current Budget</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Budget Amount:</span>
                  <span className="font-medium">{formatCurrency(existingBudget.budgetAmount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Spent:</span>
                  <span className="font-medium">{formatCurrency(existingBudget.spentAmount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Remaining:</span>
                  <span className={`font-medium ${existingBudget.isOverBudget ? 'text-red-500' : 'text-green-500'}`}>
                    {formatCurrency(existingBudget.remaining)}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{existingBudget.utilization.toFixed(1)}%</span>
                  </div>
                  <Progress value={Math.min(existingBudget.utilization, 100)} />
                </div>
                {existingBudget.isOverBudget && (
                  <div className="flex items-center gap-2 text-red-500">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">Over budget by {formatCurrency(Math.abs(existingBudget.remaining))}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Budget Configuration */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="budgetAmount">Budget Amount (AUD)</Label>
              <Input
                id="budgetAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="Enter budget amount"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
              />
            </div>

            <div>
              <Label>Budget Period</Label>
              <Select value={period} onValueChange={(value: BudgetPeriod) => setPeriod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="custom">Custom Period</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(period === 'custom' || showAdvanced) && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            {!showAdvanced && period !== 'custom' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(true)}
              >
                Advanced Options
              </Button>
            )}
          </div>

          {/* Budget Preview */}
          {budgetAmount && startDate && endDate && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Budget Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Period:</span>
                    <div className="font-medium">
                      {getDaysInPeriod()} days
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Daily Budget:</span>
                    <div className="font-medium">
                      {formatCurrency(getDailyBudget())}
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between">
                    <span>Total Budget:</span>
                    <span className="font-bold text-lg">{formatCurrency(parseFloat(budgetAmount))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : existingBudget ? 'Update Budget' : 'Create Budget'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
