'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Receipt, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

interface Transaction {
  id: string
  description: string
  amount: number
  categoryId: string | null
  accountId: string | null
  transactionDate: string
  merchant?: string
  tags?: string[]
}

interface MarkAsBillDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: Transaction | null
  onSuccess?: () => void
}

export function MarkAsBillDialog({ open, onOpenChange, transaction, onSuccess }: MarkAsBillDialogProps) {
  const [frequency, setFrequency] = useState<string>('monthly')
  const [dueDay, setDueDay] = useState<string>('')
  const [dueDate, setDueDate] = useState<string>('')
  const [reminderDays, setReminderDays] = useState<string>('3')
  const [isAutoPay, setIsAutoPay] = useState(false)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!transaction) return

    try {
      setLoading(true)
      setError(null)

      const payload: Record<string, unknown> = {
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

      const response = await fetch(`/api/transactions/${transaction.id}/mark-as-bill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to mark transaction as bill')
      }

      // Reset form
      setFrequency('monthly')
      setDueDay('')
      setDueDate('')
      setReminderDays('3')
      setIsAutoPay(false)
      setNotes('')
      
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(Math.abs(amount))
  }

  const getFrequencyDescription = (freq: string) => {
    switch (freq) {
      case 'weekly': return 'Every week'
      case 'biweekly': return 'Every 2 weeks'
      case 'monthly': return 'Every month'
      case 'quarterly': return 'Every 3 months'
      case 'yearly': return 'Every year'
      default: return ''
    }
  }

  if (!transaction) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Mark as Bill
          </DialogTitle>
          <DialogDescription>
            Convert this transaction into a recurring bill for future tracking and projections.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Transaction Preview */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="font-medium">{transaction.description}</div>
            <div className="text-sm text-muted-foreground">
              {formatCurrency(transaction.amount)} • {format(new Date(transaction.transactionDate), 'MMM dd, yyyy')}
            </div>
            {transaction.merchant && (
              <div className="text-sm text-muted-foreground">{transaction.merchant}</div>
            )}
            {transaction.tags && transaction.tags.length > 0 && (
              <div className="flex gap-1 mt-2">
                {transaction.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Frequency */}
          <div className="space-y-2">
            <Label htmlFor="frequency">Bill Frequency</Label>
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
            <div className="text-xs text-muted-foreground">
              {getFrequencyDescription(frequency)}
            </div>
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
              <div className="text-xs text-muted-foreground">
                Leave empty to use the current transaction date
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
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this bill..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating Bill...' : 'Create Bill'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
