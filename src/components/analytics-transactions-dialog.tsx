'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle } from 'lucide-react'

interface TransactionItem {
  id: string
  description: string
  amount: number
  date: string
  merchant?: string
  categoryName?: string
  categoryColor?: string
}

interface Summary {
  totalAmount: number
  transactionCount: number
}

interface AnalyticsTransactionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: 'category' | 'merchant'
  id: string | null   // categoryId for 'category', description for 'merchant'
  label: string       // display name
  color?: string
  period: string
}

export function AnalyticsTransactionsDialog({
  open,
  onOpenChange,
  type,
  id,
  label,
  color,
  period,
}: AnalyticsTransactionsDialogProps) {
  const [transactions, setTransactions] = useState<TransactionItem[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTransactions = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      setError(null)

      let url: string
      if (type === 'category') {
        url = `/api/analytics/category-transactions/${encodeURIComponent(id)}?period=${period}`
      } else {
        url = `/api/analytics/merchant-transactions?merchant=${encodeURIComponent(id)}&period=${period}`
      }

      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch transactions')
      const data = await res.json()

      setTransactions(data.transactions ?? [])
      setSummary(data.summary ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [type, id, period])

  useEffect(() => {
    if (open && id) {
      fetchTransactions()
    }
  }, [open, id, fetchTransactions])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {color && (
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
            )}
            <DialogTitle className="text-base">{label}</DialogTitle>
          </div>
          <DialogDescription>
            {summary
              ? `${summary.transactionCount} transaction${summary.transactionCount !== 1 ? 's' : ''} · $${summary.totalAmount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total`
              : `Transactions for the selected period`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 mt-2">
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-500 py-4">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {!loading && !error && transactions.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">
              No transactions found for this period.
            </p>
          )}

          {!loading && !error && transactions.length > 0 && (
            <div className="divide-y">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{formatDate(t.date)}</span>
                      {t.categoryName && type === 'merchant' && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0" style={
                          t.categoryColor
                            ? { backgroundColor: `${t.categoryColor}20`, color: t.categoryColor, borderColor: `${t.categoryColor}40` }
                            : {}
                        }>
                          {t.categoryName}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-sm font-semibold tabular-nums flex-shrink-0 ${
                      t.amount < 0 ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {t.amount < 0 ? '-' : '+'}${Math.abs(t.amount).toLocaleString('en-AU', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
