'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ProjectionInput } from '@/lib/investment-calculations'
import { INVESTMENT_TYPE_PRESETS } from '@/lib/investment-calculations'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  input: ProjectionInput & { investmentType?: string }
  onSaved: () => void
}

export function SaveScenarioDialog({ open, onOpenChange, input, onSaved }: Props) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const typeLabel =
    INVESTMENT_TYPE_PRESETS[(input.investmentType ?? 'custom') as string]?.label ?? 'Custom'

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          investmentType: input.investmentType ?? 'custom',
          initialAmount: input.initialAmount,
          monthlyContribution: input.monthlyContribution,
          annualReturnRate: input.annualReturnRate,
          years: input.years,
          inflationRate: input.inflationRate,
          contributionIncreaseRate: input.contributionIncreaseRate,
          taxRate: input.taxRate,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('Scenario saved')
      setName('')
      onSaved()
    } catch {
      toast.error('Failed to save scenario')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Scenario</DialogTitle>
          <DialogDescription>
            Save this {typeLabel} projection ({input.years}-year, {input.annualReturnRate}% p.a.) to revisit later.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Scenario Name</Label>
            <Input
              placeholder="e.g. Retirement at 60"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
