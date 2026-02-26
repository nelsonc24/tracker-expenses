'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import type { GoalWithStats } from './goal-card'

interface Contribution {
  id: string
  amount: string
  note: string | null
  contributedAt: string
}

interface GoalHistorySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: GoalWithStats | null
}

function formatAmount(amount: string, currency: string) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(parseFloat(amount))
}

export function GoalHistorySheet({ open, onOpenChange, goal }: GoalHistorySheetProps) {
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !goal) return
    setLoading(true)
    fetch(`/api/goals/${goal.id}`)
      .then((r) => r.json())
      .then((data) => setContributions(data.contributions ?? []))
      .finally(() => setLoading(false))
  }, [open, goal])

  if (!goal) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[380px] sm:w-[420px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span>{goal.emoji}</span>
            <span>{goal.name} — History</span>
          </SheetTitle>
          <SheetDescription>
            All contributions to this goal, most recent first.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-0">
          {loading && (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          )}

          {!loading && contributions.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-3xl mb-3">💸</p>
              <p className="text-sm">No contributions yet.</p>
              <p className="text-xs mt-1">Add your first top-up to get started!</p>
            </div>
          )}

          {!loading &&
            contributions.map((c, idx) => (
              <div key={c.id}>
                <div className="flex items-start justify-between gap-3 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white"
                      style={{ backgroundColor: goal.color }}
                    >
                      +
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm">
                        {formatAmount(c.amount, goal.currency)}
                      </p>
                      {c.note && (
                        <p className="text-xs text-muted-foreground truncate">{c.note}</p>
                      )}
                    </div>
                  </div>
                  <time className="text-xs text-muted-foreground shrink-0 pt-0.5">
                    {format(new Date(c.contributedAt), 'dd MMM yyyy')}
                  </time>
                </div>
                {idx < contributions.length - 1 && <Separator />}
              </div>
            ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
