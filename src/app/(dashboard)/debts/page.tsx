'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react'
import { AddDebtDialog } from '@/components/add-debt-dialog'
import { LogPaymentDialog } from '@/components/log-payment-dialog'
import { EditDebtDialog } from '@/components/edit-debt-dialog'
import { DebtTable } from '@/components/debt-table'
import { DebtStats } from '@/components/debt-stats'
import { toast } from 'sonner'

interface DebtStats {
  totalDebt: string
  totalMonthlyPayments: string
  avgInterestRate: string
  activeDebtCount: number
  debtByType: Record<string, { count: number; total: number }>
  debtByRate: { low: number; medium: number; high: number; veryHigh: number }
  totalInterestPaidYTD: string
  projectedAnnualInterest: string
  totalPaymentsLogged: number
  highestInterestDebt: unknown
  largestDebt: unknown
}

export default function DebtsPage() {
  const searchParams = useSearchParams()
  const [debts, setDebts] = useState([])
  const [stats, setStats] = useState<DebtStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState<Record<string, unknown> | null>(null)

  // Check for action=add query parameter
  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setShowAddDialog(true)
    }
  }, [searchParams])

  const fetchDebts = useCallback(async () => {
    try {
      const response = await fetch('/api/debts')
      if (!response.ok) throw new Error('Failed to fetch debts')
      const data = await response.json()
      setDebts(data)
    } catch (error) {
      console.error('Error fetching debts:', error)
      toast.error('Failed to load debts. Please try again.')
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/debts/stats')
      if (!response.ok) throw new Error('Failed to fetch stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([fetchDebts(), fetchStats()])
      setIsLoading(false)
    }
    loadData()
  }, [fetchDebts, fetchStats])

  const handleDebtAdded = () => {
    fetchDebts()
    fetchStats()
    setShowAddDialog(false)
    toast.success('Your debt has been added successfully.')
  }

  const handleDebtUpdated = () => {
    fetchDebts()
    fetchStats()
  }

  const handleDebtDeleted = () => {
    fetchDebts()
    fetchStats()
    toast.success('Your debt has been deleted successfully.')
  }

  const handleEditDebt = (debt: { id: string; name: string }) => {
    setSelectedDebt(debt)
    setShowEditDialog(true)
  }

  const handleLogPayment = (debt: { id: string; name: string; currentBalance: string; minimumPayment: string; creditorName: string }) => {
    setSelectedDebt(debt)
    setShowPaymentDialog(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading debts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Debt Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Track all your debts and create a payoff strategy
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add Debt
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Debt</CardTitle>
              <DollarSign className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-destructive">
                ${parseFloat(stats.totalDebt).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.activeDebtCount} active {stats.activeDebtCount === 1 ? 'debt' : 'debts'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Monthly Payments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                ${parseFloat(stats.totalMonthlyPayments).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Minimum payments due
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Avg. Interest Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {parseFloat(stats.avgInterestRate).toFixed(2)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Weighted average APR
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Interest (YTD)</CardTitle>
              <TrendingDown className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                ${parseFloat(stats.totalInterestPaidYTD).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Paid this year
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* No debts state */}
      {debts.length === 0 && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No debts tracked yet</CardTitle>
            <CardDescription>
              Get started by adding your first debt to track your payoff journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Debt
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Debt Table */}
      {debts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Debts</CardTitle>
            <CardDescription>
              Manage and track all your debt accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DebtTable
              debts={debts}
              onUpdate={handleDebtUpdated}
              onDelete={handleDebtDeleted}
              onEdit={handleEditDebt}
              onLogPayment={handleLogPayment}
            />
          </CardContent>
        </Card>
      )}

      {/* Detailed Stats */}
      {stats && debts.length > 0 && (
        <DebtStats stats={stats} debts={debts} />
      )}

      {/* Add Debt Dialog */}
      <AddDebtDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onDebtAdded={handleDebtAdded}
      />

      {/* Log Payment Dialog */}
      <LogPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        debt={selectedDebt as { id: string; name: string; creditorName: string; currentBalance: string; minimumPayment: string } | null}
        onPaymentLogged={handleDebtUpdated}
      />

      {/* Edit Debt Dialog */}
      <EditDebtDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        debt={selectedDebt as { id: string; name: string; debtType: string; creditorName: string; currentBalance: string; interestRate: string; minimumPayment: string; paymentFrequency: string; paymentDueDay?: number | null; status: string } | null}
        onDebtUpdated={handleDebtUpdated}
      />
    </div>
  )
}
