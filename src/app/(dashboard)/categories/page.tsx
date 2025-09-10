'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Separator } from '@/components/ui/separator'
import { 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  FolderPlus,
  Hash,
  DollarSign,
  ShoppingCart,
  Music,
  Car,
  Utensils,
  ShoppingBag,
  Zap,
  Heart,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface CategoryWithStats extends Category {
  transactionCount: number
  totalAmount: number
  children: CategoryWithStats[]
  isExpanded?: boolean
}

// Icon mapping for displaying icons
const iconMapping = {
  'dollar-sign': DollarSign,
  'shopping-cart': ShoppingCart,
  'music': Music,
  'car': Car,
  'utensils': Utensils,
  'shopping-bag': ShoppingBag,
  'zap': Zap,
  'heart': Heart,
  'more-horizontal': MoreHorizontal,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  'hash': Hash,
  'folder-plus': FolderPlus,
}

const availableIcons = Object.keys(iconMapping)

const colorOptions = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#6b7280', '#374151', '#1f2937'
]

export default function CategoriesPage() {
  const { user, isLoaded } = useUser()
  const [categories, setCategories] = useState<CategoryWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithStats | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showSystemCategories, setShowSystemCategories] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6b7280',
    icon: 'hash',
    customIconUrl: '',
    parentId: '',
  })

  useEffect(() => {
    if (!isLoaded || !user) return
    fetchCategories()
  }, [isLoaded, user])

  async function fetchCategories() {
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
  }

  function buildCategoryTree(categories: Category[], stats: any = {}): CategoryWithStats[] {
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
  }

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
    // Use custom icon URL if available
    if (customIconUrl) {
      return (
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: color || '#6b7280' }}
        >
          <img 
            src={customIconUrl} 
            alt="Category icon" 
            className="w-4 h-4 object-contain filter brightness-0 invert"
            onError={(e) => {
              // Fallback to default icon if custom icon fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
      )
    }

    // Fallback to lucide icon
    const IconComponent = iconName && iconMapping[iconName as keyof typeof iconMapping] 
      ? iconMapping[iconName as keyof typeof iconMapping] 
      : Hash
    
    return (
      <div 
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
        style={{ backgroundColor: color || '#6b7280' }}
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
        <Card className="mb-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                {hasChildren && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCategoryExpansion(category.id)}
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Categories</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Organize your transactions with custom categories
          </p>
        </div>
        
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
                <Label htmlFor="icon">Icon</Label>
                <Select value={formData.icon} onValueChange={(value) => 
                  setFormData({ ...formData, icon: value })
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableIcons.map(iconName => {
                      const IconComponent = iconMapping[iconName as keyof typeof iconMapping]
                      return (
                        <SelectItem key={iconName} value={iconName}>
                          <div className="flex items-center space-x-2">
                            <IconComponent className="h-4 w-4" />
                            <span className="capitalize">{iconName.replace('-', ' ')}</span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="customIconUrl">Custom Icon URL (Optional)</Label>
                <Input
                  id="customIconUrl"
                  value={formData.customIconUrl}
                  onChange={(e) => setFormData({ ...formData, customIconUrl: e.target.value })}
                  placeholder="https://example.com/icon.png"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Leave empty to use the selected icon above. Custom icon will override the selected icon.
                </p>
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
              <Label htmlFor="edit-icon">Icon</Label>
              <Select value={formData.icon} onValueChange={(value) => 
                setFormData({ ...formData, icon: value })
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableIcons.map(iconName => {
                    const IconComponent = iconMapping[iconName as keyof typeof iconMapping]
                    return (
                      <SelectItem key={iconName} value={iconName}>
                        <div className="flex items-center space-x-2">
                          <IconComponent className="h-4 w-4" />
                          <span className="capitalize">{iconName.replace('-', ' ')}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-customIconUrl">Custom Icon URL (Optional)</Label>
              <Input
                id="edit-customIconUrl"
                value={formData.customIconUrl}
                onChange={(e) => setFormData({ ...formData, customIconUrl: e.target.value })}
                placeholder="https://example.com/icon.png"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Leave empty to use the selected icon above. Custom icon will override the selected icon.
              </p>
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
    </div>
  )
}
