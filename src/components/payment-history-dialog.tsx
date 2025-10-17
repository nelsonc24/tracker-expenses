"use client"

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { EditPaymentDialog } from '@/components/edit-payment-dialog'
import { toast } from 'sonner'
import { Loader2, MoreHorizontal, Pencil, Trash2, DollarSign, Calendar, CreditCard, FileText } from 'lucide-react'
import { format } from 'date-fns'

interface Payment {
  id: string
  debtId: string
  paymentDate: string
  paymentAmount: string
  principalAmount: string
  interestAmount: string
  feesAmount: string
  paymentMethod?: string | null
  confirmationNumber?: string | null
  notes?: string | null
  isExtraPayment: boolean
  isAutomated: boolean
  balanceAfterPayment: string
  createdAt: string
}

interface Debt {
  id: string
  name: string
  creditorName: string
  currentBalance: string
}

interface PaymentHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  debt: Debt | null
  onPaymentChanged: () => void
}

export function PaymentHistoryDialog({ open, onOpenChange, debt, onPaymentChanged }: PaymentHistoryDialogProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchPayments = useCallback(async () => {
    if (!debt) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/debts/${debt.id}/payments`)
      if (!response.ok) throw new Error('Failed to fetch payments')
      const data = await response.json()
      setPayments(data)
    } catch (error) {
      console.error('Error fetching payments:', error)
      toast.error('Failed to load payment history')
    } finally {
      setIsLoading(false)
    }
  }, [debt])

  // Fetch payments when dialog opens or debt changes
  useEffect(() => {
    if (open && debt) {
      fetchPayments()
    }
  }, [open, debt, fetchPayments])

  const handleEdit = (payment: Payment) => {
    setSelectedPayment(payment)
    setShowEditDialog(true)
  }

  const handleDeleteClick = (payment: Payment) => {
    setPaymentToDelete(payment)
    setShowDeleteDialog(true)
  }

  const handleDelete = async () => {
    if (!paymentToDelete || !debt) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/debts/${debt.id}/payments/${paymentToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete payment')
      }

      toast.success('Payment deleted successfully')
      fetchPayments()
      onPaymentChanged()
      setShowDeleteDialog(false)
      setPaymentToDelete(null)
    } catch (error) {
      console.error('Error deleting payment:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete payment')
    } finally {
      setIsDeleting(false)
    }
  }

  const handlePaymentUpdated = () => {
    fetchPayments()
    onPaymentChanged()
    setShowEditDialog(false)
  }

  const formatCurrency = (amount: string) => {
    return parseFloat(amount).toLocaleString('en-AU', {
      style: 'currency',
      currency: 'AUD',
    })
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy')
    } catch {
      return dateString
    }
  }

  const getPaymentMethodLabel = (method: string | null | undefined) => {
    if (!method) return '-'
    const labels: Record<string, string> = {
      bank_transfer: 'Bank Transfer',
      credit_card: 'Credit Card',
      cash: 'Cash',
      check: 'Check',
      auto_pay: 'Auto Pay',
    }
    return labels[method] || method
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment History</DialogTitle>
            <DialogDescription>
              {debt && (
                <>
                  {debt.name} - {debt.creditorName}
                  <span className="ml-2 text-sm font-semibold">
                    Current Balance: {formatCurrency(debt.currentBalance)}
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading payments...</span>
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Payments Yet</h3>
              <p className="text-sm text-muted-foreground">
                Payment history will appear here once you log your first payment.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Principal</TableHead>
                    <TableHead>Interest</TableHead>
                    <TableHead>Fees</TableHead>
                    <TableHead>Balance After</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(payment.paymentDate)}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-green-600">
                        {formatCurrency(payment.paymentAmount)}
                      </TableCell>
                      <TableCell>{formatCurrency(payment.principalAmount)}</TableCell>
                      <TableCell className="text-orange-600">
                        {formatCurrency(payment.interestAmount)}
                      </TableCell>
                      <TableCell className="text-yellow-600">
                        {formatCurrency(payment.feesAmount)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(payment.balanceAfterPayment)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{getPaymentMethodLabel(payment.paymentMethod)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {payment.isExtraPayment && (
                            <Badge variant="secondary" className="text-xs">Extra</Badge>
                          )}
                          {payment.isAutomated && (
                            <Badge variant="outline" className="text-xs">Auto</Badge>
                          )}
                          {!payment.isExtraPayment && !payment.isAutomated && (
                            <span className="text-xs text-muted-foreground">Regular</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {payment.notes && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => {
                                    toast.info(payment.notes || 'No notes')
                                  }}
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  View Notes
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem onClick={() => handleEdit(payment)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteClick(payment)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {payments.length > 0 && (
            <div className="flex justify-between items-center text-sm text-muted-foreground pt-4 border-t">
              <div>
                Total Payments: <span className="font-semibold">{payments.length}</span>
              </div>
              <div>
                Total Paid: <span className="font-semibold text-green-600">
                  {formatCurrency(
                    payments.reduce((sum, p) => sum + parseFloat(p.paymentAmount), 0).toFixed(2)
                  )}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Payment Dialog */}
      <EditPaymentDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        payment={selectedPayment}
        onPaymentUpdated={handlePaymentUpdated}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment of{' '}
              {paymentToDelete && formatCurrency(paymentToDelete.paymentAmount)} from{' '}
              {paymentToDelete && formatDate(paymentToDelete.paymentDate)}?
              <br /><br />
              This will recalculate the debt balance and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Payment'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
