"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'

interface Payment {
  id: string
  debtId: string
  paymentDate: string
  paymentAmount: string
  principalAmount: string
  interestAmount?: string
  feesAmount?: string
  paymentMethod?: string | null
  confirmationNumber?: string | null
  notes?: string | null
  isExtraPayment?: boolean
  isAutomated?: boolean
}

interface EditPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment: Payment | null
  onPaymentUpdated: () => void
}

export function EditPaymentDialog({ open, onOpenChange, payment, onPaymentUpdated }: EditPaymentDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    paymentDate: '',
    paymentAmount: '',
    principalAmount: '',
    interestAmount: '',
    feesAmount: '',
    paymentMethod: '',
    confirmationNumber: '',
    notes: '',
    isExtraPayment: false,
  })

  // Reset form when payment changes
  useEffect(() => {
    if (payment) {
      setFormData({
        paymentDate: payment.paymentDate ? new Date(payment.paymentDate).toISOString().split('T')[0] : '',
        paymentAmount: payment.paymentAmount || '',
        principalAmount: payment.principalAmount || '',
        interestAmount: payment.interestAmount || '0.00',
        feesAmount: payment.feesAmount || '0.00',
        paymentMethod: payment.paymentMethod || '',
        confirmationNumber: payment.confirmationNumber || '',
        notes: payment.notes || '',
        isExtraPayment: payment.isExtraPayment || false,
      })
    }
  }, [payment])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!payment) return

    setIsLoading(true)

    try {
      const response = await fetch(`/api/debts/${payment.debtId}/payments/${payment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentDate: formData.paymentDate,
          paymentAmount: formData.paymentAmount,
          principalAmount: formData.principalAmount,
          interestAmount: formData.interestAmount || '0.00',
          feesAmount: formData.feesAmount || '0.00',
          paymentMethod: formData.paymentMethod || null,
          confirmationNumber: formData.confirmationNumber || null,
          notes: formData.notes || null,
          isExtraPayment: formData.isExtraPayment,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update payment')
      }

      toast.success('Payment updated successfully')
      onPaymentUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error('Error updating payment:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update payment')
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-calculate principal when payment amount or interest/fees change
  useEffect(() => {
    const paymentAmount = parseFloat(formData.paymentAmount) || 0
    const interestAmount = parseFloat(formData.interestAmount) || 0
    const feesAmount = parseFloat(formData.feesAmount) || 0
    const calculatedPrincipal = Math.max(0, paymentAmount - interestAmount - feesAmount)
    
    setFormData(prev => ({
      ...prev,
      principalAmount: calculatedPrincipal.toFixed(2)
    }))
  }, [formData.paymentAmount, formData.interestAmount, formData.feesAmount])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Payment</DialogTitle>
          <DialogDescription>
            Update payment details. The debt balance will be automatically recalculated.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="paymentDate">Payment Date *</Label>
            <Input
              id="paymentDate"
              type="date"
              value={formData.paymentDate}
              onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentAmount">Total Payment Amount *</Label>
            <Input
              id="paymentAmount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.paymentAmount}
              onChange={(e) => setFormData({ ...formData, paymentAmount: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interestAmount">Interest</Label>
              <Input
                id="interestAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.interestAmount}
                onChange={(e) => setFormData({ ...formData, interestAmount: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feesAmount">Fees</Label>
              <Input
                id="feesAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.feesAmount}
                onChange={(e) => setFormData({ ...formData, feesAmount: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="principalAmount">Principal (Auto-calculated)</Label>
            <Input
              id="principalAmount"
              type="number"
              step="0.01"
              min="0"
              value={formData.principalAmount}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select
              value={formData.paymentMethod}
              onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="credit_card">Credit Card</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="auto_pay">Auto Pay</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmationNumber">Confirmation Number</Label>
            <Input
              id="confirmationNumber"
              type="text"
              placeholder="Optional"
              value={formData.confirmationNumber}
              onChange={(e) => setFormData({ ...formData, confirmationNumber: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this payment..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Update Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
