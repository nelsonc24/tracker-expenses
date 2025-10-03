"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, DollarSign, TrendingDown } from 'lucide-react'

interface Debt {
  id: string
  name: string
  creditorName: string
  currentBalance: string
  minimumPayment: string
}

interface LogPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  debt: Debt | null
  onPaymentLogged: () => void
}

export function LogPaymentDialog({ open, onOpenChange, debt, onPaymentLogged }: LogPaymentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    principalAmount: '',
    interestAmount: '0.00',
    feesAmount: '0.00',
    paymentMethod: 'bank_transfer',
    isExtraPayment: false,
    notes: '',
  })

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!debt) return

    setIsSubmitting(true)
    try {
      const principal = parseFloat(formData.principalAmount) || 0
      const interest = parseFloat(formData.interestAmount) || 0
      const fees = parseFloat(formData.feesAmount) || 0
      const totalPayment = principal + interest + fees

      if (totalPayment <= 0) {
        toast.error('Payment amount must be greater than 0')
        setIsSubmitting(false)
        return
      }

      const response = await fetch(`/api/debts/${debt.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentDate: formData.paymentDate,
          paymentAmount: totalPayment.toFixed(2),
          principalAmount: principal.toFixed(2),
          interestAmount: interest.toFixed(2),
          feesAmount: fees.toFixed(2),
          paymentMethod: formData.paymentMethod,
          isExtraPayment: formData.isExtraPayment,
          notes: formData.notes,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to log payment')
      }

      toast.success('Payment logged successfully!')
      onPaymentLogged()
      onOpenChange(false)
      resetForm()
    } catch (error) {
      console.error('Error logging payment:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to log payment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      paymentDate: new Date().toISOString().split('T')[0],
      principalAmount: '',
      interestAmount: '0.00',
      feesAmount: '0.00',
      paymentMethod: 'bank_transfer',
      isExtraPayment: false,
      notes: '',
    })
  }

  const totalAmount = (parseFloat(formData.principalAmount) || 0) + 
                      (parseFloat(formData.interestAmount) || 0) + 
                      (parseFloat(formData.feesAmount) || 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Debt Payment</DialogTitle>
          <DialogDescription>
            Record a payment for {debt?.name}
          </DialogDescription>
        </DialogHeader>

        {debt && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Debt Info */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current Balance</span>
                <span className="text-lg font-bold text-destructive">
                  ${parseFloat(debt.currentBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Minimum Payment</span>
                <span>${parseFloat(debt.minimumPayment).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Payment Date */}
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Payment Date *</Label>
              <Input
                id="paymentDate"
                type="date"
                value={formData.paymentDate}
                onChange={(e) => handleChange('paymentDate', e.target.value)}
                required
              />
            </div>

            {/* Payment Breakdown */}
            <div className="space-y-3">
              <Label>Payment Breakdown</Label>
              
              <div className="space-y-2">
                <Label htmlFor="principal" className="text-xs text-muted-foreground">
                  Principal Amount *
                </Label>
                <Input
                  id="principal"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.principalAmount}
                  onChange={(e) => handleChange('principalAmount', e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interest" className="text-xs text-muted-foreground">
                  Interest Amount
                </Label>
                <Input
                  id="interest"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.interestAmount}
                  onChange={(e) => handleChange('interestAmount', e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fees" className="text-xs text-muted-foreground">
                  Fees (Late fees, processing fees, etc.)
                </Label>
                <Input
                  id="fees"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.feesAmount}
                  onChange={(e) => handleChange('feesAmount', e.target.value)}
                  placeholder="0.00"
                />
              </div>

              {/* Total */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg flex items-center justify-between">
                <span className="text-sm font-medium">Total Payment</span>
                <span className="text-lg font-bold text-blue-600">
                  ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* New Balance */}
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  New Balance
                </span>
                <span className="text-lg font-bold text-green-600">
                  ${Math.max(0, parseFloat(debt.currentBalance) - totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select 
                value={formData.paymentMethod} 
                onValueChange={(value) => handleChange('paymentMethod', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="auto_pay">Auto-Pay</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Extra Payment Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="extraPayment"
                checked={formData.isExtraPayment}
                onCheckedChange={(checked) => handleChange('isExtraPayment', checked === true)}
              />
              <Label htmlFor="extraPayment" className="text-sm font-normal cursor-pointer">
                This is an extra payment (above minimum)
              </Label>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Add notes about this payment..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <DollarSign className="mr-2 h-4 w-4" />
                Log Payment
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
