"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Tag, 
  Trash2, 
  CreditCard, 
  FileText, 
  Copy,
  ChevronDown,
  Loader2,
  CheckCircle,
  AlertTriangle,
  ArrowLeftRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface BulkOperationsProps {
  selectedTransactionIds: string[]
  onClearSelection: () => void
  onOperationComplete: () => void
  categories: Array<{
    id: string
    name: string
    color?: string
  }>
  accounts: Array<{
    id: string
    name: string
    institution?: string
  }>
  activities?: Array<{
    id: string
    name: string
    description?: string
    color?: string
  }>
  transactions?: Array<{
    id: string
    amount: number
    description: string
    category: string
    date: string
  }>
}

type BulkOperation = 
  | 'delete'
  | 'categorize'
  | 'update_account'
  | 'update_notes'
  | 'duplicate'
  | 'assign_activity'
  | 'mark_transfer'
  | 'unmark_transfer'

interface BulkOperationConfig {
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  destructive: boolean
  requiresConfirmation: boolean
}

const operationConfigs: Record<BulkOperation, BulkOperationConfig> = {
  delete: {
    name: 'Delete Transactions',
    description: 'Permanently delete selected transactions',
    icon: Trash2,
    destructive: true,
    requiresConfirmation: true
  },
  categorize: {
    name: 'Change Category',
    description: 'Update the category for selected transactions',
    icon: Tag,
    destructive: false,
    requiresConfirmation: false
  },
  update_account: {
    name: 'Change Account',
    description: 'Move selected transactions to a different account',
    icon: CreditCard,
    destructive: false,
    requiresConfirmation: false
  },
  update_notes: {
    name: 'Update Notes',
    description: 'Add or replace notes for selected transactions',
    icon: FileText,
    destructive: false,
    requiresConfirmation: false
  },
  duplicate: {
    name: 'Duplicate Transactions',
    description: 'Create copies of selected transactions',
    icon: Copy,
    destructive: false,
    requiresConfirmation: false
  },
  assign_activity: {
    name: 'Assign Activity',
    description: 'Assign selected transactions to an activity',
    icon: Tag,
    destructive: false,
    requiresConfirmation: false
  },
  mark_transfer: {
    name: 'Mark as Transfer',
    description: 'Mark transactions as transfers (excluded from income/expense)',
    icon: ArrowLeftRight,
    destructive: false,
    requiresConfirmation: true
  },
  unmark_transfer: {
    name: 'Unmark Transfer',
    description: 'Remove transfer marking (include in income/expense)',
    icon: ArrowLeftRight,
    destructive: false,
    requiresConfirmation: true
  }
}

export function BulkOperationsBar({ 
  selectedTransactionIds,
  onClearSelection,
  onOperationComplete,
  categories,
  accounts,
  activities = [],
  transactions = []
}: BulkOperationsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [selectedOperation, setSelectedOperation] = useState<BulkOperation | null>(null)
  
  // Form states for different operations
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [activityId, setActivityId] = useState('')
  const [notes, setNotes] = useState('')
  const [appendNotes, setAppendNotes] = useState(false)
  const [duplicateModifications, setDuplicateModifications] = useState({
    descriptionRaw: '',
    amountMinor: '',
    postedAt: '',
    categoryId: '',
    accountId: ''
  })

  const selectedCount = selectedTransactionIds.length

  // Calculate total amount of selected transactions
  const selectedTransactions = transactions.filter(t => selectedTransactionIds.includes(t.id))
  const totalAmount = selectedTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)
  
  // Calculate breakdown of income vs expenses
  const incomeAmount = selectedTransactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0)
  const expenseAmount = selectedTransactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  
  // Format the total amount
  const formatCurrency = (amount: number) => {
    const isNegative = amount < 0
    const absAmount = Math.abs(amount)
    const formatted = new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
    }).format(absAmount)
    
    return {
      formatted: isNegative ? `-${formatted}` : formatted,
      isNegative,
      isPositive: amount > 0,
      isZero: amount === 0
    }
  }

  const { formatted: formattedTotal, isNegative, isPositive, isZero } = formatCurrency(totalAmount)
  const hasMultipleTransactions = selectedCount > 1
  const showBreakdown = hasMultipleTransactions && incomeAmount > 0 && expenseAmount > 0

  if (selectedCount === 0) {
    return null
  }

  const performBulkOperation = async (operation: BulkOperation, payload: Record<string, unknown>) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/transactions/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          operation,
          transactionIds: selectedTransactionIds,
          ...payload
        })
      })

      let result
      try {
        result = await response.json()
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError)
        throw new Error('Server returned an invalid response. Please try again.')
      }

      if (!response.ok) {
        // Use the structured error message if available
        const errorMessage = result.operation?.message || result.error || 'Operation failed'
        throw new Error(errorMessage)
      }

      toast.success(result.message)
      onOperationComplete()
      onClearSelection()
      setDialogOpen(false)
      setConfirmationOpen(false)
      resetFormStates()

    } catch (error) {
      console.error('Bulk operation error:', error)
      
      // Handle different types of errors with appropriate messages
      let errorMessage = 'Operation failed'
      
      if (error instanceof Error) {
        errorMessage = error.message
      }
      
      // Add contextual help based on the operation
      if (operation === 'categorize' && errorMessage.includes('not found')) {
        errorMessage += ' The category may have been deleted. Please try refreshing the page.'
      } else if (operation === 'update_account' && errorMessage.includes('not found')) {
        errorMessage += ' The account may have been deleted. Please try refreshing the page.'
      }
      
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const resetFormStates = () => {
    setCategoryId('')
    setAccountId('')
    setActivityId('')
    setNotes('')
    setAppendNotes(false)
    setDuplicateModifications({
      descriptionRaw: '',
      amountMinor: '',
      postedAt: '',
      categoryId: '',
      accountId: ''
    })
  }

  const handleOperationClick = (operation: BulkOperation) => {
    setSelectedOperation(operation)
    const config = operationConfigs[operation]
    
    if (config.requiresConfirmation) {
      setConfirmationOpen(true)
    } else {
      setDialogOpen(true)
    }
  }

  const handleConfirmedOperation = () => {
    if (!selectedOperation) return

    switch (selectedOperation) {
      case 'delete':
        performBulkOperation('delete', {})
        break
      case 'mark_transfer':
        performBulkOperation('mark_transfer', {})
        break
      case 'unmark_transfer':
        performBulkOperation('unmark_transfer', {})
        break
    }
  }

  const handleDialogSubmit = () => {
    if (!selectedOperation) return

    let payload: Record<string, unknown> = {}

    switch (selectedOperation) {
      case 'categorize':
        if (!categoryId) {
          toast.error('Please select a category')
          return
        }
        payload = { categoryId }
        break

      case 'update_account':
        if (!accountId) {
          toast.error('Please select an account')
          return
        }
        payload = { accountId }
        break

      case 'assign_activity':
        if (!activityId) {
          toast.error('Please select an activity')
          return
        }
        payload = { activityId }
        break

      case 'update_notes':
        payload = { 
          notes: { userNote: notes },
          appendNotes 
        }
        break

      case 'duplicate':
        const modifications: Record<string, unknown> = {}
        if (duplicateModifications.descriptionRaw) {
          modifications.descriptionRaw = duplicateModifications.descriptionRaw
        }
        if (duplicateModifications.amountMinor) {
          modifications.amountMinor = parseInt(duplicateModifications.amountMinor) * 100 // Convert to cents
        }
        if (duplicateModifications.postedAt) {
          modifications.postedAt = duplicateModifications.postedAt
        }
        if (duplicateModifications.categoryId) {
          modifications.categoryId = duplicateModifications.categoryId
        }
        if (duplicateModifications.accountId) {
          modifications.accountId = duplicateModifications.accountId
        }
        payload = { modifications }
        break
    }

    performBulkOperation(selectedOperation, payload)
  }

  const renderDialogContent = () => {
    if (!selectedOperation) return null

    switch (selectedOperation) {
      case 'categorize':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-select">New Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="category-select">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        {category.color && (
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                        )}
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      case 'update_account':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="account-select">New Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger id="account-select">
                  <SelectValue placeholder="Select an account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex flex-col">
                        <span>{account.name}</span>
                        {account.institution && (
                          <span className="text-xs text-muted-foreground">
                            {account.institution}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      case 'assign_activity':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="activity-select">Activity</Label>
              <Select value={activityId} onValueChange={setActivityId}>
                <SelectTrigger id="activity-select">
                  <SelectValue placeholder="Select an activity" />
                </SelectTrigger>
                <SelectContent>
                  {activities.map(activity => (
                    <SelectItem key={activity.id} value={activity.id}>
                      <div className="flex flex-col">
                        <span>{activity.name}</span>
                        {activity.description && (
                          <span className="text-xs text-muted-foreground">
                            {activity.description}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      case 'update_notes':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes-textarea">Notes</Label>
              <Textarea
                id="notes-textarea"
                placeholder="Enter notes for selected transactions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="append-notes"
                checked={appendNotes}
                onCheckedChange={(checked) => setAppendNotes(checked as boolean)}
              />
              <Label htmlFor="append-notes" className="text-sm">
                Append to existing notes (instead of replacing)
              </Label>
            </div>
          </div>
        )

      case 'duplicate':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Optionally modify the duplicated transactions:
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dup-description">Description</Label>
                <Input
                  id="dup-description"
                  placeholder="New description (optional)"
                  value={duplicateModifications.descriptionRaw}
                  onChange={(e) => setDuplicateModifications(prev => ({
                    ...prev,
                    descriptionRaw: e.target.value
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dup-amount">Amount</Label>
                <Input
                  id="dup-amount"
                  type="number"
                  step="0.01"
                  placeholder="New amount (optional)"
                  value={duplicateModifications.amountMinor}
                  onChange={(e) => setDuplicateModifications(prev => ({
                    ...prev,
                    amountMinor: e.target.value
                  }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dup-date">Date</Label>
                <Input
                  id="dup-date"
                  type="date"
                  value={duplicateModifications.postedAt}
                  onChange={(e) => setDuplicateModifications(prev => ({
                    ...prev,
                    postedAt: e.target.value
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dup-category">Category</Label>
                <Select 
                  value={duplicateModifications.categoryId} 
                  onValueChange={(value) => setDuplicateModifications(prev => ({
                    ...prev,
                    categoryId: value
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Keep original" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dup-account">Account</Label>
              <Select 
                value={duplicateModifications.accountId} 
                onValueChange={(value) => setDuplicateModifications(prev => ({
                  ...prev,
                  accountId: value
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Keep original" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/50 border rounded-lg gap-3 sm:gap-0">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <div className="flex flex-col">
            <span className="font-medium">
              {selectedCount} transaction{selectedCount !== 1 ? 's' : ''} selected
            </span>
            {selectedCount > 0 && (
              <div className="flex flex-col gap-1">
                <span className={cn(
                  "text-sm font-medium",
                  isNegative && "text-red-600",
                  isPositive && "text-green-600",
                  isZero && "text-muted-foreground"
                )}>
                  Total: {formattedTotal}
                  {isNegative && (
                    <span className="text-xs text-muted-foreground ml-1">(net expense)</span>
                  )}
                  {isPositive && (
                    <span className="text-xs text-muted-foreground ml-1">(net income)</span>
                  )}
                  {isZero && (
                    <span className="text-xs text-muted-foreground ml-1">(balanced)</span>
                  )}
                </span>
                {showBreakdown && (
                  <span className="text-xs text-muted-foreground">
                    Income: {formatCurrency(incomeAmount).formatted} • 
                    Expenses: {formatCurrency(expenseAmount).formatted}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearSelection}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear Selection
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Bulk Actions
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {(Object.entries(operationConfigs) as [BulkOperation, BulkOperationConfig][]).map(([operation, config]) => {
                const Icon = config.icon
                return (
                  <DropdownMenuItem
                    key={operation}
                    onClick={() => handleOperationClick(operation)}
                    className={cn(
                      "flex items-center gap-2",
                      config.destructive && "text-red-600 focus:text-red-600"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">{config.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {config.description}
                      </span>
                    </div>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onClearSelection}
          >
            Clear Selection
          </Button>
        </div>
      </div>

      {/* Operation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedOperation && operationConfigs[selectedOperation].name}
            </DialogTitle>
            <DialogDescription>
              {selectedOperation && operationConfigs[selectedOperation].description}
              {` This will affect ${selectedCount} transaction${selectedCount !== 1 ? 's' : ''}.`}
            </DialogDescription>
          </DialogHeader>
          
          {renderDialogContent()}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDialogSubmit}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Apply Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className={cn(
                "h-5 w-5",
                selectedOperation === 'delete' ? "text-red-600" : "text-amber-600"
              )} />
              {selectedOperation === 'delete' && 'Confirm Deletion'}
              {selectedOperation === 'mark_transfer' && 'Confirm Mark as Transfer'}
              {selectedOperation === 'unmark_transfer' && 'Confirm Unmark Transfer'}
            </DialogTitle>
            <DialogDescription>
              {selectedOperation === 'delete' && (
                <>
                  Are you sure you want to delete {selectedCount} transaction{selectedCount !== 1 ? 's' : ''}? 
                  This action cannot be undone.
                </>
              )}
              {selectedOperation === 'mark_transfer' && (
                <>
                  Mark {selectedCount} transaction{selectedCount !== 1 ? 's' : ''} as transfer{selectedCount !== 1 ? 's' : ''}?
                  {' '}These transactions will be excluded from income and expense calculations, improving balance accuracy.
                </>
              )}
              {selectedOperation === 'unmark_transfer' && (
                <>
                  Remove transfer marking from {selectedCount} transaction{selectedCount !== 1 ? 's' : ''}?
                  {' '}These transactions will be included again in income and expense calculations.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmationOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmedOperation}
              disabled={isLoading}
              variant={selectedOperation === 'delete' ? 'destructive' : 'default'}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {selectedOperation === 'delete' && 'Delete Transactions'}
              {selectedOperation === 'mark_transfer' && 'Mark as Transfer'}
              {selectedOperation === 'unmark_transfer' && 'Unmark Transfer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
