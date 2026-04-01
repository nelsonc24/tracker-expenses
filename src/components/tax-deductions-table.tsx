'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Receipt, X } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { TAX_CATEGORIES, type TaxCategoryValue } from '@/lib/tax-utils'

interface DeductibleTransaction {
  id: string
  description: string
  merchant: string | null
  amount: string
  transactionDate: string
  taxCategory: string | null
}

interface TaxDeductionsTableProps {
  transactions: DeductibleTransaction[]
  onRefresh: () => void
}

const categoryColors: Record<string, string> = {
  work_from_home: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  vehicle_travel: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  tools_equipment: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  phone_internet: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  self_education: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  clothing_uniform: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  professional_fees: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  other_work: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  investment: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
}

export function TaxDeductionsTable({ transactions, onRefresh }: TaxDeductionsTableProps) {
  const [updating, setUpdating] = useState<string | null>(null)

  async function updateTaxCategory(id: string, taxCategory: string | null) {
    setUpdating(id)
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taxCategory }),
      })
      if (!res.ok) throw new Error('Failed to update')
      onRefresh()
    } catch {
      toast.error('Failed to update category')
    } finally {
      setUpdating(null)
    }
  }

  async function removeDeduction(id: string) {
    setUpdating(id)
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taxDeductible: false, taxCategory: null }),
      })
      if (!res.ok) throw new Error('Failed to update')
      toast.success('Removed from deductions')
      onRefresh()
    } catch {
      toast.error('Failed to update transaction')
    } finally {
      setUpdating(null)
    }
  }

  // Group by category
  const grouped = TAX_CATEGORIES.map((cat) => {
    const txns = transactions.filter((t) => (t.taxCategory ?? 'other_work') === cat.value)
    const total = txns.reduce((s, t) => s + Math.abs(parseFloat(t.amount)), 0)
    return { ...cat, txns, total }
  }).filter((g) => g.txns.length > 0)

  const grandTotal = transactions.reduce((s, t) => s + Math.abs(parseFloat(t.amount)), 0)

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base">Work-Related Deductions</CardTitle>
          </div>
          <Badge variant="outline" className="font-mono">
            {transactions.length} items · {formatCurrency(grandTotal)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Receipt className="mx-auto mb-2 h-8 w-8 opacity-30" />
            <p>No deductible transactions yet.</p>
            <p className="mt-1">Mark transactions as tax-deductible from the Transactions page.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map((group) => (
              <div key={group.value}>
                <div className="mb-2 flex items-center justify-between">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${categoryColors[group.value]}`}>
                    {group.label}
                  </span>
                  <span className="text-sm font-semibold">{formatCurrency(group.total)}</span>
                </div>
                <div className="divide-y rounded-lg border">
                  {group.txns.map((txn) => (
                    <div
                      key={txn.id}
                      className="flex items-center gap-2 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{txn.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {txn.merchant ? `${txn.merchant} · ` : ''}
                          {formatDate(txn.transactionDate)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="font-mono text-sm font-semibold">
                          {formatCurrency(Math.abs(parseFloat(txn.amount)))}
                        </span>
                        <Select
                          value={txn.taxCategory ?? 'other_work'}
                          onValueChange={(val) => updateTaxCategory(txn.id, val)}
                          disabled={updating === txn.id}
                        >
                          <SelectTrigger className="h-7 w-40 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TAX_CATEGORIES.map((c) => (
                              <SelectItem key={c.value} value={c.value} className="text-xs">
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeDeduction(txn.id)}
                          disabled={updating === txn.id}
                          title="Remove from deductions"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
              <span className="text-sm font-medium">Total Work Deductions</span>
              <span className="font-mono text-sm font-bold">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
