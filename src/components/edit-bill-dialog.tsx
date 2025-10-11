'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { AlertCircle } from 'lucide-react'

interface Account {
  id: string
  name: string
  institution: string
}

interface Category {
  id: string
  name: string
  color?: string
}

interface Bill {
  id: string
  name: string
  description?: string
  amount: string
  accountId: string
  categoryId?: string
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'
  dueDay?: number
  dueDate?: string
  reminderDays: number
  isAutoPay: boolean
  notes?: string
}

interface EditBillDialogProps {
  bill: Bill | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EditBillDialog({ bill, open, onOpenChange, onSuccess }: EditBillDialogProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dataLoading, setDataLoading] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('none')
  const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly')
  const [dueDay, setDueDay] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [reminderDays, setReminderDays] = useState('3')
  const [isAutoPay, setIsAutoPay] = useState(false)
  const [notes, setNotes] = useState('')

  // Populate form when bill changes
  useEffect(() => {
    if (bill && open) {
      setName(bill.name)
      setDescription(bill.description || '')
      setAmount(bill.amount)
      setAccountId(bill.accountId)
      setCategoryId(bill.categoryId || 'none')
      setFrequency(bill.frequency)
      setDueDay(bill.dueDay?.toString() || '')
      // Format dueDate from ISO string to YYYY-MM-DD for date input
      setDueDate(bill.dueDate ? new Date(bill.dueDate).toISOString().split('T')[0] : '')
      setReminderDays(bill.reminderDays.toString())
      setIsAutoPay(bill.isAutoPay)
      setNotes(bill.notes || '')
      setError(null)
    }
  }, [bill, open])

  // Fetch accounts and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        setDataLoading(true)
        const [accountsResponse, categoriesResponse] = await Promise.all([
          fetch('/api/accounts'),
          fetch('/api/categories')
        ])

        if (accountsResponse.ok) {
          const accountsData = await accountsResponse.json()
          setAccounts(Array.isArray(accountsData) ? accountsData : accountsData.accounts || [])
        } else {
          console.error('Failed to fetch accounts:', accountsResponse.status)
        }

        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json()
          setCategories(Array.isArray(categoriesData) ? categoriesData : categoriesData.categories || [])
        } else {
          console.error('Failed to fetch categories:', categoriesResponse.status)
        }
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setDataLoading(false)
      }
    }

    if (open) {
      fetchData()
    }
  }, [open])

  const handleSubmit = async () => {
    if (!bill || !name || !amount || !accountId) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const payload: Record<string, unknown> = {
        name,
        description: description || undefined,
        amount,
        accountId,
        categoryId: categoryId && categoryId !== 'none' ? categoryId : undefined,
        frequency,
        reminderDays: parseInt(reminderDays),
        isAutoPay,
        notes: notes || undefined,
      }

      if (frequency === 'monthly' && dueDay) {
        payload.dueDay = parseInt(dueDay)
      } else if (frequency !== 'monthly' && dueDate) {
        payload.dueDate = dueDate
      }

      const response = await fetch(`/api/bills/${bill.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update bill')
      }

      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getFrequencyDescription = (freq: string) => {
    switch (freq) {
      case 'weekly': return 'Repeats every week'
      case 'biweekly': return 'Repeats every 2 weeks'  
      case 'monthly': return 'Repeats every month'
      case 'quarterly': return 'Repeats every 3 months'
      case 'yearly': return 'Repeats every year'
      default: return ''
    }
  }

  if (!bill) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Bill</DialogTitle>
          <DialogDescription>
            Update your recurring bill details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Bill Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Electricity Bill"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Account */}
          <div className="space-y-2">
            <Label htmlFor="account">Account *</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder={dataLoading ? "Loading accounts..." : "Select account"} />
              </SelectTrigger>
              <SelectContent>
                {accounts.length === 0 && !dataLoading ? (
                  <SelectItem value="no-accounts" disabled>No accounts found</SelectItem>
                ) : (
                  accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.institution})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category (Optional)</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder={dataLoading ? "Loading categories..." : "Select category"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No category</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label htmlFor="frequency">Bill Frequency</Label>
            <Select value={frequency} onValueChange={(value: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly') => setFrequency(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">
              {getFrequencyDescription(frequency)}
            </div>
          </div>

          {/* Due Day (for monthly bills) */}
          {frequency === 'monthly' && (
            <div className="space-y-2">
              <Label htmlFor="dueDay">Due Day of Month</Label>
              <Input
                id="dueDay"
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                placeholder="e.g., 15"
              />
              <div className="text-xs text-muted-foreground">
                Day of the month when this bill is due (1-31)
              </div>
            </div>
          )}

          {/* Due Date for Non-Monthly Bills */}
          {frequency !== 'monthly' && (
            <div className="space-y-2">
              <Label htmlFor="dueDate">Next Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                placeholder="Select due date"
              />
              <div className="text-xs text-muted-foreground">
                {frequency === 'weekly' && 'Select the next date this bill is due'}
                {frequency === 'biweekly' && 'Select the next date this bill is due'}
                {frequency === 'quarterly' && 'Select the next date this bill is due (every 3 months)'}
                {frequency === 'yearly' && 'Select the next date this bill is due (annually)'}
              </div>
            </div>
          )}

          {/* Reminder Days */}
          <div className="space-y-2">
            <Label htmlFor="reminderDays">Reminder (Days Before Due)</Label>
            <Select value={reminderDays} onValueChange={setReminderDays}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 day</SelectItem>
                <SelectItem value="3">3 days</SelectItem>
                <SelectItem value="5">5 days</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Auto Pay */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="isAutoPay">Auto Pay</Label>
              <div className="text-xs text-muted-foreground">
                This bill is automatically deducted
              </div>
            </div>
            <Switch
              id="isAutoPay"
              checked={isAutoPay}
              onCheckedChange={setIsAutoPay}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Updating...' : 'Update Bill'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}