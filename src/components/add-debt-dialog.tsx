'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

interface AddDebtDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDebtAdded: () => void
}

const DEBT_TYPES = [
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'personal_loan', label: 'Personal Loan' },
  { value: 'student_loan', label: 'Student Loan' },
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'car_loan', label: 'Car Loan' },
  { value: 'medical', label: 'Medical Debt' },
  { value: 'personal', label: 'Personal Debt' },
  { value: 'line_of_credit', label: 'Line of Credit' },
  { value: 'bnpl', label: 'Buy Now Pay Later' },
]

const PAYMENT_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'one_time', label: 'One-time Payment' },
]

export function AddDebtDialog({ open, onOpenChange, onDebtAdded }: AddDebtDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    debtType: 'credit_card',
    creditorName: '',
    currentBalance: '',
    interestRate: '',
    minimumPayment: '',
    paymentFrequency: 'monthly',
    paymentDueDay: '',
  })

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Transform form data to match API expectations
      const payload = {
        ...formData,
        paymentDueDay: formData.paymentDueDay ? parseInt(formData.paymentDueDay) : undefined,
      }

      const response = await fetch('/api/debts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        // Show detailed validation errors if available
        if (error.details) {
          const errorMessages = error.details.map((d: { path: string[]; message: string }) => `${d.path.join('.')}: ${d.message}`).join(', ')
          throw new Error(errorMessages)
        }
        throw new Error(error.error || 'Failed to create debt')
      }

      onDebtAdded()
      setFormData({
        name: '',
        debtType: 'credit_card',
        creditorName: '',
        currentBalance: '',
        interestRate: '',
        minimumPayment: '',
        paymentFrequency: 'monthly',
        paymentDueDay: '',
      })
    } catch (error) {
      console.error('Error creating debt:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to add debt')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Debt</DialogTitle>
          <DialogDescription>
            Enter the details of your debt to start tracking
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Debt Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Chase Credit Card"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="debtType">Debt Type *</Label>
              <Select
                value={formData.debtType}
                onValueChange={(value) => handleChange('debtType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEBT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="creditorName">Creditor/Lender *</Label>
              <Input
                id="creditorName"
                placeholder="e.g., Chase Bank"
                value={formData.creditorName}
                onChange={(e) => handleChange('creditorName', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentBalance">Current Balance *</Label>
              <Input
                id="currentBalance"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.currentBalance}
                onChange={(e) => handleChange('currentBalance', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interestRate">Interest Rate (APR %) *</Label>
              <Input
                id="interestRate"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.interestRate}
                onChange={(e) => handleChange('interestRate', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minimumPayment">
                {formData.paymentFrequency === 'one_time' ? 'Payment Amount *' : 'Minimum Payment *'}
              </Label>
              <Input
                id="minimumPayment"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.minimumPayment}
                onChange={(e) => handleChange('minimumPayment', e.target.value)}
                required
              />
              {formData.paymentFrequency === 'one_time' && (
                <p className="text-xs text-muted-foreground">
                  Total amount you plan to pay to settle this debt
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentFrequency">Payment Frequency *</Label>
              <Select
                value={formData.paymentFrequency}
                onValueChange={(value) => handleChange('paymentFrequency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_FREQUENCIES.map((freq) => (
                    <SelectItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.paymentFrequency === 'one_time' && (
                <p className="text-xs text-muted-foreground">
                  This debt will be marked as paid off once the full amount is paid
                </p>
              )}
            </div>

            {formData.paymentFrequency !== 'one_time' && (
              <div className="space-y-2">
                <Label htmlFor="paymentDueDay">Payment Due Day</Label>
                <Input
                  id="paymentDueDay"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="1-31"
                  value={formData.paymentDueDay}
                  onChange={(e) => handleChange('paymentDueDay', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.paymentFrequency === 'monthly' && 'Day of the month (1-31)'}
                  {formData.paymentFrequency === 'weekly' && 'Day of the week (1=Monday, 7=Sunday)'}
                  {formData.paymentFrequency === 'biweekly' && 'Starting day of the month'}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Debt'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
