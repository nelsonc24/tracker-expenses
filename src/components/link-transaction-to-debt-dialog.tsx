"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Loader2, CreditCard, Calendar } from 'lucide-react'

type Transaction = {
  id: string
  description: string
  amount: number
  date: string
  merchant?: string
}

type Debt = {
  id: string
  name: string
  debtType: string
  creditorName: string
  currentBalance: string
  interestRate: string
  minimumPayment: string
}

type LinkTransactionToDebtDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: Transaction | null
  onLinked: () => void
}

export function LinkTransactionToDebtDialog({
  open,
  onOpenChange,
  transaction,
  onLinked
}: LinkTransactionToDebtDialogProps) {
  const [debts, setDebts] = useState<Debt[]>([])
  const [selectedDebtId, setSelectedDebtId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  
  // Payment details
  const [principalAmount, setPrincipalAmount] = useState('')
  const [interestAmount, setInterestAmount] = useState('')
  const [feesAmount, setFeesAmount] = useState('0.00')
  const [isExtraPayment, setIsExtraPayment] = useState(false)
  const [notes, setNotes] = useState('')

  // Fetch debts when dialog opens
  useEffect(() => {
    if (open) {
      fetchDebts()
      // Auto-populate with transaction amount
      if (transaction) {
        const absAmount = Math.abs(transaction.amount)
        setPrincipalAmount(absAmount.toFixed(2))
        setInterestAmount('0.00')
        setFeesAmount('0.00')
        setNotes(`Payment from transaction: ${transaction.description}`)
      }
    }
  }, [open, transaction])

  const fetchDebts = async () => {
    setIsFetching(true)
    try {
      const response = await fetch('/api/debts?status=active')
      if (response.ok) {
        const data = await response.json()
        setDebts(data)
      }
    } catch (error) {
      console.error('Error fetching debts:', error)
      toast.error('Failed to load debts')
    } finally {
      setIsFetching(false)
    }
  }

  const handleLink = async () => {
    if (!selectedDebtId || !transaction) {
      toast.error('Please select a debt')
      return
    }

    const principal = parseFloat(principalAmount) || 0
    const interest = parseFloat(interestAmount) || 0
    const fees = parseFloat(feesAmount) || 0
    const totalPayment = principal + interest + fees

    if (totalPayment <= 0) {
      toast.error('Payment amount must be greater than 0')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/debts/${selectedDebtId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: transaction.id,
          paymentDate: transaction.date,
          principalAmount: principal.toFixed(2),
          interestAmount: interest.toFixed(2),
          feesAmount: fees.toFixed(2),
          paymentMethod: 'bank_transfer',
          isExtraPayment,
          notes,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to link transaction')
      }

      toast.success('Transaction linked to debt payment!')
      onLinked()
      onOpenChange(false)
      resetForm()
    } catch (error) {
      console.error('Error linking transaction:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to link transaction')
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedDebtId('')
    setPrincipalAmount('')
    setInterestAmount('')
    setFeesAmount('0.00')
    setIsExtraPayment(false)
    setNotes('')
  }

  const totalAmount = (parseFloat(principalAmount) || 0) + (parseFloat(interestAmount) || 0) + (parseFloat(feesAmount) || 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Link Transaction to Debt Payment</DialogTitle>
          <DialogDescription>
            Record this transaction as a payment toward one of your debts
          </DialogDescription>
        </DialogHeader>

        {transaction && (
          <div className="space-y-4">
            {/* Transaction Info */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Transaction</span>
                <span className="text-sm font-bold text-red-600">
                  {new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(Math.abs(transaction.amount))}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{transaction.description}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{new Date(transaction.date).toLocaleDateString('en-AU', { dateStyle: 'medium' })}</span>
              </div>
            </div>

            {/* Select Debt */}
            <div className="space-y-2">
              <Label htmlFor="debt">Debt Account</Label>
              {isFetching ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : debts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No active debts found. Create a debt first.</p>
              ) : (
                <Select value={selectedDebtId} onValueChange={setSelectedDebtId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a debt" />
                  </SelectTrigger>
                  <SelectContent>
                    {debts.map((debt) => (
                      <SelectItem key={debt.id} value={debt.id}>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          <span>{debt.name}</span>
                          <span className="text-muted-foreground text-xs">
                            ({debt.creditorName})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Payment Breakdown */}
            <div className="space-y-3">
              <Label>Payment Breakdown</Label>
              
              <div className="space-y-2">
                <Label htmlFor="principal" className="text-xs text-muted-foreground">
                  Principal Amount
                </Label>
                <Input
                  id="principal"
                  type="number"
                  step="0.01"
                  value={principalAmount}
                  onChange={(e) => setPrincipalAmount(e.target.value)}
                  placeholder="0.00"
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
                  value={interestAmount}
                  onChange={(e) => setInterestAmount(e.target.value)}
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
                  value={feesAmount}
                  onChange={(e) => setFeesAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              {/* Total */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg flex items-center justify-between">
                <span className="text-sm font-medium">Total Payment</span>
                <span className="text-lg font-bold text-blue-600">
                  {new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(totalAmount)}
                </span>
              </div>
            </div>

            {/* Extra Payment Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="extraPayment"
                checked={isExtraPayment}
                onCheckedChange={(checked) => setIsExtraPayment(checked === true)}
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
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this payment..."
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleLink} disabled={isLoading || !selectedDebtId || debts.length === 0}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Link to Debt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
