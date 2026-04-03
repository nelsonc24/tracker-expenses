'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Trash2, FolderOpen, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { formatCurrency } from '@/lib/utils'
import {
  calculateProjection,
  INVESTMENT_TYPE_PRESETS,
  type ProjectionInput,
} from '@/lib/investment-calculations'
import type { SelectInvestmentScenario } from '@/db/schema'

interface Props {
  scenarios: SelectInvestmentScenario[]
  onLoad: (input: ProjectionInput & { investmentType: string }) => void
  onDeleted: () => void
}

function scenarioToInput(s: SelectInvestmentScenario): ProjectionInput & { investmentType: string } {
  return {
    investmentType: s.investmentType,
    initialAmount: parseFloat(s.initialAmount),
    monthlyContribution: parseFloat(s.monthlyContribution),
    annualReturnRate: parseFloat(s.annualReturnRate),
    years: s.years,
    inflationRate: parseFloat(s.inflationRate),
    contributionIncreaseRate: parseFloat(s.contributionIncreaseRate),
    taxRate: parseFloat(s.taxRate),
  }
}

export function InvestmentScenariosPanel({ scenarios, onLoad, onDeleted }: Props) {
  const [open, setOpen] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<SelectInvestmentScenario | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/investments/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Scenario deleted')
      setDeleteTarget(null)
      onDeleted()
    } catch {
      toast.error('Failed to delete scenario')
    } finally {
      setDeleting(false)
    }
  }

  if (scenarios.length === 0) return null

  return (
    <>
      <Card>
        <CardHeader className="cursor-pointer select-none" onClick={() => setOpen((v) => !v)}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Saved Scenarios ({scenarios.length})</CardTitle>
            {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </CardHeader>
        {open && (
          <CardContent className="space-y-2 pt-0">
            {scenarios.map((s) => {
              const input = scenarioToInput(s)
              const result = calculateProjection(input)
              const typeLabel = INVESTMENT_TYPE_PRESETS[s.investmentType]?.label ?? s.investmentType
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2.5 gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {typeLabel} · {s.years}yr · {s.annualReturnRate}% p.a. → {formatCurrency(result.summary.finalValue)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => onLoad(input)}
                    >
                      <FolderOpen className="w-3.5 h-3.5 mr-1" />
                      Load
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(s)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        )}
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete scenario?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
