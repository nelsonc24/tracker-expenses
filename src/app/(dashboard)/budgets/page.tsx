'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { 
  Plus, 
  Target, 
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle,
  MoreHorizontal,
  Edit,
  Trash2,
  PiggyBank,
  List,
  RefreshCw,
  // Add category icons
  ShoppingCart,
  Car,
  Home,
  Utensils,
  Coffee,
  Gamepad2,
  Plane,
  Heart,
  GraduationCap,
  Briefcase,
  CreditCard,
  Gift,
  Music,
  Shirt,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
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
  description?: string
  amount: string // decimal from database
  currency: string
  period: string
  startDate: Date
  endDate?: Date
  categoryIds: string[]
  accountIds: string[]
  alertThreshold: string
  isActive: boolean
  metadata?: {
    color?: string
    notifications?: boolean
    rollover?: boolean
  }
  createdAt: Date
  updatedAt: Date
}

interface Category {
  id: string
  name: string
  color?: string
  icon?: string
}

interface Transaction {
  id: string
  description: string
  amount: number | string
  category: string
  categoryId: string | null
  date: string
  transactionDate?: string
  account: string
  accountId: string | null
  type?: 'debit' | 'credit' | 'transfer'
  merchant: string
  reference: string
  receiptNumber?: string
  tags: string[]
  notes: string
  balance?: number
}

interface BudgetWithProgress extends Omit<Budget, 'amount'> {
  amount: number // converted from decimal string
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
  const [error, setError] = useState<string | null>(null)
  const [isCreateBudgetOpen, setIsCreateBudgetOpen] = useState(false)
  const [isEditBudgetOpen, setIsEditBudgetOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isViewHistoryOpen, setIsViewHistoryOpen] = useState(false)
  const [isViewTransactionsOpen, setIsViewTransactionsOpen] = useState(false)
  const [budgetToDelete, setBudgetToDelete] = useState<BudgetWithProgress | null>(null)
  const [budgetToViewHistory, setBudgetToViewHistory] = useState<BudgetWithProgress | null>(null)
  const [budgetToViewTransactions, setBudgetToViewTransactions] = useState<BudgetWithProgress | null>(null)
  const [budgetTransactions, setBudgetTransactions] = useState<Transaction[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [editingBudget, setEditingBudget] = useState<BudgetWithProgress | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState('current')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [editSelectedCategory, setEditSelectedCategory] = useState('')
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
  const [editBudget, setEditBudget] = useState({
    name: '',
    description: '',
    amount: '',
    period: 'monthly',
    startDate: '',
    endDate: '',
    categoryIds: [] as string[],
    accountIds: [] as string[]
  })

  // Helper function to get amount as number
  const getAmountAsNumber = (amount: string | number): number => {
    return typeof amount === 'string' ? parseFloat(amount) : amount
  }

  // Add icon mapping function
  const getCategoryIcon = (iconName: string) => {
    const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
      'shopping-cart': ShoppingCart,
      'car': Car,
      'home': Home,
      'utensils': Utensils,
      'coffee': Coffee,
      'gamepad2': Gamepad2,
      'plane': Plane,
      'heart': Heart,
      'graduation-cap': GraduationCap,
      'briefcase': Briefcase,
      'credit-card': CreditCard,
      'gift': Gift,
      'music': Music,
      'shirt': Shirt,
      'zap': Zap,
      'dollar-sign': DollarSign
    }
    
    const IconComponent = iconMap[iconName] || DollarSign
    return <IconComponent className="h-4 w-4" />
  }

  // Fetch data function (separated for reusability)
  const fetchData = useCallback(async () => {
    if (!user) return

    try {
      setError(null)

      // Fetch budgets and categories in parallel
      const [budgetsRes, categoriesRes] = await Promise.all([
        fetch('/api/budgets'),
        fetch('/api/categories')
      ])

      if (!budgetsRes.ok || !categoriesRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const [budgetsData, categoriesData] = await Promise.all([
        budgetsRes.json(),
        categoriesRes.json()
      ])

      // Calculate budget progress
      const budgetsWithProgress: BudgetWithProgress[] = await Promise.all(
        budgetsData.map(async (budget: Budget) => {
          // Calculate spent amount for this budget's categories and time period
          const now = new Date()
          const budgetStart = new Date(budget.startDate)
          const budgetEnd = budget.endDate ? new Date(budget.endDate) : new Date(budgetStart.getFullYear(), budgetStart.getMonth() + 1, 0)

          // Get transactions for these categories in the budget period
          let spentAmount = 0
          if (budget.categoryIds.length > 0) {
            for (const categoryId of budget.categoryIds) {
              const apiUrl = `/api/transactions?categoryId=${categoryId}&startDate=${budgetStart.toISOString().split('T')[0]}&endDate=${budgetEnd.toISOString().split('T')[0]}`
              
              const spentResponse = await fetch(apiUrl)
              if (spentResponse.ok) {
                const transactions = await spentResponse.json()
                
                const categorySpent = transactions.reduce((sum: number, t: Transaction) => {
                  const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount
                  const spendingAmount = amount < 0 ? Math.abs(amount) : amount
                  return sum + spendingAmount
                }, 0)
                
                spentAmount += categorySpent
              }
            }
          }

          // Convert amount from decimal string to number
          const budgetAmount = parseFloat(budget.amount)
          const remaining = Math.max(0, budgetAmount - spentAmount)
          const progressPercentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0
          
          // Calculate days left in budget period
          const daysLeft = Math.max(0, Math.ceil((budgetEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

          // Determine status
          let status: 'on-track' | 'warning' | 'over-budget'
          if (progressPercentage > 100) {
            status = 'over-budget'
          } else if (progressPercentage > 80) {
            status = 'warning'
          } else {
            status = 'on-track'
          }

          // Find primary category details (first category in the list)
          const primaryCategoryId = budget.categoryIds[0]
          const category = categoriesData.find((c: Category) => c.id === primaryCategoryId)

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
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load budgets. Please try again.')
    }
  }, [user])

  // Fetch data on component mount and when page becomes visible
  useEffect(() => {
    if (!isLoaded || !user) return
    fetchData()
  }, [user, isLoaded, fetchData])

  // Add event listener for page visibility changes to refresh budgets when user returns to the page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        fetchData()
      }
    }

    const handleWindowFocus = () => {
      if (user) {
        fetchData()
      }
    }

    // Listen for transaction updates from other parts of the app
    const handleTransactionUpdate = () => {
      if (user) {
        fetchData()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleWindowFocus)
    window.addEventListener('transactionUpdated', handleTransactionUpdate as EventListener)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleWindowFocus)
      window.removeEventListener('transactionUpdated', handleTransactionUpdate as EventListener)
    }
  }, [user, fetchData])

  // Handle creating new budget
  const handleCreateBudget = async () => {
    if (!newBudget.name || !newBudget.amount || !selectedCategory) {
      setError('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch('/api/budgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newBudget.name,
          description: newBudget.description,
          amount: parseFloat(newBudget.amount),
          period: newBudget.period,
          startDate: newBudget.startDate,
          endDate: newBudget.endDate || null,
          categoryIds: selectedCategory ? [selectedCategory] : [],
          accountIds: newBudget.accountIds
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create budget')
      }

      const createdBudget = await response.json()
      
      // Add to local state with initial progress calculation
      const budgetWithProgress: BudgetWithProgress = {
        ...createdBudget,
        amount: parseFloat(createdBudget.amount),
        spent: 0,
        remaining: parseFloat(createdBudget.amount),
        progressPercentage: 0,
        status: 'on-track',
        daysLeft: Math.ceil((new Date(createdBudget.endDate || Date.now()).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      }
      
      setBudgets(prev => [budgetWithProgress, ...prev])
      setIsCreateBudgetOpen(false)
      setSelectedCategory('')
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

  // Handle opening edit dialog
  const handleEditBudget = (budget: BudgetWithProgress) => {
    setEditingBudget(budget)
    setEditBudget({
      name: budget.name,
      description: budget.description || '',
      amount: budget.amount.toString(),
      period: budget.period,
      startDate: new Date(budget.startDate).toISOString().split('T')[0],
      endDate: budget.endDate ? new Date(budget.endDate).toISOString().split('T')[0] : '',
      categoryIds: budget.categoryIds,
      accountIds: budget.accountIds
    })
    setEditSelectedCategory(budget.categoryIds[0] || '')
    setIsEditBudgetOpen(true)
  }

  // Handle updating budget
  const handleUpdateBudget = async () => {
    if (!editingBudget || !editBudget.name || !editBudget.amount || !editSelectedCategory) {
      setError('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch(`/api/budgets/${editingBudget.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editBudget.name,
          description: editBudget.description,
          amount: parseFloat(editBudget.amount),
          period: editBudget.period,
          startDate: editBudget.startDate,
          endDate: editBudget.endDate || null,
          categoryIds: editSelectedCategory ? [editSelectedCategory] : [],
          accountIds: editBudget.accountIds
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update budget')
      }

      const updatedBudget = await response.json()
      
      // Update local state
      setBudgets(prev => prev.map(budget => 
        budget.id === editingBudget.id 
          ? {
              ...budget,
              ...updatedBudget,
              amount: parseFloat(updatedBudget.amount),
              remaining: parseFloat(updatedBudget.amount) - budget.spent,
              progressPercentage: budget.spent > 0 ? (budget.spent / parseFloat(updatedBudget.amount)) * 100 : 0,
              status: (budget.spent / parseFloat(updatedBudget.amount)) * 100 > 100 ? 'over-budget' : 
                      (budget.spent / parseFloat(updatedBudget.amount)) * 100 > 80 ? 'warning' : 'on-track'
            }
          : budget
      ))
      
      setIsEditBudgetOpen(false)
      setEditingBudget(null)
      setEditSelectedCategory('')
      setError(null)
    } catch (err) {
      console.error('Error updating budget:', err)
      setError('Failed to update budget. Please try again.')
    }
  }

  // Handle opening delete confirmation dialog
  const handleOpenDeleteDialog = (budget: BudgetWithProgress) => {
    setBudgetToDelete(budget)
    setIsDeleteDialogOpen(true)
  }

  // Handle confirming budget deletion
  const handleConfirmDelete = async () => {
    if (!budgetToDelete) return

    try {
      const response = await fetch(`/api/budgets/${budgetToDelete.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete budget')
      }

      setBudgets(prev => prev.filter(budget => budget.id !== budgetToDelete.id))
      setError(null)
      setIsDeleteDialogOpen(false)
      setBudgetToDelete(null)
    } catch (err) {
      console.error('Error deleting budget:', err)
      setError('Failed to delete budget. Please try again.')
    }
  }

  // Handle opening view history dialog
  const handleOpenViewHistory = (budget: BudgetWithProgress) => {
    setBudgetToViewHistory(budget)
    setIsViewHistoryOpen(true)
  }

  // Handle opening view transactions dialog
  const handleOpenViewTransactions = async (budget: BudgetWithProgress) => {
    setBudgetToViewTransactions(budget)
    setIsViewTransactionsOpen(true)
    setLoadingTransactions(true)

    try {
      // Fetch transactions for this budget's categories within the budget period
      const budgetStart = new Date(budget.startDate).toISOString().split('T')[0]
      const budgetEnd = budget.endDate 
        ? new Date(budget.endDate).toISOString().split('T')[0] 
        : new Date(new Date(budget.startDate).getFullYear(), new Date(budget.startDate).getMonth() + 1, 0).toISOString().split('T')[0]
      
      const allTransactions = []
      for (const categoryId of budget.categoryIds) {
        const response = await fetch(`/api/transactions?categoryId=${categoryId}&startDate=${budgetStart}&endDate=${budgetEnd}&limit=1000`)
        if (response.ok) {
          const transactions = await response.json()
          allTransactions.push(...transactions)
        }
      }
      
      // Sort by date descending
      allTransactions.sort((a, b) => new Date(b.transactionDate || b.date).getTime() - new Date(a.transactionDate || a.date).getTime())
      
      setBudgetTransactions(allTransactions)
    } catch (error) {
      console.error('Error fetching budget transactions:', error)
      setBudgetTransactions([])
    } finally {
      setLoadingTransactions(false)
    }
  }

  // Remove old handleDeleteBudget function (replaced by handleOpenDeleteDialog and handleConfirmDelete)

  const totalBudget = budgets.reduce((sum, budget) => sum + budget.amount, 0)
  const totalSpent = budgets.reduce((sum, budget) => sum + budget.spent, 0)
  const overBudgetCount = budgets.filter(budget => budget.status === 'over-budget').length
  const onTrackCount = budgets.filter(budget => budget.status === 'on-track').length

  // Fix: Handle NaN calculation
  const overallProgressPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0

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
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
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
                  value={newBudget.name}
                  onChange={(e) => setNewBudget(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center space-x-2">
                          {category.icon && getCategoryIcon(category.icon)}
                          <span>{category.name}</span>
                        </div>
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
                  value={newBudget.amount}
                  onChange={(e) => setNewBudget(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="period">Period</Label>
                <Select 
                  value={newBudget.period} 
                  onValueChange={(value) => setNewBudget(prev => ({ ...prev, period: value }))}
                >
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
              <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Add a description for this budget..."
                  value={newBudget.description}
                  onChange={(e) => setNewBudget(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="rollover" 
                  className="rounded" 
                  title="Roll over unused budget to next period"
                  aria-describedby="rollover-label"
                />
                <Label htmlFor="rollover" id="rollover-label" className="text-sm">
                  Roll over unused budget to next period
                </Label>
              </div>
            </div>
            
            {error && (
              <div className="text-red-600 text-sm mb-4">
                {error}
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateBudgetOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateBudget}>
                Create Budget
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

        {/* Edit Budget Dialog */}
        <Dialog open={isEditBudgetOpen} onOpenChange={setIsEditBudgetOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Budget</DialogTitle>
              <DialogDescription>
                Update your budget settings and spending limits.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-budget-name">Budget Name</Label>
                <Input
                  id="edit-budget-name"
                  placeholder="e.g., Monthly Groceries"
                  value={editBudget.name}
                  onChange={(e) => setEditBudget(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select value={editSelectedCategory} onValueChange={setEditSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center space-x-2">
                          {category.icon && getCategoryIcon(category.icon)}
                          <span>{category.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-amount">Budget Amount (AUD)</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={editBudget.amount}
                  onChange={(e) => setEditBudget(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-period">Period</Label>
                <Select 
                  value={editBudget.period} 
                  onValueChange={(value) => setEditBudget(prev => ({ ...prev, period: value }))}
                >
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
              <div className="grid gap-2">
                <Label htmlFor="edit-start-date">Start Date</Label>
                <Input
                  id="edit-start-date"
                  type="date"
                  value={editBudget.startDate}
                  onChange={(e) => setEditBudget(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-end-date">End Date (Optional)</Label>
                <Input
                  id="edit-end-date"
                  type="date"
                  value={editBudget.endDate || ''}
                  onChange={(e) => setEditBudget(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description (Optional)</Label>
                <Textarea
                  id="edit-description"
                  placeholder="Add a description for this budget..."
                  value={editBudget.description}
                  onChange={(e) => setEditBudget(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>
            
            {error && (
              <div className="text-red-600 text-sm mb-4">
                {error}
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditBudgetOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateBudget}>
                Update Budget
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
              {totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : '0.0'}% of budget used
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
                {overallProgressPercentage.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={overallProgressPercentage} 
              className="h-3"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-xl font-bold">
                  ${Math.max(0, totalBudget - totalSpent).toLocaleString('en-AU')}
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
                        <div className="w-4 h-4 rounded-full bg-gray-500" />
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
                            <DropdownMenuItem onClick={() => handleEditBudget(budget)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Budget
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenViewTransactions(budget)}>
                              <List className="h-4 w-4 mr-2" />
                              View Transactions
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenViewHistory(budget)}>
                              <Calendar className="h-4 w-4 mr-2" />
                              View History
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600" 
                              onClick={() => handleOpenDeleteDialog(budget)}
                            >
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

      {/* View Budget Transactions Dialog */}
      <Dialog open={isViewTransactionsOpen} onOpenChange={setIsViewTransactionsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              Transactions for &quot;{budgetToViewTransactions?.name}&quot;
            </DialogTitle>
            <DialogDescription>
              All transactions that contribute to this budget&apos;s spending
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            {loadingTransactions ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                <span className="ml-2">Loading transactions...</span>
              </div>
            ) : budgetTransactions.length > 0 ? (
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                <div className="text-sm text-muted-foreground">
                  Found {budgetTransactions.length} transaction{budgetTransactions.length !== 1 ? 's' : ''}
                </div>
                {budgetTransactions.map((transaction, index) => (
                  <Card key={`${transaction.id}-${index}`} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="font-medium">{transaction.description}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(transaction.transactionDate || transaction.date).toLocaleDateString('en-AU')}
                              {transaction.merchant && ` • ${transaction.merchant}`}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={cn(
                              "font-medium",
                              getAmountAsNumber(transaction.amount) >= 0 ? "text-green-600" : "text-red-600"
                            )}>
                              {getAmountAsNumber(transaction.amount) >= 0 ? '+' : '-'}$
                              {Math.abs(getAmountAsNumber(transaction.amount)).toLocaleString('en-AU', { 
                                minimumFractionDigits: 2 
                              })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {transaction.account}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span>Total Expenses:</span>
                    <span className="text-red-600">
                      -${budgetTransactions
                        .filter(t => getAmountAsNumber(t.amount) < 0)
                        .reduce((sum, t) => sum + Math.abs(getAmountAsNumber(t.amount)), 0)
                        .toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <List className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No Transactions Found</h3>
                <p className="text-muted-foreground">
                  No transactions found for this budget in the current period.
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewTransactionsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Budget Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{budgetToDelete?.name}&quot;? This action cannot be undone and will permanently remove all budget data and history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteDialogOpen(false)
              setBudgetToDelete(null)
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete Budget
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Budget History Dialog */}
      <Dialog open={isViewHistoryOpen} onOpenChange={setIsViewHistoryOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Budget History</DialogTitle>
            <DialogDescription>
              Historical spending data for &quot;{budgetToViewHistory?.name}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {budgetToViewHistory && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2">Current Period</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Budget:</span>
                        <span className="font-medium">${budgetToViewHistory.amount.toLocaleString('en-AU')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Spent:</span>
                        <span className="font-medium">${budgetToViewHistory.spent.toLocaleString('en-AU')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Remaining:</span>
                        <span className={`font-medium ${budgetToViewHistory.remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ${Math.abs(budgetToViewHistory.remaining).toLocaleString('en-AU')}
                          {budgetToViewHistory.remaining < 0 && ' over'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2">Status</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Progress:</span>
                        <span className="font-medium">{budgetToViewHistory.progressPercentage.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className={`font-medium capitalize ${
                          budgetToViewHistory.status === 'over-budget' ? 'text-red-600' :
                          budgetToViewHistory.status === 'warning' ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {budgetToViewHistory.status.replace('-', ' ')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Days Left:</span>
                        <span className="font-medium">{budgetToViewHistory.daysLeft} days</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Detailed historical data and trends will be available in a future update.</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsViewHistoryOpen(false)
                setBudgetToViewHistory(null)
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
