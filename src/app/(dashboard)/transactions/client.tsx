"use client"

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
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
  FileText,
  Activity,
  BarChart3
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { BulkOperationsBar } from '@/components/bulk-operations-bar'
import { AdvancedSearch } from '@/components/advanced-search'
import { KeyboardShortcutsHelp } from '@/components/keyboard-shortcuts-help'
import { TransactionTemplates } from '@/components/transaction-templates'
import { MobileTransactionCard } from '@/components/mobile-transaction-card'
import { ActivityAssignmentDialog } from '@/components/activities/activity-assignment-dialog'
import { MobileActionBar } from '@/components/mobile-action-bar'
import { TransactionBreakdownDialog } from '@/components/transaction-breakdown-dialog'
import { useKeyboardShortcuts, KeyboardShortcut, SHORTCUT_CATEGORIES } from '@/hooks/use-keyboard-shortcuts'
import { useResponsive, useMobileOptimizations } from '@/hooks/use-responsive'
import { TransactionTemplate } from '@/lib/validations/templates'

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

type Transaction = {
  id: string
  description: string
  amount: number
  category: string
  categoryId: string | null
  date: string
  account: string
  accountId: string | null
  type?: 'debit' | 'credit' | 'transfer'
  merchant: string
  reference: string
  receiptNumber?: string
  tags: string[]
  notes: string
  balance: number
  activities?: Activity[]
}

type Activity = {
  id: string
  name: string
  description?: string
  color?: string
}
type SortField = 'date' | 'amount' | 'description' | 'category'
type SortDirection = 'asc' | 'desc'

// Props interface for the client component
interface TransactionsPageClientProps {
  transactions: Array<{
    id: string
    description: string
    amount: number
    category: string
    categoryId: string | null
    date: string
    account: string
    accountId: string | null
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
  activities: Array<{
    id: string
    name: string
    description?: string
    color?: string
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
  activities: propActivities,
  loading,
  onTransactionUpdate,
  onTransactionDelete,
  onTransactionCreate
}: TransactionsPageClientProps) {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([])
  const [showActivityAssignmentDialog, setShowActivityAssignmentDialog] = useState(false)
  
    // Update local state when propTransactions changes
  useEffect(() => {
    if (propTransactions.length > 0) {
      const transformedTransactions = propTransactions
        .filter(transaction => transaction && transaction.id) // Filter out invalid transactions
        .map(transaction => ({
          ...transaction,
          merchant: transaction.merchant || '',
          reference: transaction.reference || '',
          balance: 0, // API doesn't provide balance, set to 0
          tags: transaction.tags || [],
          notes: transaction.notes || ''
        }))
      
      // Check for duplicate IDs and log them (filter out undefined/null IDs first)
      const validIds = transformedTransactions
        .map(t => t.id)
        .filter(id => id !== undefined && id !== null && id !== '')
      
      const duplicateIds = validIds.filter((id, index) => validIds.indexOf(id) !== index)
      if (duplicateIds.length > 0) {
        console.warn('Duplicate transaction IDs found:', duplicateIds)
      }
      
      // Check if we filtered out any transactions due to missing IDs
      const filteredCount = propTransactions.length - transformedTransactions.length
      if (filteredCount > 0) {
        console.warn(`Filtered out ${filteredCount} transactions with missing or invalid IDs`)
        console.warn('Sample invalid transaction:', propTransactions.find(t => !t || !t.id))
      }
      
      setTransactions(transformedTransactions)
    } else {
      setTransactions([])
    }
  }, [propTransactions])
  
  // Filter states
  const [categoryFilter, setCategoryFilter] = useState('All Categories')
  const [accountFilter, setAccountFilter] = useState('All Accounts')  
  const [activityFilter, setActivityFilter] = useState('All Activities')
  // const [dateRange, setDateRange] = useState('all')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDetailsDialogOpen, setIsViewDetailsDialogOpen] = useState(false)
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [categoryEditingTransaction, setCategoryEditingTransaction] = useState<Transaction | null>(null)
  const [isActivityAssignDialogOpen, setIsActivityAssignDialogOpen] = useState(false)
  const [activityAssignTransaction, setActivityAssignTransaction] = useState<Transaction | null>(null)
  const [isBreakdownDialogOpen, setIsBreakdownDialogOpen] = useState(false)
  const [breakdownTransaction, setBreakdownTransaction] = useState<Transaction | null>(null)
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  
  // Advanced search state
  const [activeFilters, setActiveFilters] = useState<any>(null)
  const [savedSearches, setSavedSearches] = useState<any[]>([])

  // Load filters from localStorage on mount
  useEffect(() => {
    const savedFilters = localStorage.getItem('transaction-filters')
    if (savedFilters) {
      try {
        setActiveFilters(JSON.parse(savedFilters))
      } catch (error) {
        console.error('Failed to load saved filters:', error)
      }
    }
  }, [])

  // Save filters to localStorage when they change
  useEffect(() => {
    if (activeFilters) {
      localStorage.setItem('transaction-filters', JSON.stringify(activeFilters))
    } else {
      localStorage.removeItem('transaction-filters')
    }
  }, [activeFilters])  // Mobile responsiveness
  const { isMobile, isTablet, screenSize } = useResponsive()
  const { itemsPerPage, showSimplifiedUI, enableSwipeGestures } = useMobileOptimizations()

  // Adjust page size based on screen size
  const responsivePageSize = isMobile ? itemsPerPage : pageSize
  // Get unique merchants for search
  const uniqueMerchants = Array.from(new Set(transactions.map(t => t.merchant).filter(Boolean))) as string[]

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    // First, ensure we only work with transactions that have valid IDs
    const validTransactions = transactions.filter(transaction => 
      transaction && transaction.id && typeof transaction.id === 'string' && transaction.id.trim() !== ''
    )
    
    const filtered = validTransactions.filter(transaction => {
      // Advanced search filters take precedence
      if (activeFilters) {
        // Search query filter
        if (activeFilters.query) {
          const query = activeFilters.query.toLowerCase()
          const searchableText = `${transaction.description} ${transaction.merchant} ${transaction.category} ${transaction.reference}`.toLowerCase()
          if (!searchableText.includes(query)) return false
        }

        // Category filter
        if (activeFilters.categories.length > 0) {
          // Compare category IDs
          if (!transaction.categoryId || !activeFilters.categories.includes(transaction.categoryId)) {
            return false
          }
        }

        // Account filter
        if (activeFilters.accounts.length > 0) {
          // Compare account IDs
          if (!transaction.accountId || !activeFilters.accounts.includes(transaction.accountId)) {
            return false
          }
        }

        // Merchant filter
        if (activeFilters.merchants.length > 0) {
          if (!activeFilters.merchants.includes(transaction.merchant)) {
            return false
          }
        }

        // Amount range filter
        if (activeFilters.amountMin !== null || activeFilters.amountMax !== null) {
          const amount = Math.abs(transaction.amount)
          if (activeFilters.amountMin !== null && amount < activeFilters.amountMin) return false
          if (activeFilters.amountMax !== null && amount > activeFilters.amountMax) return false
        }

        // Date range filter
        if (activeFilters.dateFrom || activeFilters.dateTo) {
          const transactionDate = new Date(transaction.date)
          if (activeFilters.dateFrom && transactionDate < new Date(activeFilters.dateFrom)) return false
          if (activeFilters.dateTo && transactionDate > new Date(activeFilters.dateTo)) return false
        }

        // Transaction type filter
        if (activeFilters.transactionTypes.length > 0) {
          const transactionType = transaction.amount >= 0 ? 'credit' : 'debit'
          if (!activeFilters.transactionTypes.includes(transactionType)) {
            return false
          }
        }

        return true
      }

      // Basic filter dropdowns (when not using advanced search)
      // Category filter
      if (categoryFilter !== 'All Categories' && transaction.category !== categoryFilter) {
        return false
      }

      // Account filter
      if (accountFilter !== 'All Accounts' && transaction.account !== accountFilter) {
        return false
      }

      // Activity filter
      if (activityFilter !== 'All Activities') {
        if (activityFilter === 'No Activity') {
          // Show transactions without any activity assigned
          if (transaction.activities && transaction.activities.length > 0) {
            return false
          }
        } else {
          // Show transactions assigned to the selected activity
          if (!transaction.activities || !transaction.activities.some(activity => activity.name === activityFilter)) {
            return false
          }
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
  }, [transactions, sortField, sortDirection, activeFilters, categoryFilter, accountFilter, activityFilter])

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / responsivePageSize)
  const startIndex = (currentPage - 1) * responsivePageSize
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + responsivePageSize)

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

  // Keyboard shortcuts configuration
  const keyboardShortcuts: KeyboardShortcut[] = [
    // Navigation
    {
      key: 'ArrowUp',
      action: () => {
        if (currentPage > 1) {
          setCurrentPage(currentPage - 1)
        }
      },
      description: 'Go to previous page',
      category: SHORTCUT_CATEGORIES.NAVIGATION
    },
    {
      key: 'ArrowDown', 
      action: () => {
        const totalPages = Math.ceil(filteredTransactions.length / pageSize)
        if (currentPage < totalPages) {
          setCurrentPage(currentPage + 1)
        }
      },
      description: 'Go to next page',
      category: SHORTCUT_CATEGORIES.NAVIGATION
    },
    
    // Search & Filter
    {
      key: 'f',
      ctrlKey: true,
      action: () => {
        // Focus on search input in AdvancedSearch
        const searchInput = document.querySelector('input[placeholder*="search" i]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        }
      },
      description: 'Focus search input',
      category: SHORTCUT_CATEGORIES.SEARCH
    },
    {
      key: 'Escape',
      action: () => {
        // Clear active filters
        setActiveFilters(null)
        // Clear selected transactions
        setSelectedTransactions([])
        // Close edit dialog if open
        setIsEditDialogOpen(false)
        setEditingTransaction(null)
        // Close view details dialog if open
        setIsViewDetailsDialogOpen(false)
        setViewingTransaction(null)
      },
      description: 'Clear filters and selections',
      category: SHORTCUT_CATEGORIES.SEARCH
    },
    
    // Bulk Operations
    {
      key: 'a',
      ctrlKey: true,
      action: () => {
        // Select all visible transactions
        const visibleTransactionIds = paginatedTransactions.map(t => t.id)
        setSelectedTransactions(visibleTransactionIds)
      },
      description: 'Select all visible transactions',
      category: SHORTCUT_CATEGORIES.BULK_OPERATIONS
    },
    {
      key: 'd',
      ctrlKey: true,
      action: () => {
        // Deselect all transactions
        setSelectedTransactions([])
      },
      description: 'Deselect all transactions',
      category: SHORTCUT_CATEGORIES.BULK_OPERATIONS
    },
    
    // Actions
    {
      key: 'n',
      ctrlKey: true,
      action: () => {
        // Focus on add transaction (if implemented)
        console.log('Add new transaction shortcut')
      },
      description: 'Add new transaction',
      category: SHORTCUT_CATEGORIES.ACTIONS
    },
    {
      key: 't',
      ctrlKey: true,
      action: () => {
        // Open templates dialog
        const templatesButton = document.querySelector('button:has(.lucide-file-text)') as HTMLButtonElement
        if (templatesButton) {
          templatesButton.click()
        }
      },
      description: 'Open transaction templates',
      category: SHORTCUT_CATEGORIES.ACTIONS
    },
    {
      key: 'r',
      ctrlKey: true,
      action: () => {
        // Refresh transactions
        window.location.reload()
      },
      description: 'Refresh page',
      category: SHORTCUT_CATEGORIES.ACTIONS
    },
    
    // UI
    {
      key: '?',
      shiftKey: true,
      action: () => {
        // This will be handled by opening the help dialog
        console.log('Show keyboard shortcuts help')
      },
      description: 'Show keyboard shortcuts help',
      category: SHORTCUT_CATEGORIES.UI
    }
  ]

  // Use keyboard shortcuts
  useKeyboardShortcuts({ shortcuts: keyboardShortcuts })

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

  const handleSaveTransaction = async () => {
    if (!editingTransaction) return
    
    try {
      // Find the category ID from the category name
      const selectedCategory = propCategories.find(cat => cat.name === editingTransaction.category)
      const categoryId = selectedCategory ? selectedCategory.id : null
      
      // Find the account ID from the account name  
      const selectedAccount = propAccounts.find(acc => acc.name === editingTransaction.account)
      const accountId = selectedAccount ? selectedAccount.id : null

      const response = await fetch(`/api/transactions/${editingTransaction.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: editingTransaction.description,
          amount: editingTransaction.amount,
          categoryId: categoryId,
          accountId: accountId,
          transactionDate: new Date(editingTransaction.date).toISOString(),
          merchant: editingTransaction.merchant,
          reference: editingTransaction.reference,
          receiptNumber: editingTransaction.receiptNumber,
          notes: editingTransaction.notes,
          tags: editingTransaction.tags
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update transaction')
      }

      // Update the transaction locally to preserve filters
      const updatedTransaction = {
        ...editingTransaction,
        category: editingTransaction.category,
        account: editingTransaction.account
      }
      
      // Handle activity assignments if activities have changed
      if (editingTransaction.activities && editingTransaction.activities.length > 0) {
        try {
          const activityAssignResponse = await fetch('/api/activities/assign', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              transactionIds: [editingTransaction.id],
              activityId: editingTransaction.activities[0].id
            })
          })
          
          if (!activityAssignResponse.ok) {
            console.warn('Failed to assign activity to transaction')
          }
        } catch (error) {
          console.warn('Error assigning activity:', error)
        }
      }
      
      // Update local state
      setTransactions(prev => prev.map(t => 
        t.id === updatedTransaction.id ? updatedTransaction : t
      ))
      
      // Call the callback to update parent state
      if (onTransactionUpdate) {
        onTransactionUpdate(updatedTransaction)
      }

      toast.success('Transaction updated successfully')
      setIsEditDialogOpen(false)
      setEditingTransaction(null)
      
    } catch (error) {
      console.error('Error updating transaction:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update transaction')
    }
  }

  // View transaction details
  const handleViewDetails = (transaction: Transaction) => {
    setViewingTransaction({ ...transaction })
    setIsViewDetailsDialogOpen(true)
  }

  // Handle category click for quick category change
  const handleCategoryClick = (transaction: Transaction) => {
    setCategoryEditingTransaction({ ...transaction })
    setIsCategoryDialogOpen(true)
  }

  // Handle activity assignment click for quick activity assignment
  const handleActivityAssignClick = (transaction: Transaction) => {
    setActivityAssignTransaction({ ...transaction })
    setIsActivityAssignDialogOpen(true)
  }

  // Handle breakdown click to open breakdown dialog
  const handleBreakdownClick = (transaction: Transaction) => {
    // Find the activity associated with this transaction
    const transactionActivity = propActivities.find(activity => 
      // This assumes there's some way to associate activities with transactions
      // You might need to adjust this logic based on your data structure
      true // For now, we'll just use the first activity or let user select
    )
    
    setBreakdownTransaction(transaction)
    setSelectedActivity(transactionActivity || (propActivities.length > 0 ? propActivities[0] : null))
    setIsBreakdownDialogOpen(true)
  }

  // Save category change
  const handleSaveCategoryChange = async (newCategoryName: string) => {
    if (!categoryEditingTransaction) return
    
    try {
      // Find the category ID from the category name
      const selectedCategory = propCategories.find(cat => cat.name === newCategoryName)
      const categoryId = selectedCategory ? selectedCategory.id : null
      
      // Find the account ID from the account name  
      const selectedAccount = propAccounts.find(acc => acc.name === categoryEditingTransaction.account)
      const accountId = selectedAccount ? selectedAccount.id : null

      const requestAmount = typeof categoryEditingTransaction.amount === 'string' 
        ? parseFloat(categoryEditingTransaction.amount) 
        : categoryEditingTransaction.amount

      const response = await fetch(`/api/transactions/${categoryEditingTransaction.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: categoryEditingTransaction.description,
          amount: requestAmount,
          categoryId: categoryId,
          accountId: accountId,
          transactionDate: new Date(categoryEditingTransaction.date).toISOString(),
          merchant: categoryEditingTransaction.merchant,
          reference: categoryEditingTransaction.reference,
          notes: categoryEditingTransaction.notes,
          tags: categoryEditingTransaction.tags
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update transaction category')
      }

      // Use the API response which contains the properly formatted transaction data
      let updatedTransaction
      if (result.success && result.transaction) {
        // Use the transaction data returned from the API (already properly formatted)
        updatedTransaction = {
          ...result.transaction,
          balance: categoryEditingTransaction.balance || 0 // Preserve UI-specific fields
        }
      } else {
        // Fallback to local update, ensuring proper data types
        updatedTransaction = {
          ...categoryEditingTransaction,
          category: newCategoryName,
          amount: Number(categoryEditingTransaction.amount) || 0, // Ensure amount is a number
          merchant: categoryEditingTransaction.merchant || '',
          reference: categoryEditingTransaction.reference || '',
          tags: categoryEditingTransaction.tags || [],
          notes: categoryEditingTransaction.notes || ''
        }
      }
      
      // Update local state
      setTransactions(prev => prev.map(t => 
        t.id === updatedTransaction.id ? updatedTransaction : t
      ))
      
      // Call the callback to update parent state
      if (onTransactionUpdate) {
        onTransactionUpdate(updatedTransaction)
      }

      toast.success('Category updated successfully')
      setIsCategoryDialogOpen(false)
      setCategoryEditingTransaction(null)
      
    } catch (error) {
      console.error('Error updating transaction category:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update category')
    }
  }

  // Save activity assignment
  const handleSaveActivityAssignment = async (activityId: string) => {
    if (!activityAssignTransaction) return
    
    try {
      const response = await fetch('/api/activities/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transactionIds: [activityAssignTransaction.id],
          activityId: activityId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to assign activity to transaction')
      }

      // Update the transaction locally to show the activity assignment
      const selectedActivity = propActivities.find(a => a.id === activityId)
      const updatedTransaction = {
        ...activityAssignTransaction,
        activities: selectedActivity ? [selectedActivity] : []
      }
      
      // Update local state
      setTransactions(prev => prev.map(t => 
        t.id === updatedTransaction.id ? updatedTransaction : t
      ))
      
      // Call the callback to update parent state
      if (onTransactionUpdate) {
        onTransactionUpdate(updatedTransaction)
      }

      toast.success('Activity assigned successfully')
      setIsActivityAssignDialogOpen(false)
      setActivityAssignTransaction(null)
      
    } catch (error) {
      console.error('Error assigning activity:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to assign activity')
    }
  }

  // Duplicate transaction
  const handleDuplicateTransaction = (transaction: Transaction) => {
    const duplicatedTransaction = {
      ...transaction,
      id: `duplicate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate a unique temporary ID
      description: `${transaction.description} (Copy)`,
      date: new Date().toISOString().split('T')[0] // Set to today's date
    }
    
    if (onTransactionCreate) {
      onTransactionCreate(duplicatedTransaction)
      toast.success(`Transaction duplicated successfully`)
    }
  }

  // Delete transaction
  const handleDeleteTransaction = (transaction: Transaction) => {
    if (confirm(`Are you sure you want to delete the transaction "${transaction.description}"?`)) {
      if (onTransactionDelete) {
        onTransactionDelete(transaction.id)
        toast.success(`Transaction deleted successfully`)
      }
    }
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

  const handleImport = () => {
    router.push('/import')
  }

  // Advanced search handlers
  const handleAdvancedSearch = (filters: any) => {
    setActiveFilters(filters)
    setCurrentPage(1) // Reset to first page
  }

  const handleClearFilters = () => {
    setActiveFilters(null)
    setCurrentPage(1)
    localStorage.removeItem('transaction-filters')
  }

  const handleSaveSearch = (search: any) => {
    setSavedSearches(prev => [...prev, search])
  }

  const handleDeleteSearch = (searchId: string) => {
    setSavedSearches(prev => prev.filter(s => s.id !== searchId))
  }

  // Handle template application
  const handleApplyTemplate = async (template: TransactionTemplate, overrides?: any) => {
    try {
      const response = await fetch('/api/templates/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          overrides,
        }),
      })

      if (response.ok) {
        const { transaction, message } = await response.json()
        console.log('Transaction created from template:', transaction)
        
        // In a real app, you would update the transactions list
        // For now, just show a success message
        alert(message || 'Transaction created from template successfully!')
        
        // Optionally trigger a refresh of the transactions list
        if (onTransactionCreate) {
          onTransactionCreate(transaction)
        }
      } else {
        throw new Error('Failed to apply template')
      }
    } catch (error) {
      console.error('Error applying template:', error)
      alert('Failed to create transaction from template')
    }
  }

  // Mobile action handlers
  const handleMobileQuickAdd = () => {
    console.log('Quick add transaction on mobile')
    // Open quick add dialog or navigate to add transaction page
  }

  const handleMobileSearch = () => {
    // Focus search input or open search modal
    const searchInput = document.querySelector('input[placeholder*="search" i]') as HTMLInputElement
    if (searchInput) {
      searchInput.focus()
    }
  }

  const handleMobileFilter = () => {
    // Open advanced search in mobile-friendly mode
    console.log('Open mobile filters')
  }

  const handleMobileTemplates = () => {
    // Open templates in mobile view
    const templatesButton = document.querySelector('button:has(.lucide-file-text)') as HTMLButtonElement
    if (templatesButton) {
      templatesButton.click()
    }
  }

  const handleMobileBulkActions = () => {
    // Open bulk actions sheet
    console.log('Open bulk actions')
  }

  // Calculate summary statistics
  const totalIncome = filteredTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = filteredTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const netAmount = totalIncome - totalExpenses

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Transactions</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
            View and manage all your financial transactions
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleExport} className="flex-1 sm:flex-none">
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button onClick={handleImport} className="flex-1 sm:flex-none">
              <Upload className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              <span className="hidden sm:inline">Import</span>
            </Button>
          </div>
          <div className="hidden sm:flex sm:space-x-2">
            <TransactionTemplates
              categories={propCategories.map(c => c.name)}
              accounts={propAccounts.map(a => a.name)}
              onApplyTemplate={handleApplyTemplate}
            />
            <KeyboardShortcutsHelp shortcuts={keyboardShortcuts} />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Income</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-green-600">
              ${totalIncome.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              From {filteredTransactions.filter(t => t.amount > 0).length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-red-600">
              ${totalExpenses.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              From {filteredTransactions.filter(t => t.amount < 0).length} transactions
            </p>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Net Amount</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-lg sm:text-2xl font-bold",
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

      {/* Quick Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label className="text-xs sm:text-sm font-medium">Category</Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Categories">All Categories</SelectItem>
              {propCategories.map(category => (
                <SelectItem key={category.id} value={category.name}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs sm:text-sm font-medium">Account</Label>
          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Accounts">All Accounts</SelectItem>
              {propAccounts.map(account => (
                <SelectItem key={account.id} value={account.name}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs sm:text-sm font-medium">Activity</Label>
          <Select value={activityFilter} onValueChange={setActivityFilter}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Activities">All Activities</SelectItem>
              <SelectItem value="No Activity">No Activity</SelectItem>
              {propActivities.map(activity => (
                <SelectItem key={activity.id} value={activity.name}>
                  {activity.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs sm:text-sm font-medium opacity-0">Clear</Label>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => {
              setCategoryFilter('All Categories')
              setAccountFilter('All Accounts')
              setActivityFilter('All Activities')
            }}
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Advanced Search */}
      <AdvancedSearch
        onSearch={handleAdvancedSearch}
        onClearFilters={handleClearFilters}
        categories={propCategories}
        accounts={propAccounts}
        merchants={uniqueMerchants}
        savedSearches={savedSearches}
        onSaveSearch={handleSaveSearch}
        onDeleteSearch={handleDeleteSearch}
        currentFilters={activeFilters}
      />

      {/* Enhanced Bulk Operations */}
      <BulkOperationsBar
        selectedTransactionIds={selectedTransactions}
        onClearSelection={() => setSelectedTransactions([])}
        onOperationComplete={() => {
          // Trigger a refresh of transactions data
          console.log('Bulk operation completed, should refresh data')
        }}
        categories={propCategories}
        accounts={propAccounts}
        transactions={filteredTransactions}
      />

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
          {/* Desktop Table View */}
          {!isMobile && (
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
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
                  <TableHead>Receipt #</TableHead>
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
                {paginatedTransactions.map((transaction, index) => (
                  <TableRow key={`${transaction.id}-${index}`}>
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
                      <Badge 
                        variant="secondary" 
                        className="cursor-pointer hover:bg-secondary/80 transition-colors"
                        onClick={() => handleCategoryClick(transaction)}
                      >
                        {transaction.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{transaction.account}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {transaction.receiptNumber || '-'}
                      </div>
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
                          <DropdownMenuItem onClick={() => handleActivityAssignClick(transaction)}>
                            <Activity className="h-4 w-4 mr-2" />
                            Assign Activity
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBreakdownClick(transaction)}>
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Breakdown Expenses
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateTransaction(transaction)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewDetails(transaction)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteTransaction(transaction)}>
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
          )}

          {/* Mobile Cards View */}
          {isMobile && (
            <div className="space-y-4">
              {paginatedTransactions.map((transaction, index) => (
                <MobileTransactionCard
                  key={`${transaction.id}-${index}`}
                  transaction={transaction}
                  isSelected={selectedTransactions.includes(transaction.id)}
                  onSelect={(checked) => handleSelectTransaction(transaction.id, checked)}
                  onEdit={() => handleEditTransaction(transaction)}
                  onDelete={() => handleDeleteTransaction(transaction)}
                  onDuplicate={() => handleDuplicateTransaction(transaction)}
                  onViewDetails={() => handleViewDetails(transaction)}
                  onCategoryClick={() => handleCategoryClick(transaction)}
                />
              ))}
            </div>
          )}

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
              Make changes to this transaction. Click save when you&apos;re done.
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingTransaction(prev => 
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
                    {propCategories.map(category => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-activities">Activities</Label>
                <Select 
                  value={editingTransaction.activities?.[0]?.id || "none"} 
                  onValueChange={(value) => {
                    if (value && value !== "none") {
                      const selectedActivity = propActivities.find(a => a.id === value)
                      setEditingTransaction(prev => 
                        prev ? { ...prev, activities: selectedActivity ? [selectedActivity] : [] } : null
                      )
                    } else {
                      setEditingTransaction(prev => 
                        prev ? { ...prev, activities: [] } : null
                      )
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an activity (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No activity</SelectItem>
                    {propActivities.map(activity => (
                      <SelectItem key={activity.id} value={activity.id}>
                        {activity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Input
                  id="edit-notes"
                  value={editingTransaction.notes || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingTransaction(prev => 
                    prev ? { ...prev, notes: e.target.value } : null
                  )}
                  placeholder="Add notes about this transaction..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-receipt">Receipt Number</Label>
                <Input
                  id="edit-receipt"
                  value={editingTransaction.receiptNumber || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingTransaction(prev => 
                    prev ? { ...prev, receiptNumber: e.target.value } : null
                  )}
                  placeholder="Enter receipt number for reconciliation..."
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

      {/* View Transaction Details Dialog */}
      <Dialog open={isViewDetailsDialogOpen} onOpenChange={setIsViewDetailsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              View detailed information about this transaction.
            </DialogDescription>
          </DialogHeader>
          {viewingTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Date</Label>
                  <p className="text-sm">{formatDate(viewingTransaction.date)}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Amount</Label>
                  <p className={cn(
                    "text-sm font-medium",
                    viewingTransaction.amount >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {viewingTransaction.amount >= 0 ? '+' : '-'}$
                    {Math.abs(viewingTransaction.amount).toLocaleString('en-AU', { 
                      minimumFractionDigits: 2 
                    })}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                <p className="text-sm">{viewingTransaction.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Category</Label>
                  <Badge variant="secondary">{viewingTransaction.category}</Badge>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Account</Label>
                  <p className="text-sm">{viewingTransaction.account}</p>
                </div>
              </div>
              {viewingTransaction.merchant && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Merchant</Label>
                  <p className="text-sm">{viewingTransaction.merchant}</p>
                </div>
              )}
              {viewingTransaction.reference && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Reference</Label>
                  <p className="text-sm">{viewingTransaction.reference}</p>
                </div>
              )}
              {viewingTransaction.receiptNumber && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Receipt Number</Label>
                  <p className="text-sm">{viewingTransaction.receiptNumber}</p>
                </div>
              )}
              {viewingTransaction.notes && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                  <p className="text-sm">{viewingTransaction.notes}</p>
                </div>
              )}
              {viewingTransaction.tags && viewingTransaction.tags.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {viewingTransaction.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDetailsDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setIsViewDetailsDialogOpen(false)
              if (viewingTransaction) {
                handleEditTransaction(viewingTransaction)
              }
            }}>
              Edit Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Category Change Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Category</DialogTitle>
            <DialogDescription>
              Update the category for this transaction.
            </DialogDescription>
          </DialogHeader>
          {categoryEditingTransaction && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Transaction</Label>
                <p className="text-sm text-muted-foreground">{categoryEditingTransaction.description}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(categoryEditingTransaction.date)} • 
                  {categoryEditingTransaction.amount >= 0 ? '+' : '-'}$
                  {Math.abs(categoryEditingTransaction.amount).toLocaleString('en-AU', { 
                    minimumFractionDigits: 2 
                  })}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-select">New Category</Label>
                <Select 
                  defaultValue={categoryEditingTransaction.category}
                  onValueChange={(value) => handleSaveCategoryChange(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {propCategories.map(category => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Activity Assignment Dialog */}
      <Dialog open={isActivityAssignDialogOpen} onOpenChange={setIsActivityAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Activity</DialogTitle>
            <DialogDescription>
              Assign this transaction to an activity.
            </DialogDescription>
          </DialogHeader>
          {activityAssignTransaction && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Transaction</Label>
                <p className="text-sm text-muted-foreground">{activityAssignTransaction.description}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(activityAssignTransaction.date)} • 
                  {activityAssignTransaction.amount >= 0 ? '+' : '-'}$
                  {Math.abs(activityAssignTransaction.amount).toLocaleString('en-AU', { 
                    minimumFractionDigits: 2 
                  })}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="activity-select">Select Activity</Label>
                <Select 
                  defaultValue={activityAssignTransaction.activities?.[0]?.id || "none"}
                  onValueChange={(value) => {
                    if (value && value !== "none") {
                      handleSaveActivityAssignment(value)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an activity..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No activity</SelectItem>
                    {propActivities.map(activity => (
                      <SelectItem key={activity.id} value={activity.id}>
                        {activity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsActivityAssignDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Breakdown Dialog */}
      <TransactionBreakdownDialog
        open={isBreakdownDialogOpen}
        onOpenChange={setIsBreakdownDialogOpen}
        transaction={breakdownTransaction ? {
          id: breakdownTransaction.id,
          amount: breakdownTransaction.amount.toString(),
          description: breakdownTransaction.description,
          date: breakdownTransaction.date
        } : null}
        activity={selectedActivity}
        onSuccess={() => {
          // Optionally refresh transactions or show success message
          setIsBreakdownDialogOpen(false)
          setBreakdownTransaction(null)
          setSelectedActivity(null)
        }}
      />

      {/* Mobile Action Bar */}
      <MobileActionBar
        selectedCount={selectedTransactions.length}
        onQuickAdd={handleMobileQuickAdd}
        onSearch={handleMobileSearch}
        onFilter={handleMobileFilter}
        onExport={handleExport}
        onTemplates={handleMobileTemplates}
        onBulkActions={handleMobileBulkActions}
      />
    </div>
  )
}
