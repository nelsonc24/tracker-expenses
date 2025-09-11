'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Play,
  Pause,
  Calendar,
  RefreshCw,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RecurringTransaction {
  id: string
  userId: string
  accountId: string
  categoryId?: string
  name: string
  description: string
  amount: string
  currency: string
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'
  startDate: Date
  endDate?: Date
  nextDate: Date
  lastProcessed?: Date
  isActive: boolean
  autoProcess: boolean
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

interface Account {
  id: string
  name: string
  institution: string
  accountType: string
}

interface Category {
  id: string
  name: string
  color?: string
  icon?: string
}

const frequencyOptions = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' }
]

export default function RecurringTransactionsPage() {
  const { user, isLoaded } = useUser()
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedRecurring, setSelectedRecurring] = useState<RecurringTransaction | null>(null)
  const [processing, setProcessing] = useState<Set<string>>(new Set())

  // Form state
  const [formData, setFormData] = useState({
    accountId: '',
    categoryId: '',
    name: '',
    description: '',
    amount: '',
    frequency: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    autoProcess: false,
  })

  useEffect(() => {
    if (!isLoaded || !user) return
    fetchData()
  }, [isLoaded, user])

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)

      const [recurringRes, accountsRes, categoriesRes] = await Promise.all([
        fetch('/api/recurring-transactions'),
        fetch('/api/accounts'),
        fetch('/api/categories')
      ])

      if (!recurringRes.ok || !accountsRes.ok || !categoriesRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const [recurringData, accountsData, categoriesData] = await Promise.all([
        recurringRes.json(),
        accountsRes.json(),
        categoriesRes.json()
      ])

      setRecurringTransactions(recurringData)
      setAccounts(accountsData)
      setCategories(categoriesData)

    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    try {
      const response = await fetch('/api/recurring-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: formData.accountId,
          categoryId: formData.categoryId || null,
          name: formData.name,
          description: formData.description,
          amount: formData.amount,
          frequency: formData.frequency,
          startDate: formData.startDate,
          endDate: formData.endDate || null,
          autoProcess: formData.autoProcess,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create recurring transaction')
      }

      await fetchData()
      setIsCreateDialogOpen(false)
      resetForm()
    } catch (err) {
      console.error('Error creating recurring transaction:', err)
      setError(err instanceof Error ? err.message : 'Failed to create recurring transaction')
    }
  }

  async function handleUpdate() {
    if (!selectedRecurring) return

    try {
      const response = await fetch(`/api/recurring-transactions/${selectedRecurring.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: formData.accountId,
          categoryId: formData.categoryId || null,
          name: formData.name,
          description: formData.description,
          amount: formData.amount,
          frequency: formData.frequency,
          startDate: formData.startDate,
          endDate: formData.endDate || null,
          autoProcess: formData.autoProcess,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update recurring transaction')
      }

      await fetchData()
      setIsEditDialogOpen(false)
      setSelectedRecurring(null)
      resetForm()
    } catch (err) {
      console.error('Error updating recurring transaction:', err)
      setError(err instanceof Error ? err.message : 'Failed to update recurring transaction')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this recurring transaction? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/recurring-transactions/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete recurring transaction')
      }

      await fetchData()
    } catch (err) {
      console.error('Error deleting recurring transaction:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete recurring transaction')
    }
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    try {
      const response = await fetch(`/api/recurring-transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })

      if (!response.ok) {
        throw new Error('Failed to update recurring transaction')
      }

      await fetchData()
    } catch (err) {
      console.error('Error updating recurring transaction:', err)
      setError(err instanceof Error ? err.message : 'Failed to update recurring transaction')
    }
  }

  async function handleProcess(id: string) {
    try {
      setProcessing(prev => new Set([...prev, id]))

      const response = await fetch('/api/recurring-transactions/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) {
        throw new Error('Failed to process recurring transaction')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.errors?.[0] || 'Processing failed')
      }

      await fetchData()
    } catch (err) {
      console.error('Error processing recurring transaction:', err)
      setError(err instanceof Error ? err.message : 'Failed to process recurring transaction')
    } finally {
      setProcessing(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  async function handleProcessAll() {
    try {
      setProcessing(prev => new Set([...prev, 'all']))

      const response = await fetch('/api/recurring-transactions/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processAll: true }),
      })

      if (!response.ok) {
        throw new Error('Failed to process recurring transactions')
      }

      const result = await response.json()
      if (result.errors?.length > 0) {
        console.warn('Some transactions failed to process:', result.errors)
      }

      await fetchData()
    } catch (err) {
      console.error('Error processing recurring transactions:', err)
      setError(err instanceof Error ? err.message : 'Failed to process recurring transactions')
    } finally {
      setProcessing(prev => {
        const next = new Set(prev)
        next.delete('all')
        return next
      })
    }
  }

  function resetForm() {
    setFormData({
      accountId: '',
      categoryId: '',
      name: '',
      description: '',
      amount: '',
      frequency: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      autoProcess: false,
    })
  }

  function openEditDialog(recurring: RecurringTransaction) {
    setSelectedRecurring(recurring)
    setFormData({
      accountId: recurring.accountId,
      categoryId: recurring.categoryId || '',
      name: recurring.name,
      description: recurring.description,
      amount: recurring.amount,
      frequency: recurring.frequency,
      startDate: new Date(recurring.startDate).toISOString().split('T')[0],
      endDate: recurring.endDate ? new Date(recurring.endDate).toISOString().split('T')[0] : '',
      autoProcess: recurring.autoProcess,
    })
    setIsEditDialogOpen(true)
  }

  function getDaysUntilNext(nextDate: Date): number {
    const now = new Date()
    const next = new Date(nextDate)
    const diffTime = next.getTime() - now.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  function getStatusColor(recurring: RecurringTransaction): string {
    if (!recurring.isActive) return 'text-muted-foreground'
    
    const daysUntil = getDaysUntilNext(recurring.nextDate)
    if (daysUntil <= 0) return 'text-red-600'
    if (daysUntil <= 3) return 'text-orange-600'
    return 'text-green-600'
  }

  function getStatusIcon(recurring: RecurringTransaction) {
    if (!recurring.isActive) return <Pause className="h-4 w-4" />
    
    const daysUntil = getDaysUntilNext(recurring.nextDate)
    if (daysUntil <= 0) return <AlertCircle className="h-4 w-4" />
    return <CheckCircle className="h-4 w-4" />
  }

  if (!isLoaded) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-48 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Authentication Required</CardTitle>
          <CardDescription>Please sign in to manage your recurring transactions.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Count due transactions
  const dueCount = recurringTransactions.filter(rt => 
    rt.isActive && getDaysUntilNext(rt.nextDate) <= 0
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Recurring Transactions</h1>
          <p className="text-muted-foreground">
            Automate your regular income and expenses
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {dueCount > 0 && (
            <Button 
              variant="outline" 
              onClick={handleProcessAll}
              disabled={processing.has('all')}
            >
              {processing.has('all') ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Process Due ({dueCount})
            </Button>
          )}
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Recurring Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Recurring Transaction</DialogTitle>
                <DialogDescription>
                  Set up a transaction that repeats automatically.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Rent, Salary, Subscription"
                  />
                </div>

                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="account">Account</Label>
                  <Select value={formData.accountId} onValueChange={(value) => 
                    setFormData({ ...formData, accountId: value })
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(account => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} - {account.institution}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="category">Category (Optional)</Label>
                  <Select value={formData.categoryId || "none"} onValueChange={(value) => 
                    setFormData({ ...formData, categoryId: value === "none" ? "" : value })
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No category</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select value={formData.frequency} onValueChange={(value) => 
                    setFormData({ ...formData, frequency: value })
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {frequencyOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="endDate">End Date (Optional)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description"
                    rows={2}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoProcess"
                    checked={formData.autoProcess}
                    onCheckedChange={(checked) => setFormData({ ...formData, autoProcess: checked })}
                  />
                  <Label htmlFor="autoProcess">Auto-process when due</Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreate} 
                  disabled={!formData.name || !formData.amount || !formData.accountId}
                >
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Recurring Transactions List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-48 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : recurringTransactions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Recurring Transactions</h3>
            <p className="text-muted-foreground mb-4">
              Set up your first recurring transaction to automate regular payments and income.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Recurring Transaction
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {recurringTransactions.map(recurring => {
            const account = accounts.find(a => a.id === recurring.accountId)
            const category = categories.find(c => c.id === recurring.categoryId)
            const daysUntil = getDaysUntilNext(recurring.nextDate)
            const statusColor = getStatusColor(recurring)
            const statusIcon = getStatusIcon(recurring)
            
            return (
              <Card key={recurring.id} className="transition-all hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
                        <DollarSign className="h-5 w-5 text-primary" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium">{recurring.name}</h3>
                          <div className={cn("flex items-center space-x-1", statusColor)}>
                            {statusIcon}
                          </div>
                          {!recurring.isActive && (
                            <Badge variant="secondary">Paused</Badge>
                          )}
                          {recurring.autoProcess && (
                            <Badge variant="outline">Auto</Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                          <span>${parseFloat(recurring.amount).toLocaleString()}</span>
                          <span>{frequencyOptions.find(f => f.value === recurring.frequency)?.label}</span>
                          <span>{account?.name}</span>
                          {category && <span>{category.name}</span>}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                          <span>
                            Next: {new Date(recurring.nextDate).toLocaleDateString()}
                            {daysUntil <= 0 ? ' (Due)' : ` (${daysUntil} days)`}
                          </span>
                          {recurring.lastProcessed && (
                            <span>
                              Last: {new Date(recurring.lastProcessed).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {recurring.isActive && daysUntil <= 0 && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleProcess(recurring.id)}
                          disabled={processing.has(recurring.id)}
                        >
                          {processing.has(recurring.id) ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <Play className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleActive(recurring.id, !recurring.isActive)}
                      >
                        {recurring.isActive ? (
                          <Pause className="h-3 w-3" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(recurring)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(recurring.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Recurring Transaction</DialogTitle>
            <DialogDescription>
              Update the recurring transaction details.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Rent, Salary, Subscription"
              />
            </div>

            <div>
              <Label htmlFor="edit-amount">Amount</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="edit-account">Account</Label>
              <Select value={formData.accountId} onValueChange={(value) => 
                setFormData({ ...formData, accountId: value })
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} - {account.institution}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-category">Category (Optional)</Label>
              <Select value={formData.categoryId || "none"} onValueChange={(value) => 
                setFormData({ ...formData, categoryId: value === "none" ? "" : value })
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-frequency">Frequency</Label>
              <Select value={formData.frequency} onValueChange={(value) => 
                setFormData({ ...formData, frequency: value })
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {frequencyOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-startDate">Start Date</Label>
              <Input
                id="edit-startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-endDate">End Date (Optional)</Label>
              <Input
                id="edit-endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-autoProcess"
                checked={formData.autoProcess}
                onCheckedChange={(checked) => setFormData({ ...formData, autoProcess: checked })}
              />
              <Label htmlFor="edit-autoProcess">Auto-process when due</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdate} 
              disabled={!formData.name || !formData.amount || !formData.accountId}
            >
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
