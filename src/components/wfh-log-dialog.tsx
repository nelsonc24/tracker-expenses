'use client'

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { toast } from 'sonner'

const FY_START = new Date('2025-07-01')
const FY_END = new Date('2026-06-30')
const FY_START_STR = '2025-07-01'
const FY_END_STR = '2026-06-30'

// JS Date.getDay(): 0=Sun, 1=Mon, ..., 6=Sat
const WEEKDAYS = [
  { key: 1, label: 'Mon' },
  { key: 2, label: 'Tue' },
  { key: 3, label: 'Wed' },
  { key: 4, label: 'Thu' },
  { key: 5, label: 'Fri' },
  { key: 6, label: 'Sat' },
  { key: 0, label: 'Sun' },
]

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getDatesBetween(start: string, end: string, allowedDays: Set<number>): string[] {
  if (!start || !end || start > end) return []
  const result: string[] = []
  const cur = new Date(start + 'T00:00:00')
  const last = new Date(end + 'T00:00:00')
  // Debug: log allowedDays and weekday for each date
  // Remove or comment out after confirming fix
  // console.log('Allowed days:', Array.from(allowedDays));
  while (cur <= last) {
    // Debug: log current date and day
    // console.log('Checking', toDateStr(cur), 'weekday', cur.getDay())
    if (allowedDays.has(cur.getDay())) {
      result.push(toDateStr(cur))
    }
    cur.setDate(cur.getDate() + 1)
  }
  return result
}

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

  // ── Single day state ─────────────────────────────────────────────────────
  const [logDate, setLogDate] = useState(initialDate ?? today)
  const [hours, setHours] = useState(initialHours?.toString() ?? '')
  const [notes, setNotes] = useState(initialNotes ?? '')

  // ── Multi day — date range state ─────────────────────────────────────────
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [allowedDayKeys, setAllowedDayKeys] = useState<Set<number>>(
    new Set([1, 2, 3, 4, 5]) // Mon–Fri by default
  )

  // ── Multi day — specific dates state ────────────────────────────────────
  const [specificDates, setSpecificDates] = useState<Date[]>([])

  // ── Shared multi day state ───────────────────────────────────────────────
  const [multiHours, setMultiHours] = useState('')
  const [multiNotes, setMultiNotes] = useState('')

  // ── UI state ─────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<'single' | 'multi'>('single')
  const [multiSubMode, setMultiSubMode] = useState<'range' | 'specific'>('range')
  const [saving, setSaving] = useState(false)

  // ── Derived: list of dates for the active multi-mode ─────────────────────
  const rangeDates = useMemo(
    () => getDatesBetween(rangeStart, rangeEnd, allowedDayKeys),
    [rangeStart, rangeEnd, allowedDayKeys]
  )

  const specificDateStrs = useMemo(
    () =>
      specificDates
        .map(toDateStr)
        .filter((d) => d >= FY_START_STR && d <= FY_END_STR)
        .sort(),
    [specificDates]
  )

  const activeDates = multiSubMode === 'range' ? rangeDates : specificDateStrs

  // ── Deduction previews ───────────────────────────────────────────────────
  const singleDeduction =
    parseFloat(hours) > 0 ? (parseFloat(hours) * 0.7).toFixed(2) : '0.00'

  const multiHoursNum = parseFloat(multiHours)
  const multiTotalHours =
    !isNaN(multiHoursNum) && multiHoursNum > 0
      ? activeDates.length * multiHoursNum
      : 0
  const multiDeduction = (multiTotalHours * 0.7).toFixed(2)

  // ── Handlers ─────────────────────────────────────────────────────────────
  function toggleDay(key: number) {
    setAllowedDayKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      // Debug: log the updated allowedDayKeys
      // console.log('Toggled day', key, 'allowedDayKeys now:', Array.from(next))
      return next
    })
  }

  async function handleSaveSingle() {
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

  async function handleSaveMulti() {
    if (activeDates.length === 0) {
      toast.error(
        multiSubMode === 'range'
          ? 'Select a valid date range with at least one day'
          : 'Select at least one date'
      )
      return
    }
    if (isNaN(multiHoursNum) || multiHoursNum < 0.5 || multiHoursNum > 24) {
      toast.error('Hours per day must be between 0.5 and 24')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/tax/wfh-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dates: activeDates,
          hours: multiHoursNum,
          notes: multiNotes.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to save')
      }
      toast.success(`${activeDates.length} WFH day${activeDates.length !== 1 ? 's' : ''} logged`)
      onSaved()
      onOpenChange(false)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save WFH entries')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log WFH Hours</DialogTitle>
          <DialogDescription>
            ATO fixed rate: 70¢ per hour. Keep a record for all FY 2025-26 WFH days.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'single' | 'multi')}>
          <TabsList className="w-full">
            <TabsTrigger value="single" className="flex-1">Single Day</TabsTrigger>
            <TabsTrigger value="multi" className="flex-1">Multiple Days</TabsTrigger>
          </TabsList>

          {/* ── Single Day ── */}
          <TabsContent value="single" className="mt-4 space-y-4">
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
                  Deduction: <span className="font-medium text-green-600">${singleDeduction}</span>
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

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSaveSingle} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* ── Multiple Days ── */}
          <TabsContent value="multi" className="mt-4 space-y-4">
            <Tabs
              value={multiSubMode}
              onValueChange={(v) => setMultiSubMode(v as 'range' | 'specific')}
            >
              <TabsList className="w-full">
                <TabsTrigger value="range" className="flex-1">Date Range</TabsTrigger>
                <TabsTrigger value="specific" className="flex-1">Specific Dates</TabsTrigger>
              </TabsList>

              {/* Date Range */}
              <TabsContent value="range" className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="rangeStart">From</Label>
                    <Input
                      id="rangeStart"
                      type="date"
                      min="2025-07-01"
                      max="2026-06-30"
                      value={rangeStart}
                      onChange={(e) => setRangeStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="rangeEnd">To</Label>
                    <Input
                      id="rangeEnd"
                      type="date"
                      min="2025-07-01"
                      max="2026-06-30"
                      value={rangeEnd}
                      onChange={(e) => setRangeEnd(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Include days</Label>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {WEEKDAYS.map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-1.5">
                        <Checkbox
                          id={`day-${key}`}
                          checked={allowedDayKeys.has(key)}
                          onCheckedChange={() => toggleDay(key)}
                        />
                        <label htmlFor={`day-${key}`} className="text-sm cursor-pointer">
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {rangeDates.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{rangeDates.length}</span>{' '}
                    day{rangeDates.length !== 1 ? 's' : ''} selected
                  </p>
                )}
              </TabsContent>

              {/* Specific Dates */}
              <TabsContent value="specific" className="mt-3 space-y-2">
                <Calendar
                  mode="multiple"
                  selected={specificDates}
                  onSelect={(dates) => setSpecificDates(dates ?? [])}
                  fromDate={FY_START}
                  toDate={FY_END}
                  className="rounded-md border mx-auto"
                />
                {specificDateStrs.length > 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    <span className="font-medium text-foreground">{specificDateStrs.length}</span>{' '}
                    date{specificDateStrs.length !== 1 ? 's' : ''} selected
                  </p>
                )}
              </TabsContent>
            </Tabs>

            {/* Shared hours + notes */}
            <div className="space-y-1">
              <Label htmlFor="multiHours">Hours per day</Label>
              <Input
                id="multiHours"
                type="number"
                min="0.5"
                max="24"
                step="0.5"
                placeholder="e.g. 7.5"
                value={multiHours}
                onChange={(e) => setMultiHours(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="multiNotes">Notes (optional)</Label>
              <Textarea
                id="multiNotes"
                placeholder="e.g. Remote week"
                rows={2}
                value={multiNotes}
                onChange={(e) => setMultiNotes(e.target.value)}
              />
            </div>

            {activeDates.length > 0 && multiTotalHours > 0 && (
              <p className="text-xs text-muted-foreground rounded-md bg-muted px-3 py-2">
                {activeDates.length} day{activeDates.length !== 1 ? 's' : ''} ×{' '}
                {multiHours} hrs ={' '}
                <span className="font-medium text-foreground">{multiTotalHours} hrs total</span>
                {' · '}Deduction:{' '}
                <span className="font-medium text-green-600">${multiDeduction}</span>
              </p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveMulti}
                disabled={saving || activeDates.length === 0}
              >
                {saving
                  ? 'Saving…'
                  : activeDates.length > 0
                  ? `Log ${activeDates.length} Day${activeDates.length !== 1 ? 's' : ''}`
                  : 'Log Days'}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

