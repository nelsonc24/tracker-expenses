'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { 
  DollarSign, 
  TrendingUp, 
  Building2, 
  CreditCard,
  Pencil
} from 'lucide-react'

interface Debt {
  id: string
  name: string
  debtType: string
  creditorName: string
  currentBalance: string
  originalBalance?: string
  interestRate: string
  minimumPayment: string
  paymentFrequency: string
  paymentDueDay?: number | null
  status: string
  nextDueDate: string | null
  createdAt?: string
  updatedAt?: string
}

interface DebtDetailsDialogProps {
  debt: Debt | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
}

const DEBT_TYPE_LABELS: Record<string, string> = {
  credit_card: 'Credit Card',
  personal_loan: 'Personal Loan',
  student_loan: 'Student Loan',
  mortgage: 'Mortgage',
  car_loan: 'Car Loan',
  medical: 'Medical',
  personal: 'Personal',
  line_of_credit: 'Line of Credit',
  bnpl: 'Buy Now Pay Later',
}

const PAYMENT_FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'default',
  paid_off: 'secondary',
  in_collections: 'destructive',
  settled: 'outline',
  archived: 'outline',
}

export function DebtDetailsDialog({ debt, open, onOpenChange, onEdit }: DebtDetailsDialogProps) {
  if (!debt) return null

  const formatCurrency = (value: string) => {
    return `$${parseFloat(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const calculateProgress = () => {
    if (!debt.originalBalance) return null
    const original = parseFloat(debt.originalBalance)
    const current = parseFloat(debt.currentBalance)
    if (original <= 0) return null
    const paidOff = ((original - current) / original) * 100
    return Math.max(0, Math.min(100, paidOff))
  }

  const progress = calculateProgress()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold">{debt.name}</DialogTitle>
              <DialogDescription className="mt-1">
                Complete details and payment information
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status and Type */}
          <div className="flex items-center gap-3">
            <Badge variant={(STATUS_COLORS[debt.status] || 'default') as 'default' | 'secondary' | 'destructive' | 'outline'} className="text-sm">
              {debt.status.replace('_', ' ')}
            </Badge>
            <span className="text-sm text-muted-foreground">•</span>
            <span className="text-sm text-muted-foreground">
              {DEBT_TYPE_LABELS[debt.debtType] || debt.debtType}
            </span>
          </div>

          {/* Current Balance - Prominent */}
          <div className="bg-muted/50 rounded-lg p-6 border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <DollarSign className="h-4 w-4" />
              Current Balance
            </div>
            <div className="text-4xl font-bold text-destructive font-mono">
              {formatCurrency(debt.currentBalance)}
            </div>
            {progress !== null && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                  <span>Progress</span>
                  <span>{progress.toFixed(1)}% paid off</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Original: {formatCurrency(debt.originalBalance!)}</span>
                  <span>Remaining: {formatCurrency(debt.currentBalance)}</span>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Creditor Information */}
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold mb-3">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Creditor Information
            </div>
            <div className="grid grid-cols-1 gap-3 bg-muted/30 rounded-lg p-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Creditor Name</div>
                <div className="font-medium">{debt.creditorName}</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Details */}
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold mb-3">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              Payment Details
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 rounded-lg p-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Minimum Payment</div>
                <div className="font-medium font-mono">{formatCurrency(debt.minimumPayment)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Payment Frequency</div>
                <div className="font-medium">
                  {PAYMENT_FREQUENCY_LABELS[debt.paymentFrequency] || debt.paymentFrequency}
                </div>
              </div>
              {debt.paymentDueDay && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Due Day of Month</div>
                  <div className="font-medium">{debt.paymentDueDay}</div>
                </div>
              )}
              {debt.nextDueDate && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Next Due Date</div>
                  <div className="font-medium">{formatDate(debt.nextDueDate)}</div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Interest Information */}
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold mb-3">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Interest Information
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 rounded-lg p-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Interest Rate (APR)</div>
                <div className="font-medium font-mono text-lg flex items-center gap-2">
                  {parseFloat(debt.interestRate).toFixed(2)}%
                  {parseFloat(debt.interestRate) >= 20 && (
                    <Badge variant="destructive" className="text-xs">High</Badge>
                  )}
                  {parseFloat(debt.interestRate) < 20 && parseFloat(debt.interestRate) >= 10 && (
                    <Badge variant="outline" className="text-xs">Medium</Badge>
                  )}
                  {parseFloat(debt.interestRate) < 10 && (
                    <Badge variant="secondary" className="text-xs">Low</Badge>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Est. Monthly Interest</div>
                <div className="font-medium font-mono text-lg">
                  {formatCurrency((parseFloat(debt.currentBalance) * parseFloat(debt.interestRate) / 100 / 12).toString())}
                </div>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          {(debt.createdAt || debt.updatedAt) && (
            <>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-muted-foreground">
                {debt.createdAt && (
                  <div>
                    <div className="mb-1">Created</div>
                    <div className="font-medium">{formatDate(debt.createdAt)}</div>
                  </div>
                )}
                {debt.updatedAt && (
                  <div>
                    <div className="mb-1">Last Updated</div>
                    <div className="font-medium">{formatDate(debt.updatedAt)}</div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
