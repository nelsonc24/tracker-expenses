"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeftRight, Loader2, ArrowRight, Info } from 'lucide-react'
import { toast } from 'sonner'

interface Account {
  id: string
  name: string
  institution?: string
  accountType?: string
}

interface Category {
  id: string
  name: string
  color?: string
  icon?: string
}

interface CreateTransferDialogProps {
  accounts: Account[]
  categories: Category[]
  onSuccess: () => void
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CreateTransferDialog({
  accounts,
  categories,
  onSuccess,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: CreateTransferDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  
  // Use controlled open state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen
  
  const [isLoading, setIsLoading] = useState(false)
  
  // Form state
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [fromAccountId, setFromAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [fromCategoryId, setFromCategoryId] = useState('')
  const [toCategoryId, setToCategoryId] = useState('')
  const [notes, setNotes] = useState('')

  const resetForm = () => {
    setAmount('')
    setDate(new Date().toISOString().split('T')[0])
    setDescription('')
    setFromAccountId('')
    setToAccountId('')
    setFromCategoryId('')
    setToCategoryId('')
    setNotes('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount greater than 0')
      return
    }
    
    if (!fromAccountId) {
      toast.error('Please select a source account')
      return
    }
    
    if (!toAccountId) {
      toast.error('Please select a destination account')
      return
    }
    
    if (fromAccountId === toAccountId) {
      toast.error('Source and destination accounts must be different')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/transactions/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          date,
          description: description || `Transfer between accounts`,
          fromAccountId,
          toAccountId,
          fromCategoryId: fromCategoryId || null,
          toCategoryId: toCategoryId || null,
          notes: notes || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create transfer')
      }

      toast.success(`Transfer created successfully! Created ${result.transactionIds?.length || 2} transactions.`)
      resetForm()
      setOpen(false)
      onSuccess()
    } catch (error) {
      console.error('Error creating transfer:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create transfer')
    } finally {
      setIsLoading(false)
    }
  }

  const fromAccount = accounts.find(a => a.id === fromAccountId)
  const toAccount = accounts.find(a => a.id === toAccountId)
  const amountValue = parseFloat(amount) || 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            Create Transfer
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5" />
              Create Transfer
            </DialogTitle>
            <DialogDescription>
              Create a paired transfer transaction between two accounts. This will create two linked transactions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Amount and Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="e.g., Transfer to savings account"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* From Account */}
            <div className="space-y-2">
              <Label htmlFor="from-account">From Account (Source) *</Label>
              <Select value={fromAccountId} onValueChange={setFromAccountId} required>
                <SelectTrigger id="from-account">
                  <SelectValue placeholder="Select source account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem 
                      key={account.id} 
                      value={account.id}
                      disabled={account.id === toAccountId}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{account.name}</span>
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
              {fromAccountId && (
                <div className="space-y-2 mt-2">
                  <Label htmlFor="from-category" className="text-sm text-muted-foreground">
                    Category (optional)
                  </Label>
                  <Select value={fromCategoryId} onValueChange={setFromCategoryId}>
                    <SelectTrigger id="from-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No category</SelectItem>
                      {categories.map((category) => (
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
              )}
            </div>

            {/* Arrow Indicator */}
            <div className="flex items-center justify-center py-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <ArrowRight className="h-5 w-5" />
                <span className="text-sm font-medium">Transfers to</span>
              </div>
            </div>

            {/* To Account */}
            <div className="space-y-2">
              <Label htmlFor="to-account">To Account (Destination) *</Label>
              <Select value={toAccountId} onValueChange={setToAccountId} required>
                <SelectTrigger id="to-account">
                  <SelectValue placeholder="Select destination account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem 
                      key={account.id} 
                      value={account.id}
                      disabled={account.id === fromAccountId}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{account.name}</span>
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
              {toAccountId && (
                <div className="space-y-2 mt-2">
                  <Label htmlFor="to-category" className="text-sm text-muted-foreground">
                    Category (optional)
                  </Label>
                  <Select value={toCategoryId} onValueChange={setToCategoryId}>
                    <SelectTrigger id="to-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No category</SelectItem>
                      {categories.map((category) => (
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
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes about this transfer..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Preview */}
            {amountValue > 0 && fromAccountId && toAccountId && (
              <div className="p-4 bg-muted/50 rounded-lg border space-y-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 space-y-2 text-sm">
                    <p className="font-medium">Transfer Preview</p>
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center justify-between p-2 bg-background rounded">
                        <span>{fromAccount?.name || 'Source'}</span>
                        <span className="text-red-600 font-medium">
                          -${amountValue.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-center py-1">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                      <div className="flex items-center justify-between p-2 bg-background rounded">
                        <span>{toAccount?.name || 'Destination'}</span>
                        <span className="text-green-600 font-medium">
                          +${amountValue.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 mt-2">
                      Both transactions will be marked as transfers and excluded from income/expense calculations.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Transfer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
