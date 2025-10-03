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
import { MoreHorizontal, Pencil, Trash2, DollarSign, Filter } from 'lucide-react'
import { toast } from 'sonner'

interface Debt {
  id: string
  name: string
  debtType: string
  creditorName: string
  currentBalance: string
  interestRate: string
  minimumPayment: string
  status: string
  nextDueDate: string | null
}

interface DebtTableProps {
  debts: Debt[]
  onUpdate: () => void
  onDelete: () => void
  onEdit?: (debt: Debt) => void
  onLogPayment?: (debt: Debt) => void
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

export function DebtTable({ debts, onDelete, onEdit, onLogPayment }: DebtTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [debtToDelete, setDebtToDelete] = useState<Debt | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('active')

  const handleDeleteClick = (debt: Debt) => {
    setDebtToDelete(debt)
    setShowDeleteDialog(true)
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Status:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
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

      {/* Table */}
      <div className="rounded-md border">
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
          {filteredDebts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                {statusFilter === 'all' 
                  ? 'No debts found' 
                  : `No ${STATUS_LABELS[statusFilter]?.toLowerCase() || statusFilter} debts found`}
              </TableCell>
            </TableRow>
          ) : (
            filteredDebts.map((debt) => (
              <TableRow key={debt.id}>
                <TableCell className="font-medium">{debt.name}</TableCell>
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
            ))
          )}
        </TableBody>
      </Table>
      </div>

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
    </div>
  )
}
