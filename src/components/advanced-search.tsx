"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Search, 
  Filter, 
  X,
  Calendar,
  DollarSign,
  Tag,
  CreditCard,
  Building2,
  Save,
  Bookmark,
  RotateCcw
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchFilter {
  id: string
  name: string
  query: string
  categories: string[]
  accounts: string[]
  merchants: string[]
  amountMin: number | null
  amountMax: number | null
  dateFrom: string | null
  dateTo: string | null
  transactionTypes: string[]
}

interface AdvancedSearchProps {
  onSearch: (filters: SearchFilter) => void
  onClearFilters: () => void
  categories: Array<{
    id: string
    name: string
    color?: string
  }>
  accounts: Array<{
    id: string
    name: string
    institution?: string
  }>
  merchants: string[]
  savedSearches: SearchFilter[]
  onSaveSearch: (search: SearchFilter) => void
  onDeleteSearch: (searchId: string) => void
  currentFilters?: SearchFilter | null // Add prop for current active filters
}

const TRANSACTION_TYPES = [
  { value: 'debit', label: 'Debit', description: 'Money going out' },
  { value: 'credit', label: 'Credit', description: 'Money coming in' },
  { value: 'transfer', label: 'Transfer', description: 'Between accounts' },
]

const AMOUNT_PRESETS = [
  { label: 'Under $10', min: null, max: 10 },
  { label: '$10 - $50', min: 10, max: 50 },
  { label: '$50 - $100', min: 50, max: 100 },
  { label: '$100 - $500', min: 100, max: 500 },
  { label: 'Over $500', min: 500, max: null },
]

const DATE_PRESETS = [
  { label: 'Today', days: 0 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'This year', days: 365 },
]

export function AdvancedSearch({
  onSearch,
  onClearFilters,
  categories,
  accounts,
  merchants,
  savedSearches,
  onSaveSearch,
  onDeleteSearch,
  currentFilters
}: AdvancedSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [searchName, setSearchName] = useState('')
  
  // Filter state
  const [query, setQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [selectedMerchants, setSelectedMerchants] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [amountMin, setAmountMin] = useState<number | null>(null)
  const [amountMax, setAmountMax] = useState<number | null>(null)
  const [dateFrom, setDateFrom] = useState<string | null>(null)
  const [dateTo, setDateTo] = useState<string | null>(null)

  // Restore filter state when currentFilters changes
  useEffect(() => {
    if (currentFilters) {
      setQuery(currentFilters.query || '')
      setSelectedCategories(currentFilters.categories || [])
      setSelectedAccounts(currentFilters.accounts || [])
      setSelectedMerchants(currentFilters.merchants || [])
      setSelectedTypes(currentFilters.transactionTypes || [])
      setAmountMin(currentFilters.amountMin)
      setAmountMax(currentFilters.amountMax)
      setDateFrom(currentFilters.dateFrom)
      setDateTo(currentFilters.dateTo)
    } else {
      // Clear all filters when no current filters
      setQuery('')
      setSelectedCategories([])
      setSelectedAccounts([])
      setSelectedMerchants([])
      setSelectedTypes([])
      setAmountMin(null)
      setAmountMax(null)
      setDateFrom(null)
      setDateTo(null)
    }
  }, [currentFilters])

  // Quick search state
  const [quickSearch, setQuickSearch] = useState('')

  const hasActiveFilters = 
    query ||
    selectedCategories.length > 0 ||
    selectedAccounts.length > 0 ||
    selectedMerchants.length > 0 ||
    selectedTypes.length > 0 ||
    amountMin !== null ||
    amountMax !== null ||
    dateFrom ||
    dateTo

  const activeFilterCount = [
    query ? 1 : 0,
    selectedCategories.length,
    selectedAccounts.length,
    selectedMerchants.length,
    selectedTypes.length,
    amountMin !== null || amountMax !== null ? 1 : 0,
    dateFrom || dateTo ? 1 : 0,
  ].reduce((sum, count) => sum + count, 0)

  const handleSearch = () => {
    const filters: SearchFilter = {
      id: Date.now().toString(),
      name: searchName || 'Unnamed Search',
      query,
      categories: selectedCategories,
      accounts: selectedAccounts,
      merchants: selectedMerchants,
      amountMin,
      amountMax,
      dateFrom,
      dateTo,
      transactionTypes: selectedTypes,
    }
    onSearch(filters)
    setIsOpen(false)
  }

  const handleQuickSearch = (searchQuery: string) => {
    const filters: SearchFilter = {
      id: Date.now().toString(),
      name: 'Quick Search',
      query: searchQuery,
      categories: [],
      accounts: [],
      merchants: [],
      amountMin: null,
      amountMax: null,
      dateFrom: null,
      dateTo: null,
      transactionTypes: [],
    }
    onSearch(filters)
  }

  const handleClearFilters = () => {
    setQuery('')
    setSelectedCategories([])
    setSelectedAccounts([])
    setSelectedMerchants([])
    setSelectedTypes([])
    setAmountMin(null)
    setAmountMax(null)
    setDateFrom(null)
    setDateTo(null)
    setQuickSearch('')
    onClearFilters()
  }

  const handleAmountPreset = (min: number | null, max: number | null) => {
    setAmountMin(min)
    setAmountMax(max)
  }

  const handleDatePreset = (days: number) => {
    const now = new Date()
    const pastDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    
    if (days === 0) {
      // Today only
      setDateFrom(now.toISOString().split('T')[0])
      setDateTo(now.toISOString().split('T')[0])
    } else {
      setDateFrom(pastDate.toISOString().split('T')[0])
      setDateTo(now.toISOString().split('T')[0])
    }
  }

  const handleSaveSearch = () => {
    if (!searchName.trim()) return

    const searchFilter: SearchFilter = {
      id: Date.now().toString(),
      name: searchName,
      query,
      categories: selectedCategories,
      accounts: selectedAccounts,
      merchants: selectedMerchants,
      amountMin,
      amountMax,
      dateFrom,
      dateTo,
      transactionTypes: selectedTypes,
    }

    onSaveSearch(searchFilter)
    setSaveDialogOpen(false)
    setSearchName('')
  }

  const loadSavedSearch = (search: SearchFilter) => {
    setQuery(search.query)
    setSelectedCategories(search.categories)
    setSelectedAccounts(search.accounts)
    setSelectedMerchants(search.merchants)
    setSelectedTypes(search.transactionTypes)
    setAmountMin(search.amountMin)
    setAmountMax(search.amountMax)
    setDateFrom(search.dateFrom)
    setDateTo(search.dateTo)
    onSearch(search)
  }

  return (
    <div className="space-y-4">
      {/* Quick Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Quick search transactions..."
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleQuickSearch(quickSearch)
              }
            }}
            className="pl-10"
          />
        </div>
        <Button 
          onClick={() => handleQuickSearch(quickSearch)}
          disabled={!quickSearch}
        >
          Search
        </Button>
        <Button 
          variant="outline" 
          className="relative"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Advanced
          {activeFilterCount > 0 && (
            <Badge 
              variant="secondary" 
              className="ml-2 h-5 w-5 rounded-full p-0 text-xs"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
        
        {hasActiveFilters && (
          <Button variant="outline" onClick={handleClearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>

      {/* Advanced Search Form */}
      {isOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Advanced Search</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Text Search */}
            <div className="space-y-2">
              <Label>Search Text</Label>
              <Input
                placeholder="Description, merchant, reference..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {/* Amount Range */}
            <div className="space-y-2">
              <Label>Amount Range</Label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <Input
                  type="number"
                  placeholder="Min amount"
                  value={amountMin || ''}
                  onChange={(e) => setAmountMin(e.target.value ? Number(e.target.value) : null)}
                />
                <Input
                  type="number"
                  placeholder="Max amount"
                  value={amountMax || ''}
                  onChange={(e) => setAmountMax(e.target.value ? Number(e.target.value) : null)}
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                {AMOUNT_PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="outline"
                    size="sm"
                    onClick={() => handleAmountPreset(preset.min, preset.max)}
                    className="text-xs"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <Input
                  type="date"
                  value={dateFrom || ''}
                  onChange={(e) => setDateFrom(e.target.value || null)}
                />
                <Input
                  type="date"
                  value={dateTo || ''}
                  onChange={(e) => setDateTo(e.target.value || null)}
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                {DATE_PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="outline"
                    size="sm"
                    onClick={() => handleDatePreset(preset.days)}
                    className="text-xs"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-2">
              <Label>Categories</Label>
              <Select
                value=""
                onValueChange={(value) => {
                  if (!selectedCategories.includes(value)) {
                    setSelectedCategories([...selectedCategories, value])
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add category filter" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter(cat => !selectedCategories.includes(cat.id))
                    .map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          {category.color && (
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: category.color }}
                            />
                          )}
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <div className="flex gap-1 flex-wrap">
                {selectedCategories.map(categoryId => {
                  const category = categories.find(c => c.id === categoryId)
                  return category ? (
                    <Badge key={categoryId} variant="secondary" className="flex items-center gap-1">
                      {category.name}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => {
                          const updatedCategories = selectedCategories.filter(id => id !== categoryId)
                          setSelectedCategories(updatedCategories)
                          
                          // Auto-apply the updated filter
                          const filters = {
                            id: Date.now().toString(),
                            name: 'Auto-applied Filter',
                            query,
                            categories: updatedCategories,
                            accounts: selectedAccounts,
                            merchants: selectedMerchants,
                            amountMin,
                            amountMax,
                            dateFrom,
                            dateTo,
                            transactionTypes: selectedTypes,
                          }
                          onSearch(filters)
                        }}
                      />
                    </Badge>
                  ) : null
                })}
              </div>
            </div>

            {/* Accounts */}
            <div className="space-y-2">
              <Label>Accounts</Label>
              <Select
                value=""
                onValueChange={(value) => {
                  if (!selectedAccounts.includes(value)) {
                    setSelectedAccounts([...selectedAccounts, value])
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add account filter" />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter(acc => !selectedAccounts.includes(acc.id))
                    .map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex flex-col">
                          <span>{account.name}</span>
                          {account.institution && (
                            <span className="text-xs text-muted-foreground">
                              {account.institution}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <div className="flex gap-1 flex-wrap">
                {selectedAccounts.map(accountId => {
                  const account = accounts.find(a => a.id === accountId)
                  return account ? (
                    <Badge key={accountId} variant="secondary" className="flex items-center gap-1">
                      {account.name}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => {
                          const updatedAccounts = selectedAccounts.filter(id => id !== accountId)
                          setSelectedAccounts(updatedAccounts)
                          
                          // Auto-apply the updated filter
                          const filters = {
                            id: Date.now().toString(),
                            name: 'Auto-applied Filter',
                            query,
                            categories: selectedCategories,
                            accounts: updatedAccounts,
                            merchants: selectedMerchants,
                            amountMin,
                            amountMax,
                            dateFrom,
                            dateTo,
                            transactionTypes: selectedTypes,
                          }
                          onSearch(filters)
                        }}
                      />
                    </Badge>
                  ) : null
                })}
              </div>
            </div>

            {/* Transaction Types */}
            <div className="space-y-2">
              <Label>Transaction Types</Label>
              <div className="space-y-2">
                {TRANSACTION_TYPES.map(type => (
                  <div key={type.value} className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedTypes.includes(type.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTypes([...selectedTypes, type.value])
                        } else {
                          setSelectedTypes(prev => prev.filter(t => t !== type.value))
                        }
                      }}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{type.label}</span>
                      <span className="text-xs text-muted-foreground">{type.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={handleSearch} className="flex-1">
                Apply Filters
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setSaveDialogOpen(true)}
                disabled={!hasActiveFilters}
              >
                <Save className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                onClick={handleClearFilters}
                disabled={!hasActiveFilters}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saved Searches */}
      {savedSearches.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Bookmark className="h-3 w-3" />
            Saved:
          </span>
          {savedSearches.map(search => (
            <Badge
              key={search.id}
              variant="outline"
              className="cursor-pointer hover:bg-accent flex items-center gap-1"
              onClick={() => loadSavedSearch(search)}
            >
              {search.name}
              <X 
                className="h-3 w-3" 
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteSearch(search.id)
                }}
              />
            </Badge>
          ))}
        </div>
      )}

      {/* Save Search Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Search</DialogTitle>
            <DialogDescription>
              Give this search configuration a name to save it for later use.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search-name">Search Name</Label>
              <Input
                id="search-name"
                placeholder="Enter a name for this search..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSearch} disabled={!searchName.trim()}>
              Save Search
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
