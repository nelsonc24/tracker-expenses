'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { AddBillDialog } from '@/components/add-bill-dialog'
import { EditBillDialog } from '@/components/edit-bill-dialog'
import { CalendarDays, DollarSign, TrendingUp, AlertCircle, Plus, MoreHorizontal, Edit, Trash2 } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { format } from 'date-fns'

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
    isAutoPay: boolean
    lastPaidAmount?: string
    lastPaidDate?: string
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

export default function BillsPage() {
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
    if (initialLoadComplete) {
      fetchProjections()
    }
  }, [fetchProjections, initialLoadComplete])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount)
  }

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case 'weekly': return 'bg-blue-100 text-blue-800'
      case 'biweekly': return 'bg-green-100 text-green-800'
      case 'monthly': return 'bg-purple-100 text-purple-800'
      case 'quarterly': return 'bg-orange-100 text-orange-800'
      case 'yearly': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleBillSuccess = useCallback(() => {
    fetchBills()
    fetchProjections()
  }, [fetchProjections])

  const handleEditBill = (bill: Bill) => {
    setEditingBill(bill)
  }

  const handleDeleteBill = (bill: Bill) => {
    setDeletingBill(bill)
  }

  const confirmDeleteBill = async () => {
    if (!deletingBill) return

    try {
      const response = await fetch(`/api/bills/${deletingBill.id}`, {
        method: 'DELETE',
      })

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

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bills & Projections</h1>
          <p className="text-muted-foreground">
            Manage your recurring bills and project future expenses
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Bill
        </Button>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {summary && summary.totalProjected > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projected</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalProjected)}</div>
              <p className="text-xs text-muted-foreground">
                Next {summary.periodsAhead} {summary.period}s
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average per {summary.period}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.averagePerPeriod)}</div>
              <p className="text-xs text-muted-foreground">
                Across {summary.periodsAhead} {summary.period}s
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Highest {summary.period}</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.highestPeriod.amount)}</div>
              <p className="text-xs text-muted-foreground">
                {summary.highestPeriod.period}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lowest {summary.period}</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.lowestPeriod.amount)}</div>
              <p className="text-xs text-muted-foreground">
                {summary.lowestPeriod.period}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty state when no bills */}
      {bills.length === 0 && !loading && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No bills yet</h3>
              <p className="text-muted-foreground mb-4">
                Start by adding your first recurring bill to see projections and manage your expenses.
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Bill
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      {bills.length > 0 && (
        <div className="flex gap-4 mb-6">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
              <SelectItem value="quarter">Quarterly</SelectItem>
              <SelectItem value="year">Yearly</SelectItem>
            </SelectContent>
          </Select>

          <Select value={periodsAhead} onValueChange={setPeriodsAhead}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Periods ahead" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 periods</SelectItem>
              <SelectItem value="6">6 periods</SelectItem>
              <SelectItem value="12">12 periods</SelectItem>
              <SelectItem value="24">24 periods</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Main Content */}
      {bills.length > 0 && (
        <Tabs defaultValue="projections" className="space-y-4">
          <TabsList>
            <TabsTrigger value="projections">Projections</TabsTrigger>
            <TabsTrigger value="bills">Manage Bills</TabsTrigger>
          </TabsList>

          <TabsContent value="projections" className="space-y-4">
            {projections.map((projection) => (
              <Card key={projection.period}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{projection.period}</CardTitle>
                      <CardDescription>
                        {format(new Date(projection.startDate), 'MMM dd')} - {format(new Date(projection.endDate), 'MMM dd, yyyy')}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{formatCurrency(projection.totalEstimated)}</div>
                      <div className="text-sm text-muted-foreground">{projection.billsCount} bills</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {projection.bills.map((bill) => (
                      <div key={bill.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="font-medium">{bill.name}</div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge className={getFrequencyColor(bill.frequency)}>
                                {bill.frequency}
                              </Badge>
                              {bill.occurrences > 1 && (
                                <span>× {bill.occurrences}</span>
                              )}
                              {bill.isAutoPay && (
                                <Badge variant="outline">Auto Pay</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(bill.estimatedAmount)}</div>
                          {bill.averageAmount !== bill.estimatedAmount && (
                            <div className="text-sm text-muted-foreground">
                              Avg: {formatCurrency(bill.averageAmount)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="bills" className="space-y-4">
            <div className="grid gap-4">
              {bills.map((bill) => (
                <Card key={bill.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{bill.name}</CardTitle>
                        {bill.description && (
                          <CardDescription>{bill.description}</CardDescription>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getFrequencyColor(bill.frequency)}>
                          {bill.frequency}
                        </Badge>
                        {bill.isAutoPay && (
                          <Badge variant="outline">Auto Pay</Badge>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditBill(bill)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Bill
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600" 
                              onClick={() => handleDeleteBill(bill)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Bill
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Amount</div>
                        <div className="font-medium">{formatCurrency(parseFloat(bill.amount))}</div>
                      </div>
                      {bill.dueDate && (
                        <div>
                          <div className="text-sm text-muted-foreground">Next Due</div>
                          <div className="font-medium">{format(new Date(bill.dueDate), 'MMM dd, yyyy')}</div>
                        </div>
                      )}
                      {bill.lastPaidDate && (
                        <div>
                          <div className="text-sm text-muted-foreground">Last Paid</div>
                          <div className="font-medium">{format(new Date(bill.lastPaidDate), 'MMM dd, yyyy')}</div>
                        </div>
                      )}
                      {bill.lastPaidAmount && (
                        <div>
                          <div className="text-sm text-muted-foreground">Last Amount</div>
                          <div className="font-medium">{formatCurrency(parseFloat(bill.lastPaidAmount))}</div>
                        </div>
                      )}
                    </div>
                    {bill.tags.length > 0 && (
                      <div className="mt-4">
                        <div className="flex gap-1 flex-wrap">
                          {bill.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Add Bill Dialog */}
      <AddBillDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={handleBillSuccess}
      />

      {/* Edit Bill Dialog */}
      <EditBillDialog
        bill={editingBill}
        open={!!editingBill}
        onOpenChange={(open) => !open && setEditingBill(null)}
        onSuccess={handleBillSuccess}
      />

      {/* Delete Confirmation Dialog */}
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
            <AlertDialogAction 
              onClick={confirmDeleteBill}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete Bill
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
