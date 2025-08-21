"use client"

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Search, 
  Filter, 
  Download, 
  Upload,
  MoreHorizontal,
  Edit,
  Trash2,
  Tag,
  Calendar,
  DollarSign,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Eye,
  Copy,
  FileText
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

// Enhanced sample transaction data
const SAMPLE_TRANSACTIONS = [
  {
    id: '1',
    date: '2024-06-15',
    description: 'Woolworths Supermarket',
    amount: -87.45,
    category: 'Groceries',
    account: 'CBA Everyday',
    merchant: 'Woolworths',
    reference: 'EFTPOS 1234',
    balance: 2156.78,
    tags: ['groceries', 'essential'],
    notes: 'Weekly grocery shopping'
  },
  {
    id: '2',
    date: '2024-06-14',
    description: 'Salary Deposit',
    amount: 3200.00,
    category: 'Income',
    account: 'CBA Everyday',
    merchant: 'Company Payroll',
    reference: 'PAY001',
    balance: 2244.23,
    tags: ['salary', 'income'],
    notes: 'Bi-weekly salary'
  },
  {
    id: '3',
    date: '2024-06-13',
    description: 'Netflix Subscription',
    amount: -19.99,
    category: 'Entertainment',
    account: 'CBA Everyday',
    merchant: 'Netflix',
    reference: 'DDS NETFLIX',
    balance: -955.77,
    tags: ['subscription', 'streaming'],
    notes: 'Monthly streaming service'
  },
  {
    id: '4',
    date: '2024-06-12',
    description: 'Shell Fuel',
    amount: -75.20,
    category: 'Transport',
    account: 'CBA Everyday',
    merchant: 'Shell',
    reference: 'EFTPOS 5678',
    balance: -935.78,
    tags: ['fuel', 'transport'],
    notes: 'Fuel for commute'
  },
  {
    id: '5',
    date: '2024-06-11',
    description: 'Uber Ride',
    amount: -28.50,
    category: 'Transport',
    account: 'CBA Everyday',
    merchant: 'Uber',
    reference: 'UBER TRIP',
    balance: -860.58,
    tags: ['rideshare', 'transport'],
    notes: 'Trip to airport'
  },
  {
    id: '6',
    date: '2024-06-10',
    description: 'Interest Earned',
    amount: 12.34,
    category: 'Income',
    account: 'CBA Savings',
    merchant: 'Commonwealth Bank',
    reference: 'INT CREDIT',
    balance: 15420.89,
    tags: ['interest', 'savings'],
    notes: 'Monthly interest payment'
  },
  {
    id: '7',
    date: '2024-06-09',
    description: 'Coles Supermarket',
    amount: -156.78,
    category: 'Groceries',
    account: 'CBA Everyday',
    merchant: 'Coles',
    reference: 'EFTPOS 9012',
    balance: -832.08,
    tags: ['groceries', 'bulk'],
    notes: 'Bulk shopping for household items'
  },
  {
    id: '8',
    date: '2024-06-08',
    description: 'Coffee Shop',
    amount: -5.80,
    category: 'Dining',
    account: 'CBA Everyday',
    merchant: 'Local Cafe',
    reference: 'EFTPOS TAP',
    balance: -675.30,
    tags: ['coffee', 'dining'],
    notes: 'Morning coffee'
  },
  {
    id: '9',
    date: '2024-06-07',
    description: 'ATM Withdrawal',
    amount: -100.00,
    category: 'Cash',
    account: 'CBA Everyday',
    merchant: 'CBA ATM',
    reference: 'ATM WD 123',
    balance: -669.50,
    tags: ['cash', 'withdrawal'],
    notes: 'Weekend cash'
  },
  {
    id: '10',
    date: '2024-06-06',
    description: 'Amazon Purchase',
    amount: -89.99,
    category: 'Shopping',
    account: 'CBA Everyday',
    merchant: 'Amazon',
    reference: 'AMZN ORDER',
    balance: -569.50,
    tags: ['online', 'shopping'],
    notes: 'Office supplies'
  }
]

const CATEGORIES = [
  'All Categories',
  'Income',
  'Groceries', 
  'Entertainment',
  'Transport',
  'Dining',
  'Shopping',
  'Utilities',
  'Healthcare',
  'Cash',
  'Other'
]

const ACCOUNTS = [
  'All Accounts',
  'CBA Everyday',
  'CBA Savings',
  'ANZ Transaction',
  'Westpac Choice'
]

type Transaction = typeof SAMPLE_TRANSACTIONS[0]
type SortField = 'date' | 'amount' | 'description' | 'category'
type SortDirection = 'asc' | 'desc'

// Props interface for the client component
interface TransactionsPageClientProps {
  transactions: Array<{
    id: string
    description: string
    amount: number
    category: string
    date: string
    account: string
    type: 'debit' | 'credit' | 'transfer'
    merchant?: string
    reference?: string
    tags?: string[]
    notes?: string
  }>
  accounts: Array<{
    id: string
    name: string
    institution: string
    accountType: string
    balance: string
  }>
  categories: Array<{
    id: string
    name: string
    color?: string
    icon?: string
  }>
  loading: boolean
  onTransactionUpdate: (transaction: any) => void
  onTransactionDelete: (id: string) => void
  onTransactionCreate: (transaction: any) => void
}

export function TransactionsPageClient({ 
  transactions: propTransactions,
  accounts: propAccounts,
  categories: propCategories,
  loading,
  onTransactionUpdate,
  onTransactionDelete,
  onTransactionCreate
}: TransactionsPageClientProps) {
  const [transactions] = useState<Transaction[]>(SAMPLE_TRANSACTIONS)
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All Categories')
  const [accountFilter, setAccountFilter] = useState('All Accounts')
  const [dateRange, setDateRange] = useState('all')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions.filter(transaction => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const searchableText = `${transaction.description} ${transaction.merchant} ${transaction.category} ${transaction.reference}`.toLowerCase()
        if (!searchableText.includes(query)) return false
      }

      // Category filter
      if (categoryFilter !== 'All Categories' && transaction.category !== categoryFilter) {
        return false
      }

      // Account filter
      if (accountFilter !== 'All Accounts' && transaction.account !== accountFilter) {
        return false
      }

      // Date filter
      if (dateRange !== 'all') {
        const transactionDate = new Date(transaction.date)
        const now = new Date()
        const daysAgo = {
          '7d': 7,
          '30d': 30,
          '90d': 90,
        }[dateRange]
        
        if (daysAgo) {
          const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
          if (transactionDate < cutoffDate) return false
        }
      }

      return true
    })

    // Sort transactions
    filtered.sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      if (sortField === 'date') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      } else if (sortField === 'amount') {
        aValue = Math.abs(aValue)
        bValue = Math.abs(bValue)
      } else {
        aValue = aValue.toString().toLowerCase()
        bValue = bValue.toString().toLowerCase()
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

    return filtered
  }, [transactions, searchQuery, categoryFilter, accountFilter, dateRange, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + pageSize)

  // Selection handlers
  const isAllSelected = selectedTransactions.length === paginatedTransactions.length && paginatedTransactions.length > 0
  const isIndeterminate = selectedTransactions.length > 0 && selectedTransactions.length < paginatedTransactions.length

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTransactions(paginatedTransactions.map(t => t.id))
    } else {
      setSelectedTransactions([])
    }
  }

  const handleSelectTransaction = (transactionId: string, checked: boolean) => {
    if (checked) {
      setSelectedTransactions(prev => [...prev, transactionId])
    } else {
      setSelectedTransactions(prev => prev.filter(id => id !== transactionId))
    }
  }

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Edit transaction
  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction({ ...transaction })
    setIsEditDialogOpen(true)
  }

  const handleSaveTransaction = () => {
    if (!editingTransaction) return
    // Here you would update the transaction in the database
    console.log('Saving transaction:', editingTransaction)
    setIsEditDialogOpen(false)
    setEditingTransaction(null)
  }

  // Bulk operations
  const handleBulkDelete = () => {
    console.log('Deleting transactions:', selectedTransactions)
    setSelectedTransactions([])
  }

  const handleBulkCategorize = (category: string) => {
    console.log('Categorizing transactions:', selectedTransactions, 'to', category)
    setSelectedTransactions([])
  }

  const handleExport = () => {
    console.log('Exporting transactions:', filteredTransactions)
  }

  // Calculate summary statistics
  const totalIncome = filteredTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = filteredTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const netAmount = totalIncome - totalExpenses

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transactions</h1>
          <p className="text-muted-foreground mt-2">
            View and manage all your financial transactions
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalIncome.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              From {filteredTransactions.filter(t => t.amount > 0).length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${totalExpenses.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              From {filteredTransactions.filter(t => t.amount < 0).length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              netAmount >= 0 ? "text-green-600" : "text-red-600"
            )}>
              ${Math.abs(netAmount).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              From {filteredTransactions.length} total transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
            {/* Search */}
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Account Filter */}
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNTS.map(account => (
                  <SelectItem key={account} value={account}>
                    {account}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range Filter */}
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedTransactions.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedTransactions.length} transaction{selectedTransactions.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center space-x-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Tag className="h-4 w-4 mr-2" />
                      Categorize
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Change Category</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {CATEGORIES.slice(1).map(category => (
                      <DropdownMenuItem 
                        key={category}
                        onClick={() => handleBulkCategorize(category)}
                      >
                        {category}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="sm" onClick={handleBulkDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedTransactions([])}>
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Transactions ({filteredTransactions.length})
          </CardTitle>
          <CardDescription>
            {filteredTransactions.length === transactions.length 
              ? 'Showing all transactions'
              : `Showing ${filteredTransactions.length} of ${transactions.length} transactions`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={isIndeterminate}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('date')}
                      className="h-auto p-0 font-medium"
                    >
                      Date
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('description')}
                      className="h-auto p-0 font-medium"
                    >
                      Description
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('category')}
                      className="h-auto p-0 font-medium"
                    >
                      Category
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('amount')}
                      className="h-auto p-0 font-medium"
                    >
                      Amount
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedTransactions.includes(transaction.id)}
                        onCheckedChange={(checked) => 
                          handleSelectTransaction(transaction.id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {formatDate(transaction.date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{transaction.description}</div>
                        <div className="text-sm text-muted-foreground">
                          {transaction.merchant} • {transaction.reference}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {transaction.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{transaction.account}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className={cn(
                        "font-medium",
                        transaction.amount >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {transaction.amount >= 0 ? '+' : '-'}$
                        {Math.abs(transaction.amount).toLocaleString('en-AU', { 
                          minimumFractionDigits: 2 
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditTransaction(transaction)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(startIndex + pageSize, filteredTransactions.length)} of {filteredTransactions.length} transactions
              </div>
              <div className="flex items-center space-x-2">
                <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Transaction Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>
              Make changes to this transaction. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          {editingTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-date">Date</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={editingTransaction.date}
                    onChange={(e) => setEditingTransaction(prev => 
                      prev ? { ...prev, date: e.target.value } : null
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-amount">Amount</Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    step="0.01"
                    value={editingTransaction.amount}
                    onChange={(e) => setEditingTransaction(prev => 
                      prev ? { ...prev, amount: Number(e.target.value) } : null
                    )}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={editingTransaction.description}
                  onChange={(e) => setEditingTransaction(prev => 
                    prev ? { ...prev, description: e.target.value } : null
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select 
                  value={editingTransaction.category} 
                  onValueChange={(value) => setEditingTransaction(prev => 
                    prev ? { ...prev, category: value } : null
                  )}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.slice(1).map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={editingTransaction.notes || ''}
                  onChange={(e) => setEditingTransaction(prev => 
                    prev ? { ...prev, notes: e.target.value } : null
                  )}
                  placeholder="Add notes about this transaction..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTransaction}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
