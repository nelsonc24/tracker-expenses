'use client'

import { useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface WfhLogDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-fill date for editing; defaults to today */
  initialDate?: string
  initialHours?: number
  initialNotes?: string
  onSaved: () => void
}

export function WfhLogDialog({
  open,
  onOpenChange,
  initialDate,
  initialHours,
  initialNotes,
  onSaved,
}: WfhLogDialogProps) {
  const today = new Date().toISOString().split('T')[0]
  const [logDate, setLogDate] = useState(initialDate ?? today)
  const [hours, setHours] = useState(initialHours?.toString() ?? '')
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const hoursNum = parseFloat(hours)
    if (!logDate) { toast.error('Please select a date'); return }
    if (isNaN(hoursNum) || hoursNum < 0.5 || hoursNum > 24) {
      toast.error('Hours must be between 0.5 and 24')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/tax/wfh-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logDate, hours: hoursNum, notes: notes.trim() || undefined }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to save')
      }
      toast.success('WFH hours saved')
      onSaved()
      onOpenChange(false)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save WFH entry')
    } finally {
      setSaving(false)
    }
  }

  const deduction = parseFloat(hours) > 0 ? (parseFloat(hours) * 0.70).toFixed(2) : '0.00'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Log WFH Hours</DialogTitle>
          <DialogDescription>
            ATO fixed rate: 70¢ per hour. Keep a record for all FY 2025-26 WFH days.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="wfhDate">Date</Label>
            <Input
              id="wfhDate"
              type="date"
              min="2025-07-01"
              max="2026-06-30"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="wfhHours">Hours worked from home</Label>
            <Input
              id="wfhHours"
              type="number"
              min="0.5"
              max="24"
              step="0.5"
              placeholder="e.g. 7.5"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
            {parseFloat(hours) > 0 && (
              <p className="text-xs text-muted-foreground">
                Deduction: <span className="font-medium text-green-600">${deduction}</span>
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="wfhNotes">Notes (optional)</Label>
            <Textarea
              id="wfhNotes"
              placeholder="e.g. Full day remote"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
