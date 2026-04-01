'use client'

import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Download, Settings2, CalendarDays } from 'lucide-react'
import { toast } from 'sonner'
import { TaxSummaryCards } from '@/components/tax-summary-cards'
import { TaxSettingsDialog } from '@/components/tax-settings-dialog'
import { WfhTrackerCard } from '@/components/wfh-tracker-card'
import { SuperContributionsCard } from '@/components/super-contributions-card'
import { TaxDeductionsTable } from '@/components/tax-deductions-table'

// ---- Types ----------------------------------------------------------------

interface WfhLog {
  id: string
  logDate: string
  hours: string
  notes: string | null
}

interface TaxSummary {
  financialYear: string
  deductions: {
    total: number
    transactionCount: number
    byCategory: { category: string; label: string; total: number; count: number }[]
  }
  wfh: {
    totalHours: number
    deduction: number
    ratePerHour: number
    logCount: number
  }
  super: {
    employerSG: number
    salarySacrifice: number
    personalContributions: number
    totalConcessional: number
    cap: number
    capRemaining: number
    capExceeded: boolean
  }
  taxEstimate: {
    hasData: boolean
    annualSalary: number | null
    marginalRate: number
    taxWithoutDeductions: number
    taxWithDeductions: number
    estimatedSaving: number
  }
}

interface DeductibleTransaction {
  id: string
  description: string
  merchant: string | null
  amount: string
  transactionDate: string
  taxCategory: string | null
}

// ---- Helpers ---------------------------------------------------------------

function daysUntilEoFY(): number {
  const today = new Date()
  const eoy = new Date('2026-06-30T23:59:59')
  const diff = eoy.getTime() - today.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

// ---- Page ------------------------------------------------------------------

export default function TaxReturnPage() {
  const [summary, setSummary] = useState<TaxSummary | null>(null)
  const [wfhLogs, setWfhLogs] = useState<WfhLog[]>([])
  const [deductibleTransactions, setDeductibleTransactions] = useState<DeductibleTransaction[]>([])
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [loadingTxns, setLoadingTxns] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  const daysLeft = daysUntilEoFY()

  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true)
    try {
      const res = await fetch('/api/tax/summary')
      if (!res.ok) throw new Error('Failed to fetch summary')
      setSummary(await res.json())
    } catch {
      toast.error('Failed to load tax summary')
    } finally {
      setLoadingSummary(false)
    }
  }, [])

  const fetchWfhLogs = useCallback(async () => {
    setLoadingLogs(true)
    try {
      const res = await fetch('/api/tax/wfh-logs')
      if (!res.ok) throw new Error('Failed to fetch WFH logs')
      setWfhLogs(await res.json())
    } catch {
      toast.error('Failed to load WFH logs')
    } finally {
      setLoadingLogs(false)
    }
  }, [])

  const fetchTransactions = useCallback(async () => {
    setLoadingTxns(true)
    try {
      const res = await fetch('/api/transactions?limit=10000')
      if (!res.ok) throw new Error('Failed to fetch transactions')
      const all: Array<{
        id: string
        description: string
        merchant?: string
        amount: number
        date: string
        taxDeductible?: boolean
        taxCategory?: string | null
      }> = await res.json()

      setDeductibleTransactions(
        all
          .filter((t) => t.taxDeductible)
          .map((t) => ({
            id: t.id,
            description: t.description,
            merchant: t.merchant ?? null,
            amount: t.amount.toString(),
            transactionDate: t.date,
            taxCategory: t.taxCategory ?? null,
          }))
      )
    } catch {
      toast.error('Failed to load transactions')
    } finally {
      setLoadingTxns(false)
    }
  }, [])

  useEffect(() => {
    fetchSummary()
    fetchWfhLogs()
    fetchTransactions()
  }, [fetchSummary, fetchWfhLogs, fetchTransactions])

  async function handleExport() {
    setExportLoading(true)
    try {
      const res = await fetch('/api/tax/export')
      if (!res.ok) throw new Error('Failed to generate export')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'tax-return-fy2025-26.csv'
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('CSV exported successfully')
    } catch {
      toast.error('Failed to export CSV')
    } finally {
      setExportLoading(false)
    }
  }

  function handleRefreshAll() {
    fetchSummary()
    fetchWfhLogs()
    fetchTransactions()
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              Tax Return FY 2025-26
            </h1>
            <p className="text-sm text-muted-foreground">Australian Tax Office preparation</p>
          </div>
          <Badge variant="outline" className="hidden gap-1.5 sm:flex">
            <CalendarDays className="h-3.5 w-3.5" />
            {daysLeft > 0 ? `${daysLeft} days until 30 Jun 2026` : 'FY ended'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettingsOpen(true)}
            className="gap-1.5"
          >
            <Settings2 className="h-4 w-4" />
            Settings
          </Button>
          <Button
            size="sm"
            onClick={handleExport}
            disabled={exportLoading}
            className="gap-1.5"
          >
            <Download className="h-4 w-4" />
            {exportLoading ? 'Exporting…' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Mobile days badge */}
      <div className="sm:hidden">
        <Badge variant="outline" className="gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" />
          {daysLeft > 0 ? `${daysLeft} days until 30 Jun 2026` : 'FY ended'}
        </Badge>
      </div>

      {/* Summary cards */}
      <TaxSummaryCards summary={summary} loading={loadingSummary} />

      {/* Main grid */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Left column — WFH + Super */}
        <div className="space-y-4 lg:col-span-2">
          <WfhTrackerCard
            logs={wfhLogs}
            onRefresh={() => {
              fetchWfhLogs()
              fetchSummary()
            }}
          />
          <SuperContributionsCard
            data={
              summary && summary.taxEstimate.hasData
                ? summary.super
                : null
            }
            loading={loadingSummary}
          />
        </div>

        {/* Right column — Deductions table */}
        <div className="lg:col-span-3">
          <TaxDeductionsTable
            transactions={deductibleTransactions}
            onRefresh={() => {
              fetchTransactions()
              fetchSummary()
            }}
          />
        </div>
      </div>

      {/* ATO disclaimer */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
        <strong>Disclaimer:</strong> Tax estimates are based on ATO 2025-26 brackets and standard offsets (LITO, Medicare levy). They do not account for HELP/HECS debt, SAPTO, Medicare Levy Surcharge, spouse offsets, or other individual circumstances. Verify all figures with a registered tax agent or myTax before lodging. Super figures are projections based on the inputs you entered — check your fund statements for actual contributions.
      </div>

      {/* Settings dialog */}
      <TaxSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSaved={() => {
          setSettingsOpen(false)
          fetchSummary()
        }}
      />
    </div>
  )
}
