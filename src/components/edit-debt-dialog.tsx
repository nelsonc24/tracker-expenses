"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Pencil, AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Debt {
  id: string
  name: string
  debtType: string
  creditorName: string
  currentBalance: string
  interestRate: string
  minimumPayment: string
  paymentFrequency: string
  paymentDueDay?: number | null
  status: string
}

interface EditDebtDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  debt: Debt | null
  onDebtUpdated: () => void
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

const DEBT_STATUS = [
  { value: 'active', label: 'Active' },
  { value: 'paid_off', label: 'Paid Off' },
  { value: 'in_collections', label: 'In Collections' },
  { value: 'settled', label: 'Settled' },
  { value: 'archived', label: 'Archived' },
]

export function EditDebtDialog({ open, onOpenChange, debt, onDebtUpdated }: EditDebtDialogProps) {
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
    status: 'active',
  })
  const [showStatusWarning, setShowStatusWarning] = useState(false)

  // Populate form when debt changes
  useEffect(() => {
    if (debt) {
      setFormData({
        name: debt.name,
        debtType: debt.debtType,
        creditorName: debt.creditorName,
        currentBalance: debt.currentBalance,
        interestRate: debt.interestRate,
        minimumPayment: debt.minimumPayment,
        paymentFrequency: debt.paymentFrequency,
        paymentDueDay: debt.paymentDueDay?.toString() || '',
        status: debt.status,
      })
      setShowStatusWarning(debt.status === 'paid_off')
    }
  }, [debt])

  const handleChange = (field: string, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value }
      
      // Auto-update status logic
      if (field === 'currentBalance' && debt) {
        const newBalance = parseFloat(value)
        
        // If debt was paid off and balance increased, change to active
        if (debt.status === 'paid_off' && newBalance > 0) {
          updated.status = 'active'
          setShowStatusWarning(false)
          toast.info('Status automatically changed to Active (balance > $0)')
        }
        // If balance is 0 or less, suggest paid_off status
        else if (newBalance <= 0 && prev.status !== 'paid_off') {
          toast.info('Balance is $0. Consider changing status to Paid Off.')
        }
      }
      
      return updated
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!debt) return

    setIsSubmitting(true)
    try {
      // Transform form data to match API expectations
      const payload = {
        name: formData.name,
        debtType: formData.debtType,
        creditorName: formData.creditorName,
        currentBalance: formData.currentBalance,
        interestRate: formData.interestRate,
        minimumPayment: formData.minimumPayment,
        paymentFrequency: formData.paymentFrequency,
        paymentDueDay: formData.paymentDueDay && formData.paymentFrequency !== 'one_time' 
          ? parseInt(formData.paymentDueDay) 
          : undefined,
        status: formData.status,
      }

      const response = await fetch(`/api/debts/${debt.id}`, {
        method: 'PUT',
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
        throw new Error(error.error || 'Failed to update debt')
      }

      toast.success('Debt updated successfully!')
      onDebtUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error('Error updating debt:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update debt')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Debt</DialogTitle>
          <DialogDescription>
            Update the details of your debt
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
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

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEBT_STATUS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Current status of this debt
              </p>
            </div>

            {/* Warning when editing paid-off debt */}
            {showStatusWarning && formData.status === 'paid_off' && parseFloat(formData.currentBalance) > 0 && (
              <Alert className="border-yellow-500 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>Warning:</strong> This debt is marked as Paid Off but has a balance of ${formData.currentBalance}. 
                  Consider changing the status to Active or updating the balance to $0.
                </AlertDescription>
              </Alert>
            )}

            {/* Info when changing from paid_off to active */}
            {debt?.status === 'paid_off' && formData.status === 'active' && (
              <Alert className="border-blue-500 bg-blue-50">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  You are reactivating a paid-off debt. Make sure the balance and payment details are correct.
                </AlertDescription>
              </Alert>
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
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Pencil className="mr-2 h-4 w-4" />
              Update Debt
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
