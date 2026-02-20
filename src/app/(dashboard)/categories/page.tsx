'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { MobileNavigationHeader } from '@/components/mobile-navigation-header'
import { InsightCard } from '@/components/dashboard-insights'
import { 
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts'
import { PieLabelProps } from 'recharts/types/polar/Pie'
import { 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  EyeOff,
  FolderPlus,
  TrendingUp,
  DollarSign,
  Activity,
  Target
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getIconComponent } from '@/lib/category-icons'
import { IconPicker } from '@/components/icon-picker'
import { CategoryDetailDialog } from '@/components/category-detail-dialog'

interface CategorySpendingData {
  category: string
  amount: number
  color: string
  transactionCount: number
}

interface Category {
  id: string
  userId: string | null
  name: string
  slug: string
  parentId: string | null
  color: string | null
  icon: string | null
  customIconUrl?: string | null
  isDefault: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

interface CategoryStats {
  [categoryId: string]: {
    transactionCount: number
    totalAmount: number
  }
}

interface CategoryWithStats extends Category {
  transactionCount: number
  totalAmount: number
  children: CategoryWithStats[]
  isExpanded?: boolean
}

const colorOptions = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#6b7280', '#374151', '#1f2937'
]

export default function CategoriesPage() {
  const { user, isLoaded } = useUser()
  const searchParams = useSearchParams()
  const [categories, setCategories] = useState<CategoryWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithStats | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showSystemCategories, setShowSystemCategories] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [selectedPeriod, setSelectedPeriod] = useState('1m')
  const [categorySpendingData, setCategorySpendingData] = useState<CategorySpendingData[]>([])
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [selectedCategoryForDetail, setSelectedCategoryForDetail] = useState<CategoryWithStats | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6b7280',
    icon: 'hash',
    customIconUrl: '',
    parentId: '',
  })

  const buildCategoryTree = useCallback((categories: Category[], stats: CategoryStats = {}): CategoryWithStats[] => {
    const categoryMap = new Map<string, CategoryWithStats>()
    
    // Initialize all categories with stats
    categories.forEach(category => {
      const categoryStats = stats[category.id] || { transactionCount: 0, totalAmount: 0 }
      categoryMap.set(category.id, {
        ...category,
        ...categoryStats,
        children: [],
        isExpanded: expandedCategories.has(category.id)
      })
    })

    // Build tree structure
    const rootCategories: CategoryWithStats[] = []
    categoryMap.forEach(category => {
      if (category.parentId && categoryMap.has(category.parentId)) {
        const parent = categoryMap.get(category.parentId)!
        parent.children.push(category)
      } else {
        rootCategories.push(category)
      }
    })

    // Sort by sortOrder and name
    const sortCategories = (cats: CategoryWithStats[]) => {
      cats.sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
        return a.name.localeCompare(b.name)
      })
      cats.forEach(cat => sortCategories(cat.children))
    }
    
    sortCategories(rootCategories)
    return rootCategories
  }, [expandedCategories])

  const fetchCategorySpending = useCallback(async () => {
    try {
      setInsightsLoading(true)
      const response = await fetch(`/api/analytics/category-spending?period=${selectedPeriod}`)
      
      if (response.ok) {
        const data = await response.json()
        setCategorySpendingData(data.data || [])
      }
    } catch (err) {
      console.error('Error fetching category spending:', err)
    } finally {
      setInsightsLoading(false)
    }
  }, [selectedPeriod])

  const fetchCategories = useCallback(async function() {
    try {
      setLoading(true)
      setError(null)

      const [categoriesRes, statsRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/analytics/categories')
      ])

      if (!categoriesRes.ok) {
        throw new Error('Failed to fetch categories')
      }

      const categoriesData = await categoriesRes.json()
      
      // Get category statistics if available
      let statsData = {}
      if (statsRes.ok) {
        statsData = await statsRes.json()
      }

      // Build category tree with statistics
      const categoriesWithStats = buildCategoryTree(categoriesData, statsData)
      setCategories(categoriesWithStats)

    } catch (err) {
      console.error('Error fetching categories:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch categories')
    } finally {
      setLoading(false)
    }
  }, [buildCategoryTree])

  useEffect(() => {
    if (!isLoaded || !user) return
    fetchCategories()
  }, [isLoaded, user, fetchCategories])

  useEffect(() => {
    if (!isLoaded || !user) return
    fetchCategorySpending()
  }, [isLoaded, user, fetchCategorySpending, selectedPeriod])

  // Calculate insights from category spending data
  const getInsights = () => {
    if (!categorySpendingData || categorySpendingData.length === 0) {
      return {
        topCategory: null,
        totalSpending: 0,
        avgPerCategory: 0,
        categoriesWithSpending: 0,
        totalCategories: categories.length
      }
    }

    const sorted = [...categorySpendingData].sort((a, b) => b.amount - a.amount)
    const totalSpending = categorySpendingData.reduce((sum, cat) => sum + cat.amount, 0)
    const categoriesWithSpending = categorySpendingData.filter(cat => cat.amount > 0).length

    return {
      topCategory: sorted[0],
      totalSpending,
      avgPerCategory: categoriesWithSpending > 0 ? totalSpending / categoriesWithSpending : 0,
      categoriesWithSpending,
      totalCategories: categories.length
    }
  }

  const insights = getInsights()

  // Prepare chart data - top 10 categories for bar chart
  const topCategoriesData = [...categorySpendingData]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)

  // Prepare pie chart data - top 8 + others
  const pieChartData = (() => {
    const sorted = [...categorySpendingData].sort((a, b) => b.amount - a.amount)
    const top8 = sorted.slice(0, 8).map(cat => ({
      name: cat.category,
      category: cat.category,
      amount: cat.amount,
      color: cat.color
    }))
    const others = sorted.slice(8)
    
    if (others.length > 0) {
      const othersTotal = others.reduce((sum, cat) => sum + cat.amount, 0)
      return [...top8, { name: 'Others', category: 'Others', amount: othersTotal, color: '#9ca3af' }]
    }
    
    return top8
  })()

  // Auto-open create dialog when action=add query parameter is present
  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'add') {
      setIsCreateDialogOpen(true)
      // Remove the query parameter from the URL
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [searchParams])

  async function handleCreateCategory() {
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          color: formData.color,
          icon: formData.icon,
          customIconUrl: formData.customIconUrl || null,
          parentId: formData.parentId || null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create category')
      }

      await fetchCategories()
      setIsCreateDialogOpen(false)
      resetForm()
    } catch (err) {
      console.error('Error creating category:', err)
      setError(err instanceof Error ? err.message : 'Failed to create category')
    }
  }

  async function handleUpdateCategory() {
    if (!selectedCategory) return

    try {
      const response = await fetch(`/api/categories/${selectedCategory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          color: formData.color,
          icon: formData.icon,
          customIconUrl: formData.customIconUrl || null,
          parentId: formData.parentId || null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update category')
      }

      await fetchCategories()
      setIsEditDialogOpen(false)
      setSelectedCategory(null)
      resetForm()
    } catch (err) {
      console.error('Error updating category:', err)
      setError(err instanceof Error ? err.message : 'Failed to update category')
    }
  }

  async function handleDeleteCategory(categoryId: string) {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete category')
      }

      await fetchCategories()
    } catch (err) {
      console.error('Error deleting category:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete category')
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      description: '',
      color: '#6b7280',
      icon: 'hash',
      customIconUrl: '',
      parentId: '',
    })
  }

  function openEditDialog(category: CategoryWithStats) {
    setSelectedCategory(category)
    setFormData({
      name: category.name,
      description: '',
      color: category.color || '#6b7280',
      icon: category.icon || 'hash',
      customIconUrl: category.customIconUrl || '',
      parentId: category.parentId || '',
    })
    setIsEditDialogOpen(true)
  }

  function openDetailDialog(category: CategoryWithStats) {
    setSelectedCategoryForDetail(category)
    setIsDetailDialogOpen(true)
  }

  function toggleCategoryExpansion(categoryId: string) {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  function getFilteredCategories(): CategoryWithStats[] {
    let filtered = categories

    if (!showSystemCategories) {
      filtered = filtered.filter(cat => !cat.isDefault)
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(cat => 
        cat.name.toLowerCase().includes(search) ||
        cat.children.some(child => child.name.toLowerCase().includes(search))
      )
    }

    return filtered
  }

  function renderCategoryIcon(iconName: string | null, customIconUrl: string | null, color: string | null) {
    const bgColor = color || '#6b7280'

    // Use custom icon URL if available
    if (customIconUrl) {
      return (
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: bgColor }}
        >
          <Image 
            src={customIconUrl} 
            alt="Category icon" 
            width={16}
            height={16}
            className="object-contain filter brightness-0 invert"
            onError={(e) => {
              // Fallback to default icon if custom icon fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
      )
    }

    // Fallback to lucide icon using shared utility
    const IconComponent = getIconComponent(iconName)
    
    return (
      <div 
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
        style={{ backgroundColor: bgColor }}
      >
        <IconComponent className="h-4 w-4" />
      </div>
    )
  }

  function renderCategory(category: CategoryWithStats, depth = 0) {
    const hasChildren = category.children.length > 0
    const isExpanded = expandedCategories.has(category.id)

    return (
      <div key={category.id} className={cn("border-l-2 border-muted", depth > 0 && "ml-4")}>
        <Card className="mb-2 transition-all hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div 
                className="flex items-center space-x-3 flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => openDetailDialog(category)}
              >
                {hasChildren && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleCategoryExpansion(category.id)
                    }}
                    className="p-1 h-6 w-6"
                  >
                    {isExpanded ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                )}
                
                {renderCategoryIcon(category.icon, category.customIconUrl || null, category.color)}
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-medium">{category.name}</h3>
                    {category.isDefault && (
                      <Badge variant="secondary" className="text-xs">System</Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                    <span>{category.transactionCount} transactions</span>
                    <span>${Math.abs(category.totalAmount).toLocaleString()}</span>
                    {hasChildren && (
                      <span>{category.children.length} subcategories</span>
                    )}
                  </div>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEditDialog(category)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  {!category.isDefault && (
                    <DropdownMenuItem 
                      onClick={() => handleDeleteCategory(category.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        {hasChildren && isExpanded && (
          <div className="ml-4">
            {category.children.map(child => renderCategory(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-24 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Authentication Required</CardTitle>
          <CardDescription>Please sign in to manage your categories.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const filteredCategories = getFilteredCategories()

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Mobile Navigation Header */}
      <MobileNavigationHeader 
        title="Categories"
        subtitle="Organize your transactions"
        showSearch
      />

      {/* Header */}
      <div className="hidden md:flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Categories</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Organize your transactions with custom categories
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-28 sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">1 Month</SelectItem>
              <SelectItem value="3m">3 Months</SelectItem>
              <SelectItem value="6m">6 Months</SelectItem>
              <SelectItem value="1y">1 Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="w-full sm:w-auto">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Category</DialogTitle>
                <DialogDescription>
                  Add a new category to organize your transactions.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Category name"
                  />
                </div>

                <div>
                  <Label htmlFor="parent">Parent Category (Optional)</Label>
                  <Select value={formData.parentId || "none"} onValueChange={(value) => 
                    setFormData({ ...formData, parentId: value === "none" ? "" : value })
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Top Level)</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Icon & Custom Icon</Label>
                  <IconPicker
                    selectedIcon={formData.icon}
                    onIconChange={(icon) => setFormData(prev => ({ ...prev, icon }))}
                    customIconUrl={formData.customIconUrl}
                    onCustomIconUrlChange={(url) => setFormData(prev => ({ ...prev, customIconUrl: url }))}
                    showCustomUpload={true}
                  />
                </div>

                <div>
                  <Label htmlFor="color">Color</Label>
                  <div className="grid grid-cols-5 gap-2 mt-2">
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        type="button"
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-all",
                          formData.color === color 
                            ? "border-foreground scale-110" 
                            : "border-transparent hover:scale-105"
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData({ ...formData, color })}
                        aria-label={`Select color ${color}`}
                        title={`Select color ${color}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateCategory} 
                  disabled={!formData.name.trim()}
                >
                  Create Category
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Insights Summary Section */}
      {!loading && !insightsLoading && categorySpendingData.length > 0 && (
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <InsightCard
            title="Top Category"
            value={insights.topCategory ? insights.topCategory.category : 'N/A'}
            icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
            description={insights.topCategory ? `$${insights.topCategory.amount.toLocaleString()}` : 'No spending'}
          />
          <InsightCard
            title="Total Spending"
            value={`$${insights.totalSpending.toLocaleString()}`}
            icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
            description={`Across ${insights.categoriesWithSpending} categories`}
          />
          <InsightCard
            title="Average per Category"
            value={`$${insights.avgPerCategory.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            icon={<Activity className="h-4 w-4 text-muted-foreground" />}
            description="Mean spending amount"
          />
          <InsightCard
            title="Active Categories"
            value={`${insights.categoriesWithSpending}/${insights.totalCategories}`}
            icon={<Target className="h-4 w-4 text-muted-foreground" />}
            description="Categories with spending"
          />
        </div>
      )}

      {/* Overview Charts Section */}
      {!loading && !insightsLoading && categorySpendingData.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Pie Chart - Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Spending Distribution</CardTitle>
              <CardDescription>
                Breakdown by category for selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: PieLabelProps) => {
                      const percent = props.percent ?? 0
                      if (percent < 0.05) return '' // Hide labels for tiny slices
                      return `${(percent * 100).toFixed(1)}%`
                    }}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => `$${value.toLocaleString()}`}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Bar Chart - Top Spending Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Top Spending Categories</CardTitle>
              <CardDescription>
                Highest spending categories for selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={topCategoriesData} layout="vertical" margin={{ left: 20 }}>
                  <XAxis 
                    type="number" 
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <YAxis 
                    dataKey="category" 
                    type="category" 
                    width={120}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => `$${value.toLocaleString()}`}
                    labelStyle={{ color: '#000', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                    {topCategoriesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Expense Table by Category */}
      {!loading && !insightsLoading && categorySpendingData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Category Expenses Breakdown</CardTitle>
            <CardDescription>
              Detailed view of all category expenses for the selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                        Category
                      </th>
                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                        Amount
                      </th>
                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground hidden sm:table-cell">
                        Transactions
                      </th>
                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground hidden md:table-cell">
                        % of Total
                      </th>
                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground hidden md:table-cell">
                        Avg per Transaction
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {categorySpendingData
                      .sort((a, b) => b.amount - a.amount)
                      .map((category) => {
                        const percentOfTotal = insights.totalSpending > 0 
                          ? (category.amount / insights.totalSpending) * 100 
                          : 0
                        const avgPerTransaction = category.transactionCount > 0
                          ? category.amount / category.transactionCount
                          : 0
                        
                        return (
                          <tr 
                            key={category.category}
                            className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                            onClick={() => {
                              const cat = categories.find(c => c.name === category.category)
                              if (cat) openDetailDialog(cat)
                            }}
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-3 h-3 rounded-full flex-shrink-0" 
                                  style={{ backgroundColor: category.color }}
                                />
                                <span className="font-medium">{category.category}</span>
                              </div>
                            </td>
                            <td className="p-4 text-right font-semibold">
                              ${category.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-4 text-right text-muted-foreground hidden sm:table-cell">
                              {category.transactionCount}
                            </td>
                            <td className="p-4 text-right text-muted-foreground hidden md:table-cell">
                              {percentOfTotal.toFixed(1)}%
                            </td>
                            <td className="p-4 text-right text-muted-foreground hidden md:table-cell">
                              ${avgPerTransaction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 bg-muted/30 font-bold">
                      <td className="p-4">Total</td>
                      <td className="p-4 text-right">
                        ${insights.totalSpending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right hidden sm:table-cell">
                        {categorySpendingData.reduce((sum, cat) => sum + cat.transactionCount, 0)}
                      </td>
                      <td className="p-4 text-right hidden md:table-cell">
                        100%
                      </td>
                      <td className="p-4 text-right hidden md:table-cell">
                        ${insights.avgPerCategory.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:max-w-sm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={showSystemCategories ? "default" : "outline"}
                size="sm"
                onClick={() => setShowSystemCategories(!showSystemCategories)}
                className="text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">
                  {showSystemCategories ? "Hide" : "Show"} System Categories
                </span>
                <span className="sm:hidden">
                  {showSystemCategories ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Categories List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-24 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCategories.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FolderPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Categories Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'No categories match your search.' : 'Get started by creating your first category.'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Category
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredCategories.map(category => renderCategory(category))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the category details.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Category name"
              />
            </div>

            <div>
              <Label htmlFor="edit-parent">Parent Category (Optional)</Label>
              <Select value={formData.parentId || "none"} onValueChange={(value) => 
                setFormData({ ...formData, parentId: value === "none" ? "" : value })
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select parent category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Top Level)</SelectItem>
                  {categories
                    .filter(cat => cat.id !== selectedCategory?.id) // Don't allow self as parent
                    .map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Icon & Custom Icon</Label>
              <IconPicker
                selectedIcon={formData.icon}
                onIconChange={(icon) => setFormData(prev => ({ ...prev, icon }))}
                customIconUrl={formData.customIconUrl}
                onCustomIconUrlChange={(url) => setFormData(prev => ({ ...prev, customIconUrl: url }))}
                showCustomUpload={true}
              />
            </div>

            <div>
              <Label htmlFor="edit-color">Color</Label>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {colorOptions.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      formData.color === color 
                        ? "border-foreground scale-110" 
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                    aria-label={`Select color ${color}`}
                    title={`Select color ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateCategory} 
              disabled={!formData.name.trim()}
            >
              Update Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Detail Dialog */}
      {selectedCategoryForDetail && (
        <CategoryDetailDialog
          categoryId={selectedCategoryForDetail.id}
          categoryName={selectedCategoryForDetail.name}
          categoryColor={selectedCategoryForDetail.color || '#6b7280'}
          categoryIcon={selectedCategoryForDetail.icon || 'hash'}
          isOpen={isDetailDialogOpen}
          onClose={() => setIsDetailDialogOpen(false)}
          period={selectedPeriod}
        />
      )}
    </div>
  )
}
