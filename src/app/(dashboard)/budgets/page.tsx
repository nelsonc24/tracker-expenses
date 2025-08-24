'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Plus, 
  Target, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle,
  MoreHorizontal,
  Edit,
  Trash2,
  PiggyBank
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Types
interface Budget {
  id: string
  userId: string
  name: string
  period: string
  categoryId: string | null
  amountMinor: number // amount in cents
  rollover: boolean
  startMonth: string | null
  endMonth: string | null
  createdAt: Date
  updatedAt: Date
}

interface Category {
  id: string
  name: string
  color?: string
  icon?: string
}

interface Account {
  id: string
  name: string
  institution: string
  accountType: string
  balance: string
}

interface BudgetWithProgress extends Budget {
  amount: number // converted from amountMinor
  spent: number
  remaining: number
  progressPercentage: number
  status: 'on-track' | 'warning' | 'over-budget'
  daysLeft: number
  categoryName?: string
  categoryColor?: string
  categoryIcon?: string
}

export default function BudgetsPage() {
  const { user, isLoaded } = useUser()
  const [budgets, setBudgets] = useState<BudgetWithProgress[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateBudgetOpen, setIsCreateBudgetOpen] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('current')
  const [newBudget, setNewBudget] = useState({
    name: '',
    description: '',
    amount: '',
    period: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    categoryIds: [] as string[],
    accountIds: [] as string[]
  })

  // Fetch data on component mount
  useEffect(() => {
    if (!isLoaded || !user) return

    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        // Fetch budgets, categories, and accounts in parallel
        const [budgetsRes, categoriesRes, accountsRes] = await Promise.all([
          fetch('/api/budgets'),
          fetch('/api/categories'),
          fetch('/api/accounts')
        ])

        if (!budgetsRes.ok || !categoriesRes.ok || !accountsRes.ok) {
          throw new Error('Failed to fetch data')
        }

        const [budgetsData, categoriesData, accountsData] = await Promise.all([
          budgetsRes.json(),
          categoriesRes.json(),
          accountsRes.json()
        ])

        // Calculate budget progress
        const budgetsWithProgress: BudgetWithProgress[] = await Promise.all(
          budgetsData.map(async (budget: Budget) => {
            // Calculate spent amount for this budget's category and time period
            const now = new Date()
            const currentYear = now.getFullYear()
            const currentMonth = now.getMonth() + 1
            const startMonth = budget.startMonth || `${currentYear}-${currentMonth.toString().padStart(2, '0')}`
            const endMonth = budget.endMonth || startMonth

            // Get transactions for this category in the budget period
            let spentAmount = 0
            if (budget.categoryId) {
              const spentResponse = await fetch(`/api/transactions?categoryId=${budget.categoryId}&startDate=${startMonth}-01&endDate=${endMonth}-31`)
              if (spentResponse.ok) {
                const transactions = await spentResponse.json()
                spentAmount = transactions.reduce((sum: number, t: { amount: string }) => sum + Math.abs(parseFloat(t.amount)), 0)
              }
            }

            // Convert amount from minor units (cents) to dollars
            const budgetAmount = budget.amountMinor / 100
            const remaining = Math.max(0, budgetAmount - spentAmount)
            const progressPercentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0
            
            // Calculate days left in current month
            const endDate = new Date(currentYear, currentMonth, 0) // Last day of current month
            const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

            // Determine status
            let status: 'on-track' | 'warning' | 'over-budget'
            if (progressPercentage > 100) {
              status = 'over-budget'
            } else if (progressPercentage > 80) {
              status = 'warning'
            } else {
              status = 'on-track'
            }

            // Find category details
            const category = categories.find(c => c.id === budget.categoryId)

            return {
              ...budget,
              amount: budgetAmount,
              spent: spentAmount,
              remaining,
              progressPercentage,
              status,
              daysLeft,
              categoryName: category?.name,
              categoryColor: category?.color,
              categoryIcon: category?.icon
            }
          })
        )
        
        setBudgets(budgetsWithProgress)
        setCategories(categoriesData)
        setAccounts(accountsData)
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Failed to load budgets. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, isLoaded])

  // Handle creating new budget
  const handleCreateBudget = async () => {
    try {
      const response = await fetch('/api/budgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newBudget,
          amount: parseFloat(newBudget.amount),
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create budget')
      }

      const createdBudget = await response.json()
      
      // Add to local state with initial progress calculation
      const budgetWithProgress: BudgetWithProgress = {
        ...createdBudget,
        spent: 0,
        remaining: parseFloat(createdBudget.amount),
        progressPercentage: 0,
        status: 'on-track',
        daysLeft: Math.ceil((new Date(createdBudget.endDate || Date.now()).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      }
      
      setBudgets(prev => [budgetWithProgress, ...prev])
      setIsCreateBudgetOpen(false)
      setNewBudget({
        name: '',
        description: '',
        amount: '',
        period: 'monthly',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        categoryIds: [],
        accountIds: []
      })
    } catch (err) {
      console.error('Error creating budget:', err)
      setError('Failed to create budget. Please try again.')
    }
  }

  const totalBudget = budgets.reduce((sum, budget) => sum + budget.amount, 0)
  const totalSpent = budgets.reduce((sum, budget) => sum + budget.spent, 0)
  const overBudgetCount = budgets.filter(budget => budget.status === 'over-budget').length
  const onTrackCount = budgets.filter(budget => budget.status === 'on-track').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Budgets</h1>
          <p className="text-muted-foreground mt-2">
            Set spending limits and track your progress toward financial goals
          </p>
        </div>
        <Dialog open={isCreateBudgetOpen} onOpenChange={setIsCreateBudgetOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Budget
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Budget</DialogTitle>
              <DialogDescription>
                Set a spending limit for a category to help control your expenses.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="budget-name">Budget Name</Label>
                <Input
                  id="budget-name"
                  placeholder="e.g., Monthly Groceries"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">Budget Amount (AUD)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="period">Period</Label>
                <Select defaultValue="monthly">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="rollover" className="rounded" />
                <Label htmlFor="rollover" className="text-sm">
                  Roll over unused budget to next period
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateBudgetOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsCreateBudgetOpen(false)}>
                Create Budget
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalBudget.toLocaleString('en-AU')}
            </div>
            <p className="text-xs text-muted-foreground">
              This month&apos;s limit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalSpent.toLocaleString('en-AU')}
            </div>
            <p className="text-xs text-muted-foreground">
              {((totalSpent / totalBudget) * 100).toFixed(1)}% of budget used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Over Budget</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {overBudgetCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {overBudgetCount === 1 ? 'Budget needs' : 'Budgets need'} attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Track</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {onTrackCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {onTrackCount === 1 ? 'Budget is' : 'Budgets are'} healthy
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Overview</CardTitle>
          <CardDescription>
            Your spending progress across all budget categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-2xl font-bold">
                {((totalSpent / totalBudget) * 100).toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={(totalSpent / totalBudget) * 100} 
              className="h-3"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-xl font-bold">
                  ${(totalBudget - totalSpent).toLocaleString('en-AU')}
                </div>
                <p className="text-sm text-muted-foreground">Remaining Budget</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-xl font-bold">16</div>
                <p className="text-sm text-muted-foreground">Days Left</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budgets List */}
      <Tabs value={selectedPeriod} onValueChange={setSelectedPeriod} className="space-y-4">
        <TabsList>
          <TabsTrigger value="current">Current Month</TabsTrigger>
          <TabsTrigger value="previous">Previous Month</TabsTrigger>
          <TabsTrigger value="all">All Budgets</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          <div className="grid gap-4">
            {budgets.map((budget) => {
              const progress = budget.progressPercentage
              const isOverBudget = budget.status === 'over-budget'
              const isWarning = budget.status === 'warning'
              const remainingAmount = budget.remaining
              const dailyRate = budget.spent / (31 - budget.daysLeft) || 0
              const projectedSpend = dailyRate * 31

              return (
                <Card key={budget.id} className="transition-all hover:shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: budget.categoryColor || '#6b7280' }}
                        />
                        <div>
                          <h3 className="text-lg font-semibold">{budget.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {budget.categoryIcon} {budget.categoryName || 'Uncategorized'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-xl font-bold">
                            ${budget.spent.toLocaleString('en-AU')}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            of ${budget.amount.toLocaleString('en-AU')}
                          </p>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Budget
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Calendar className="h-4 w-4 mr-2" />
                              View History
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Budget
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progress</span>
                        <div className="flex items-center space-x-2">
                          <span className={cn(
                            "font-medium",
                            isOverBudget ? "text-red-600" : isWarning ? "text-yellow-600" : "text-green-600"
                          )}>
                            {progress.toFixed(1)}%
                          </span>
                          {isOverBudget && <AlertTriangle className="h-4 w-4 text-red-500" />}
                        </div>
                      </div>
                      
                      <Progress 
                        value={Math.min(progress, 100)} 
                        className={cn(
                          "h-2",
                          isOverBudget && "bg-red-100 dark:bg-red-950"
                        )}
                      />

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Remaining</p>
                          <p className={cn(
                            "font-medium",
                            remainingAmount < 0 ? "text-red-600" : "text-green-600"
                          )}>
                            ${Math.abs(remainingAmount).toLocaleString('en-AU')}
                            {remainingAmount < 0 && ' over'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Days Left</p>
                          <p className="font-medium">{budget.daysLeft} days</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Daily Avg</p>
                          <p className="font-medium">${dailyRate.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Projected</p>
                          <p className={cn(
                            "font-medium",
                            projectedSpend > budget.amount ? "text-red-600" : "text-green-600"
                          )}>
                            ${projectedSpend.toFixed(0)}
                          </p>
                        </div>
                      </div>

                      {isOverBudget && (
                        <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <p className="text-sm text-red-700 dark:text-red-300">
                            You&apos;re ${(budget.spent - budget.amount).toFixed(2)} over budget this month.
                          </p>
                        </div>
                      )}

                      {isWarning && !isOverBudget && (
                        <div className="flex items-center space-x-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            You&apos;re approaching your budget limit. ${remainingAmount.toFixed(2)} remaining.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="previous">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <PiggyBank className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Previous Month Data</h3>
                <p className="text-muted-foreground">
                  Previous month&apos;s budget performance will be shown here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">All Budget History</h3>
                <p className="text-muted-foreground">
                  Complete budget history and trends will be shown here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
