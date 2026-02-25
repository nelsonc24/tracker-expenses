'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { AddBillDialog } from '@/components/add-bill-dialog'
import { EditBillDialog } from '@/components/edit-bill-dialog'
import {
  CalendarDays, DollarSign, TrendingUp, AlertCircle, Plus, MoreHorizontal, Edit, Trash2,
  Clock, Zap, Calendar, ArrowRight, Repeat, ChevronRight, ChevronLeft
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { format, addDays, addWeeks, addMonths, addQuarters, addYears, isSameDay, startOfDay, differenceInDays } from 'date-fns'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface Bill {
  id: string
  name: string
  description?: string
  amount: string
  accountId: string
  categoryId?: string
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'
  dueDay?: number
  dueDate?: string
  lastPaidDate?: string
  lastPaidAmount?: string
  reminderDays: number
  isActive: boolean
  isAutoPay: boolean
  notes?: string
  tags: string[]
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function calculateNextDueDate(bill: Bill): Date | null {
  const today = startOfDay(new Date())

  if (bill.frequency === 'monthly' && bill.dueDay) {
    let candidate = new Date(today.getFullYear(), today.getMonth(), bill.dueDay)
    if (candidate < today) candidate = addMonths(candidate, 1)
    return candidate
  }

  if (!bill.dueDate) return null

  let candidate = startOfDay(new Date(bill.dueDate))
  while (candidate < today) {
    switch (bill.frequency) {
      case 'weekly':    candidate = addWeeks(candidate, 1);    break
      case 'biweekly':  candidate = addWeeks(candidate, 2);    break
      case 'monthly':   candidate = addMonths(candidate, 1);   break
      case 'quarterly': candidate = addQuarters(candidate, 1); break
      case 'yearly':    candidate = addYears(candidate, 1);    break
      default: return null
    }
  }
  return candidate
}

const FREQUENCY_COLORS: Record<string, string> = {
  weekly: '#3b82f6', biweekly: '#8b5cf6', monthly: '#10b981', quarterly: '#f59e0b', yearly: '#ef4444',
}
const FREQUENCY_BG: Record<string, string> = {
  weekly: 'bg-blue-100 text-blue-800', biweekly: 'bg-purple-100 text-purple-800',
  monthly: 'bg-emerald-100 text-emerald-800', quarterly: 'bg-amber-100 text-amber-800', yearly: 'bg-red-100 text-red-800',
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-background border rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium mb-1">{label}</p>
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">
          {new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(payload[0].value)}
        </span>
      </p>
    </div>
  )
}

interface TimelineBill { bill: Bill; nextDue: Date; daysUntilDue: number }

interface BillProjection {
  period: string
  startDate: string
  endDate: string
  totalEstimated: number
  billsCount: number
  bills: Array<{
    id: string
    name: string
    frequency: string
    estimatedAmount: number
    averageAmount: number
    occurrences: number
    dueDate?: string
    dueDay?: number
    isAutoPay: boolean
    lastPaidAmount?: string
    lastPaidDate?: string
    notes?: string
    tags: string[]
  }>
}

interface ProjectionSummary {
  totalProjected: number
  averagePerPeriod: number
  highestPeriod: { period: string; amount: number }
  lowestPeriod: { period: string; amount: number }
  period: string
  periodsAhead: number
}

const fmtCurrency = (amount: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount)

export default function BillsPage() {
  const searchParams = useSearchParams()
  const [bills, setBills] = useState<Bill[]>([])
  const [projections, setProjections] = useState<BillProjection[]>([])
  const [summary, setSummary] = useState<ProjectionSummary | null>(null)
  const [period, setPeriod] = useState('month')
  const [periodsAhead, setPeriodsAhead] = useState('6')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingBill, setEditingBill] = useState<Bill | null>(null)
  const [deletingBill, setDeletingBill] = useState<Bill | null>(null)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const [timelineOffset, setTimelineOffset] = useState(0)

  const fetchBills = async () => {
    try {
      const response = await fetch('/api/bills?active=true')
      if (!response.ok) throw new Error('Failed to fetch bills')
      const data = await response.json()
      setBills(data.bills)
    } catch (err) {
      setError('Failed to load bills')
      console.error(err)
    }
  }

  const fetchProjections = useCallback(async () => {
    try {
      const response = await fetch(`/api/bills/projections?period=${period}&periods=${periodsAhead}`)
      if (!response.ok) throw new Error('Failed to fetch projections')
      const data = await response.json()
      setProjections(data.projections)
      setSummary(data.summary)
    } catch (err) {
      setError('Failed to load projections')
      console.error(err)
    }
  }, [period, periodsAhead])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        await fetchBills()
        await fetchProjections()
      } finally {
        setLoading(false)
        setInitialLoadComplete(true)
      }
    }
    loadData()
  }, [fetchProjections])

  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'add') {
      setShowAddDialog(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [searchParams])

  useEffect(() => {
    if (initialLoadComplete) fetchProjections()
  }, [fetchProjections, initialLoadComplete])

  const handleBillSuccess = useCallback(() => {
    fetchBills()
    fetchProjections()
  }, [fetchProjections])

  const confirmDeleteBill = async () => {
    if (!deletingBill) return
    try {
      const response = await fetch(`/api/bills/${deletingBill.id}`, { method: 'DELETE' })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete bill')
      }
      setDeletingBill(null)
      fetchBills()
      fetchProjections()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bill')
    }
  }

  // ── Derived data ──────────────────────────────────────────────────────────────

  const billsWithNextDue = useMemo<TimelineBill[]>(() => {
    const today = startOfDay(new Date())
    return bills
      .map(bill => {
        const nextDue = calculateNextDueDate(bill)
        if (!nextDue) return null
        return { bill, nextDue, daysUntilDue: differenceInDays(nextDue, today) }
      })
      .filter((x): x is TimelineBill => x !== null)
      .sort((a, b) => a.nextDue.getTime() - b.nextDue.getTime())
  }, [bills])

  const billsDueIn7 = useMemo(
    () => billsWithNextDue.filter(b => b.daysUntilDue >= 0 && b.daysUntilDue <= 7),
    [billsWithNextDue]
  )
  const billsDueIn14 = useMemo(
    () => billsWithNextDue.filter(b => b.daysUntilDue > 7 && b.daysUntilDue <= 14),
    [billsWithNextDue]
  )

  const frequencyBreakdown = useMemo(() => {
    const counts: Record<string, { count: number; total: number }> = {}
    bills.forEach(b => {
      if (!counts[b.frequency]) counts[b.frequency] = { count: 0, total: 0 }
      counts[b.frequency].count++
      counts[b.frequency].total += parseFloat(b.amount)
    })
    return Object.entries(counts).map(([freq, data]) => ({
      name: freq.charAt(0).toUpperCase() + freq.slice(1),
      freq,
      count: data.count,
      total: data.total,
      color: FREQUENCY_COLORS[freq] ?? '#6b7280',
    }))
  }, [bills])

  const trendChartData = useMemo(
    () => projections.map(p => ({ period: p.period, amount: p.totalEstimated, bills: p.billsCount })),
    [projections]
  )

  const timelineStart = useMemo(
    () => addDays(startOfDay(new Date()), timelineOffset * 7),
    [timelineOffset]
  )
  const timelineEnd = useMemo(() => addDays(timelineStart, 60), [timelineStart])

  const timelineGroups = useMemo(() => {
    const today = startOfDay(new Date())
    const items: Array<{ bill: Bill; dueDate: Date; daysFromToday: number }> = []
    bills.forEach(bill => {
      let cursor = calculateNextDueDate(bill)
      if (!cursor) return
      // Walk back to the start of the window if needed
      const advance = (d: Date, n: -1 | 1): Date => {
        switch (bill.frequency) {
          case 'weekly':    return addWeeks(d, n)
          case 'biweekly':  return addWeeks(d, 2 * n)
          case 'monthly':   return addMonths(d, n)
          case 'quarterly': return addQuarters(d, n)
          case 'yearly':    return addYears(d, n)
          default:          return d
        }
      }
      while (cursor > timelineStart) {
        const prev = advance(cursor, -1)
        if (prev < timelineStart) break
        cursor = prev
      }
      while (cursor <= timelineEnd) {
        if (cursor >= timelineStart) {
          items.push({ bill, dueDate: cursor, daysFromToday: differenceInDays(cursor, today) })
        }
        cursor = advance(cursor, 1)
        if (cursor.getFullYear() > timelineEnd.getFullYear() + 2) break
      }
    })
    items.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    const groups: Record<string, typeof items> = {}
    items.forEach(item => {
      const key = format(item.dueDate, 'yyyy-MM-dd')
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    })
    return Object.entries(groups).map(([, g]) => ({ date: g[0].dueDate, items: g }))
  }, [bills, timelineStart, timelineEnd])

  // ── Loading ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 bg-muted rounded-lg" />)}
          </div>
          <div className="h-64 bg-muted rounded-lg" />
          <div className="h-48 bg-muted rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bills &amp; Projections</h1>
          <p className="text-muted-foreground mt-1">
            Manage recurring bills, track upcoming due dates, and project future expenses
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Bill
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {bills.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-14">
              <CalendarDays className="mx-auto h-14 w-14 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No bills yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Start by adding your first recurring bill to see projections, timelines and manage your expenses.
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Bill
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {bills.length > 0 && (
        <>
          {/* Section 1: Insight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Due this week */}
            <Card className={billsDueIn7.length > 0 ? 'border-red-200 bg-red-50 dark:bg-red-950/20' : ''}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Due This Week</CardTitle>
                <Clock className={`h-4 w-4 ${billsDueIn7.length > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${billsDueIn7.length > 0 ? 'text-red-700 dark:text-red-400' : ''}`}>
                  {billsDueIn7.length} bill{billsDueIn7.length !== 1 ? 's' : ''}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {billsDueIn7.length > 0
                    ? `${fmtCurrency(billsDueIn7.reduce((s, b) => s + parseFloat(b.bill.amount), 0))} total`
                    : 'Nothing due in 7 days'}
                </p>
                {billsDueIn7.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {billsDueIn7.slice(0, 2).map(b => (
                      <div key={b.bill.id} className="flex items-center justify-between text-xs">
                        <span className="truncate text-foreground font-medium">{b.bill.name}</span>
                        <span className="text-red-600 dark:text-red-400 shrink-0 ml-2">
                          {b.daysUntilDue === 0 ? 'Today' : `${b.daysUntilDue}d`}
                        </span>
                      </div>
                    ))}
                    {billsDueIn7.length > 2 && (
                      <p className="text-xs text-muted-foreground">+{billsDueIn7.length - 2} more</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Due next 8–14 days */}
            <Card className={billsDueIn14.length > 0 ? 'border-amber-200 bg-amber-50 dark:bg-amber-950/20' : ''}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Due in 8–14 Days</CardTitle>
                <Calendar className={`h-4 w-4 ${billsDueIn14.length > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${billsDueIn14.length > 0 ? 'text-amber-700 dark:text-amber-400' : ''}`}>
                  {billsDueIn14.length} bill{billsDueIn14.length !== 1 ? 's' : ''}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {billsDueIn14.length > 0
                    ? `${fmtCurrency(billsDueIn14.reduce((s, b) => s + parseFloat(b.bill.amount), 0))} total`
                    : 'Nothing due in 8–14 days'}
                </p>
                {billsDueIn14.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {billsDueIn14.slice(0, 2).map(b => (
                      <div key={b.bill.id} className="flex items-center justify-between text-xs">
                        <span className="truncate text-foreground font-medium">{b.bill.name}</span>
                        <span className="text-amber-600 dark:text-amber-400 shrink-0 ml-2">{b.daysUntilDue}d</span>
                      </div>
                    ))}
                    {billsDueIn14.length > 2 && <p className="text-xs text-muted-foreground">+{billsDueIn14.length - 2} more</p>}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Total projected */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Projected</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary ? fmtCurrency(summary.totalProjected) : '—'}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary ? `Next ${summary.periodsAhead} ${summary.period}s` : 'Loading…'}
                </p>
              </CardContent>
            </Card>

            {/* Frequency breakdown */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Bill Frequency</CardTitle>
                <Repeat className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{bills.length} active</div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {frequencyBreakdown.map(f => (
                    <Badge key={f.freq} className={`text-xs ${FREQUENCY_BG[f.freq] ?? 'bg-gray-100 text-gray-800'}`}>
                      {f.count} {f.name.toLowerCase()}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Period Controls */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground font-medium">Period:</span>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                  <SelectItem value="quarter">Quarterly</SelectItem>
                  <SelectItem value="year">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground font-medium">Ahead:</span>
              <Select value={periodsAhead} onValueChange={setPeriodsAhead}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 periods</SelectItem>
                  <SelectItem value="6">6 periods</SelectItem>
                  <SelectItem value="12">12 periods</SelectItem>
                  <SelectItem value="24">24 periods</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Section 2: Trend Chart */}
          {trendChartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Projected Bill Spend
                </CardTitle>
                <CardDescription>
                  Estimated total bills across the next {periodsAhead} {period}s
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={trendChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="billAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis
                      tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
                      tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={52}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone" dataKey="amount" name="Total Bills"
                      stroke="#10b981" strokeWidth={2.5} fill="url(#billAreaGrad)"
                      dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: '#10b981' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>

                {frequencyBreakdown.length > 1 && (
                  <div className="mt-6 border-t pt-4">
                    <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Bills by Frequency</p>
                    <ResponsiveContainer width="100%" height={130}>
                      <BarChart data={frequencyBreakdown} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis hide />
                        <Tooltip formatter={(v: number) => [fmtCurrency(v), 'Total amount']} labelStyle={{ fontSize: 12 }} />
                        <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                          {frequencyBreakdown.map(entry => <Cell key={entry.freq} fill={entry.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Section 3: Summary stats row */}
          {(summary?.averagePerPeriod ?? 0) > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Avg per {summary?.period}</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{fmtCurrency(summary!.averagePerPeriod)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Across {summary!.periodsAhead} {summary!.period}s</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Highest {summary?.period}</CardTitle>
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{fmtCurrency(summary!.highestPeriod.amount)}</div>
                  <p className="text-xs text-muted-foreground mt-1">{summary!.highestPeriod.period}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Lowest {summary?.period}</CardTitle>
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{fmtCurrency(summary!.lowestPeriod.amount)}</div>
                  <p className="text-xs text-muted-foreground mt-1">{summary!.lowestPeriod.period}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Section 4: 60-Day Timeline */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Upcoming Bill Timeline
                  </CardTitle>
                  <CardDescription>
                    {format(timelineStart, 'dd MMM yyyy')} – {format(timelineEnd, 'dd MMM yyyy')}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => setTimelineOffset(o => Math.max(0, o - 1))} disabled={timelineOffset === 0}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setTimelineOffset(o => o + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  {timelineOffset > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setTimelineOffset(0)} className="text-xs">Today</Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {timelineGroups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No bills scheduled in this window</div>
              ) : (
                <div className="relative">
                  <div className="absolute left-[68px] top-0 bottom-0 w-px bg-border" />
                  <div className="space-y-5">
                    {timelineGroups.map(group => {
                      const isToday = isSameDay(group.date, new Date())
                      const isPast = group.date < startOfDay(new Date())
                      const daysFrom = differenceInDays(group.date, startOfDay(new Date()))
                      return (
                        <div key={format(group.date, 'yyyy-MM-dd')} className="flex gap-4">
                          {/* Date column */}
                          <div className="w-[68px] shrink-0 text-right pr-3">
                            <div className={`text-xs font-semibold ${isToday ? 'text-primary' : isPast ? 'text-muted-foreground' : ''}`}>
                              {format(group.date, 'EEE')}
                            </div>
                            <div className={`text-lg font-bold leading-tight ${isToday ? 'text-primary' : isPast ? 'text-muted-foreground' : ''}`}>
                              {format(group.date, 'dd')}
                            </div>
                            <div className="text-xs text-muted-foreground">{format(group.date, 'MMM yy')}</div>
                          </div>
                          {/* Timeline dot */}
                          <div className="relative z-10 shrink-0 pt-1.5">
                            <div className={`h-3 w-3 rounded-full border-2 ${
                              isToday ? 'bg-primary border-primary' :
                              isPast ? 'bg-muted border-muted-foreground/40' :
                              daysFrom <= 7 ? 'bg-red-500 border-red-400' :
                              daysFrom <= 14 ? 'bg-amber-500 border-amber-400' :
                              'bg-emerald-500 border-emerald-400'
                            }`} />
                          </div>
                          {/* Bill cards */}
                          <div className="flex-1 pb-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              {isToday && <Badge variant="outline" className="text-xs text-primary border-primary">Today</Badge>}
                              {!isPast && daysFrom <= 7 && daysFrom > 0 && (
                                <Badge variant="outline" className="text-xs text-red-600 border-red-300">In {daysFrom} day{daysFrom !== 1 ? 's' : ''}</Badge>
                              )}
                              {!isPast && daysFrom > 7 && daysFrom <= 14 && (
                                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">In {daysFrom} days</Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {group.items.map(item => (
                                <button
                                  key={`${item.bill.id}-${format(item.dueDate, 'yyyyMMdd')}`}
                                  onClick={() => setEditingBill(item.bill)}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors hover:bg-muted/60 group ${
                                    isPast ? 'opacity-50 bg-muted/20' : 'bg-card hover:border-primary/40'
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                      {item.bill.name}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="text-sm font-semibold">{fmtCurrency(parseFloat(item.bill.amount))}</span>
                                      <Badge className={`text-xs py-0 ${FREQUENCY_BG[item.bill.frequency] ?? 'bg-gray-100 text-gray-800'}`}>
                                        {item.bill.frequency}
                                      </Badge>
                                      {item.bill.isAutoPay && (
                                        <Badge variant="outline" className="text-xs py-0 text-emerald-700 border-emerald-300">
                                          <Zap className="h-2.5 w-2.5 mr-0.5" />Auto
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground ml-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 5: Tabs */}
          <Tabs defaultValue="projections" className="space-y-4">
            <TabsList>
              <TabsTrigger value="projections">Projections</TabsTrigger>
              <TabsTrigger value="bills">Manage Bills ({bills.length})</TabsTrigger>
            </TabsList>

            {/* Projections Tab */}
            <TabsContent value="projections" className="space-y-4">
              {projections.map((projection) => (
                <Card key={projection.period}>
                  <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <CardTitle>{projection.period}</CardTitle>
                        <CardDescription>
                          {format(new Date(projection.startDate), 'MMM dd')} – {format(new Date(projection.endDate), 'MMM dd, yyyy')}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{fmtCurrency(projection.totalEstimated)}</div>
                        <div className="text-sm text-muted-foreground">{projection.billsCount} bill{projection.billsCount !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {projection.bills.map((bill) => {
                        // Build a synthetic Bill for the helper
                        const syntheticBill: Bill = {
                          id: bill.id, name: bill.name, amount: bill.estimatedAmount.toString(),
                          accountId: '', isActive: true, isAutoPay: bill.isAutoPay, reminderDays: 3,
                          tags: bill.tags, frequency: bill.frequency as Bill['frequency'],
                          dueDay: bill.dueDay, dueDate: bill.dueDate,
                        }
                        const nextDue = calculateNextDueDate(syntheticBill)
                        return (
                          <div key={bill.id} className="p-4 border rounded-lg space-y-3 hover:bg-muted/30 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium">{bill.name}</div>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  <Badge className={FREQUENCY_BG[bill.frequency] ?? 'bg-gray-100 text-gray-800'}>{bill.frequency}</Badge>
                                  {bill.occurrences > 1 && <Badge variant="secondary">× {bill.occurrences}</Badge>}
                                  {bill.isAutoPay && (
                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                      <Zap className="h-3 w-3 mr-1" />Auto Pay
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-xl font-bold">{fmtCurrency(bill.estimatedAmount)}</div>
                                {bill.averageAmount !== bill.estimatedAmount && (
                                  <div className="text-xs text-muted-foreground">avg {fmtCurrency(bill.averageAmount)}</div>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t text-sm">
                              {nextDue && (
                                <div>
                                  <div className="text-xs text-muted-foreground">Next Due</div>
                                  <div className="font-medium">{format(nextDue, 'dd MMM yyyy')}</div>
                                </div>
                              )}
                              {bill.dueDay && (
                                <div>
                                  <div className="text-xs text-muted-foreground">Due Day</div>
                                  <div className="font-medium">Day {bill.dueDay}</div>
                                </div>
                              )}
                              {bill.lastPaidDate && (
                                <div>
                                  <div className="text-xs text-muted-foreground">Last Paid</div>
                                  <div className="font-medium">{format(new Date(bill.lastPaidDate), 'dd MMM yyyy')}</div>
                                </div>
                              )}
                              {bill.lastPaidAmount && (
                                <div>
                                  <div className="text-xs text-muted-foreground">Last Amount</div>
                                  <div className="font-medium">{fmtCurrency(parseFloat(bill.lastPaidAmount))}</div>
                                </div>
                              )}
                            </div>
                            {bill.notes && <div className="pt-2 border-t text-sm text-muted-foreground">{bill.notes}</div>}
                            {bill.tags?.length > 0 && (
                              <div className="flex gap-1 flex-wrap pt-2 border-t">
                                {bill.tags.map((tag, i) => <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>)}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Manage Bills Tab */}
            <TabsContent value="bills" className="space-y-4">
              <div className="grid gap-4">
                {bills.map((bill) => {
                  const nextDue = calculateNextDueDate(bill)
                  const daysUntil = nextDue ? differenceInDays(nextDue, startOfDay(new Date())) : null
                  const isUrgent = daysUntil !== null && daysUntil <= 7

                  return (
                    <Card key={bill.id} className={isUrgent ? 'border-red-200' : ''}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <CardTitle className="text-base">{bill.name}</CardTitle>
                              {isUrgent && (
                                <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
                                  {daysUntil === 0 ? 'Due today' : `Due in ${daysUntil}d`}
                                </Badge>
                              )}
                            </div>
                            {bill.description && <CardDescription className="mt-0.5">{bill.description}</CardDescription>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className={FREQUENCY_BG[bill.frequency] ?? 'bg-gray-100 text-gray-800'}>{bill.frequency}</Badge>
                            {bill.isAutoPay && (
                              <Badge variant="outline" className="text-emerald-700 border-emerald-300">
                                <Zap className="h-3 w-3 mr-1" />Auto
                              </Badge>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditingBill(bill)}>
                                  <Edit className="h-4 w-4 mr-2" />Edit Bill
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600" onClick={() => setDeletingBill(bill)}>
                                  <Trash2 className="h-4 w-4 mr-2" />Delete Bill
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div>
                            <div className="text-xs text-muted-foreground">Amount</div>
                            <div className="font-semibold text-base">{fmtCurrency(parseFloat(bill.amount))}</div>
                          </div>
                          {nextDue && (
                            <div>
                              <div className="text-xs text-muted-foreground">Next Due</div>
                              <div className={`font-semibold ${isUrgent ? 'text-red-600' : ''}`}>{format(nextDue, 'dd MMM yyyy')}</div>
                            </div>
                          )}
                          {bill.lastPaidDate && (
                            <div>
                              <div className="text-xs text-muted-foreground">Last Paid</div>
                              <div className="font-medium">{format(new Date(bill.lastPaidDate), 'dd MMM yyyy')}</div>
                            </div>
                          )}
                          {bill.lastPaidAmount && (
                            <div>
                              <div className="text-xs text-muted-foreground">Last Amount</div>
                              <div className="font-medium">{fmtCurrency(parseFloat(bill.lastPaidAmount))}</div>
                            </div>
                          )}
                        </div>
                        {bill.notes && <p className="text-sm text-muted-foreground mt-3">{bill.notes}</p>}
                        {bill.tags.length > 0 && (
                          <div className="flex gap-1 flex-wrap mt-3">
                            {bill.tags.map((tag, i) => <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>)}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Dialogs */}
      <AddBillDialog open={showAddDialog} onOpenChange={setShowAddDialog} onSuccess={handleBillSuccess} />
      <EditBillDialog
        bill={editingBill} open={!!editingBill}
        onOpenChange={(open) => !open && setEditingBill(null)}
        onSuccess={handleBillSuccess}
      />
      <AlertDialog open={!!deletingBill} onOpenChange={(open) => !open && setDeletingBill(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bill</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deletingBill?.name}&rdquo;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteBill} className="bg-red-600 hover:bg-red-700">Delete Bill</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

