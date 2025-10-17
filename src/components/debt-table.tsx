'use client'

import { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MoreHorizontal, Pencil, Trash2, DollarSign, Filter, TrendingUp, History } from 'lucide-react'
import { toast } from 'sonner'
import { DebtDetailsDialog } from '@/components/debt-details-dialog'

interface Debt {
  id: string
  name: string
  debtType: string
  creditorName: string
  currentBalance: string
  originalBalance?: string
  interestRate: string
  minimumPayment: string
  paymentFrequency: string
  paymentDueDay?: number | null
  status: string
  nextDueDate: string | null
  createdAt?: string
  updatedAt?: string
}

interface DebtTableProps {
  debts: Debt[]
  onUpdate: () => void
  onDelete: () => void
  onEdit?: (debt: Debt) => void
  onLogPayment?: (debt: Debt) => void
  onViewPayments?: (debt: Debt) => void
}

const DEBT_TYPE_LABELS: Record<string, string> = {
  credit_card: 'Credit Card',
  personal_loan: 'Personal Loan',
  student_loan: 'Student Loan',
  mortgage: 'Mortgage',
  car_loan: 'Car Loan',
  medical: 'Medical',
  personal: 'Personal',
  line_of_credit: 'Line of Credit',
  bnpl: 'BNPL',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'default',
  paid_off: 'secondary',
  in_collections: 'destructive',
  settled: 'outline',
  archived: 'outline',
}

const STATUS_LABELS: Record<string, string> = {
  all: 'All Statuses',
  active: 'Active',
  paid_off: 'Paid Off',
  in_collections: 'In Collections',
  settled: 'Settled',
  archived: 'Archived',
}

export function DebtTable({ debts, onDelete, onEdit, onLogPayment, onViewPayments }: DebtTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [debtToDelete, setDebtToDelete] = useState<Debt | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('active')
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null)

  const handleDeleteClick = (debt: Debt) => {
    setDebtToDelete(debt)
    setShowDeleteDialog(true)
  }

  const handleViewDetails = (debt: Debt) => {
    setSelectedDebt(debt)
    setShowDetailsDialog(true)
  }

  const handleEditFromDetails = () => {
    setShowDetailsDialog(false)
    if (selectedDebt && onEdit) {
      onEdit(selectedDebt)
    }
  }

  const confirmDelete = async () => {
    if (!debtToDelete) return

    setDeletingId(debtToDelete.id)
    try {
      const response = await fetch(`/api/debts/${debtToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete debt')
      }

      toast.success('Debt deleted successfully')
      onDelete()
      setShowDeleteDialog(false)
      setDebtToDelete(null)
    } catch (error) {
      console.error('Error deleting debt:', error)
      toast.error('Failed to delete debt')
    } finally {
      setDeletingId(null)
    }
  }

  const formatCurrency = (value: string) => {
    return `$${parseFloat(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  // Filter debts by status
  const filteredDebts = useMemo(() => {
    if (statusFilter === 'all') {
      return debts
    }
    return debts.filter(debt => debt.status === statusFilter)
  }, [debts, statusFilter])

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Status:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paid_off">Paid Off</SelectItem>
              <SelectItem value="in_collections">In Collections</SelectItem>
              <SelectItem value="settled">Settled</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {filteredDebts.length} of {debts.length} {debts.length === 1 ? 'debt' : 'debts'}
        </div>
      </div>

      {/* Empty State */}
      {filteredDebts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {statusFilter === 'all' 
            ? 'No debts found' 
            : `No ${STATUS_LABELS[statusFilter]?.toLowerCase() || statusFilter} debts found`}
        </div>
      )}

      {/* Desktop Table View - Hidden on mobile and small tablets */}
      {filteredDebts.length > 0 && (
        <div className="hidden lg:block rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Debt Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Creditor</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Interest Rate</TableHead>
                <TableHead className="text-right">Min. Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDebts.map((debt) => (
                <TableRow key={debt.id}>
                  <TableCell className="font-medium">
                    <button
                      onClick={() => handleViewDetails(debt)}
                      className="text-left hover:underline hover:text-primary transition-colors"
                    >
                      {debt.name}
                    </button>
                  </TableCell>
                  <TableCell>{DEBT_TYPE_LABELS[debt.debtType] || debt.debtType}</TableCell>
                  <TableCell>{debt.creditorName}</TableCell>
                  <TableCell className="text-right font-mono text-destructive">
                    {formatCurrency(debt.currentBalance)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {parseFloat(debt.interestRate).toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(debt.minimumPayment)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={(STATUS_COLORS[debt.status] || 'default') as 'default' | 'secondary' | 'destructive' | 'outline'}>
                      {debt.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onLogPayment?.(debt)}>
                          <DollarSign className="mr-2 h-4 w-4" />
                          Log Payment
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onViewPayments?.(debt)}>
                          <History className="mr-2 h-4 w-4" />
                          View Payments
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit?.(debt)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteClick(debt)}
                          disabled={deletingId === debt.id}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Tablet Compact Table View - Shown on medium screens */}
      {filteredDebts.length > 0 && (
        <div className="hidden md:block lg:hidden rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Debt Name</TableHead>
                <TableHead className="min-w-[120px]">Creditor</TableHead>
                <TableHead className="text-right min-w-[100px]">Balance</TableHead>
                <TableHead className="text-right min-w-[80px]">Rate</TableHead>
                <TableHead className="min-w-[80px]">Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDebts.map((debt) => (
                <TableRow key={debt.id}>
                  <TableCell>
                    <button
                      onClick={() => handleViewDetails(debt)}
                      className="text-left hover:underline hover:text-primary transition-colors"
                    >
                      <div className="font-medium">{debt.name}</div>
                    </button>
                    <div className="text-xs text-muted-foreground">{DEBT_TYPE_LABELS[debt.debtType] || debt.debtType}</div>
                  </TableCell>
                  <TableCell className="text-sm">{debt.creditorName}</TableCell>
                  <TableCell className="text-right">
                    <div className="font-mono text-destructive font-semibold">
                      {formatCurrency(debt.currentBalance)}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      Min: {formatCurrency(debt.minimumPayment)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {parseFloat(debt.interestRate).toFixed(2)}%
                  </TableCell>
                  <TableCell>
                    <Badge variant={(STATUS_COLORS[debt.status] || 'default') as 'default' | 'secondary' | 'destructive' | 'outline'} className="text-xs">
                      {debt.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onLogPayment?.(debt)}>
                          <DollarSign className="mr-2 h-4 w-4" />
                          Log Payment
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onViewPayments?.(debt)}>
                          <History className="mr-2 h-4 w-4" />
                          View Payments
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit?.(debt)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteClick(debt)}
                          disabled={deletingId === debt.id}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Mobile Card View - Hidden on tablets and desktop */}
      {filteredDebts.length > 0 && (
        <div className="md:hidden space-y-3">
          {filteredDebts.map((debt) => (
            <Card key={debt.id} className="overflow-hidden">
              <CardContent className="p-4">
                {/* Header with Name and Actions */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => handleViewDetails(debt)}
                      className="text-left w-full"
                    >
                      <h3 className="font-semibold text-base truncate hover:text-primary transition-colors">{debt.name}</h3>
                    </button>
                    <p className="text-sm text-muted-foreground">{debt.creditorName}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 -mt-1">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onLogPayment?.(debt)}>
                        <DollarSign className="mr-2 h-4 w-4" />
                        Log Payment
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onViewPayments?.(debt)}>
                        <History className="mr-2 h-4 w-4" />
                        View Payments
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit?.(debt)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDeleteClick(debt)}
                        disabled={deletingId === debt.id}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Balance - Prominent Display */}
                <div className="mb-3 pb-3 border-b">
                  <div className="text-xs text-muted-foreground mb-1">Current Balance</div>
                  <div className="text-2xl font-bold text-destructive font-mono">
                    {formatCurrency(debt.currentBalance)}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Type</div>
                    <div className="font-medium">{DEBT_TYPE_LABELS[debt.debtType] || debt.debtType}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Status</div>
                    <Badge variant={(STATUS_COLORS[debt.status] || 'default') as 'default' | 'secondary' | 'destructive' | 'outline'}>
                      {debt.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Interest Rate</div>
                    <div className="font-medium font-mono flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-orange-500" />
                      {parseFloat(debt.interestRate).toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Min. Payment</div>
                    <div className="font-medium font-mono">{formatCurrency(debt.minimumPayment)}</div>
                  </div>
                </div>

                {/* Quick Actions - Mobile Only */}
                <div className="flex gap-2 mt-4 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => onLogPayment?.(debt)}
                  >
                    <DollarSign className="mr-1 h-3 w-3" />
                    Log Payment
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => onViewPayments?.(debt)}
                  >
                    <History className="mr-1 h-3 w-3" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => onEdit?.(debt)}
                  >
                    <Pencil className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Debt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{debtToDelete?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteDialog(false)
              setDebtToDelete(null)
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Debt Details Dialog */}
      <DebtDetailsDialog
        debt={selectedDebt}
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        onEdit={handleEditFromDetails}
      />
    </div>
  )
}
