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

interface AddBillDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AddBillDialog({ open, onOpenChange, onSuccess }: AddBillDialogProps) {
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
  const [categoryId, setCategoryId] = useState('')
  const [frequency, setFrequency] = useState('monthly')
  const [dueDay, setDueDay] = useState('')
  const [reminderDays, setReminderDays] = useState('3')
  const [isAutoPay, setIsAutoPay] = useState(false)
  const [notes, setNotes] = useState('')

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
          console.log('Accounts data:', accountsData)
          setAccounts(Array.isArray(accountsData) ? accountsData : accountsData.accounts || [])
        } else {
          console.error('Failed to fetch accounts:', accountsResponse.status)
        }

        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json()
          console.log('Categories data:', categoriesData)
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

  const resetForm = () => {
    setName('')
    setDescription('')
    setAmount('')
    setAccountId('')
    setCategoryId('')
    setFrequency('monthly')
    setDueDay('')
    setReminderDays('3')
    setIsAutoPay(false)
    setNotes('')
    setError(null)
  }

  const handleSubmit = async () => {
    if (!name || !amount || !accountId) {
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
        categoryId: categoryId || undefined,
        frequency,
        reminderDays: parseInt(reminderDays),
        isAutoPay,
        notes: notes || undefined,
      }

      if (frequency === 'monthly' && dueDay) {
        payload.dueDay = parseInt(dueDay)
      }

      const response = await fetch('/api/bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create bill')
      }

      resetForm()
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open)
      if (!open) resetForm()
    }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Bill</DialogTitle>
          <DialogDescription>
            Create a recurring bill for tracking and projections.
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
                  <SelectItem value="" disabled>No accounts found</SelectItem>
                ) : (
                  accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.institution})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {accounts.length === 0 && !dataLoading && (
              <div className="text-xs text-muted-foreground">
                You need to add an account first
              </div>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder={dataLoading ? "Loading categories..." : "Select category (optional)"} />
              </SelectTrigger>
              <SelectContent>
                {categories.length === 0 && !dataLoading ? (
                  <SelectItem value="" disabled>No categories found</SelectItem>
                ) : (
                  categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label htmlFor="frequency">Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
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
          </div>

          {/* Due Day for Monthly Bills */}
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
                placeholder="e.g., 15 for 15th of each month"
              />
            </div>
          )}

          {/* Reminder Days */}
          <div className="space-y-2">
            <Label htmlFor="reminderDays">Reminder (days before due)</Label>
            <Input
              id="reminderDays"
              type="number"
              min="0"
              max="30"
              value={reminderDays}
              onChange={(e) => setReminderDays(e.target.value)}
            />
          </div>

          {/* Auto Pay */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="autoPay">Auto Pay</Label>
              <div className="text-xs text-muted-foreground">
                Mark if this bill is automatically paid
              </div>
            </div>
            <Switch
              id="autoPay"
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
              placeholder="Additional notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create Bill'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
