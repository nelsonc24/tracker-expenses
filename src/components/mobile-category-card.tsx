"use client"

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  ChevronDown, 
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface CategoryWithStats {
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
  transactionCount: number
  totalAmount: number
  children: CategoryWithStats[]
  isExpanded?: boolean
}

interface MobileCategoryCardProps {
  category: CategoryWithStats
  depth?: number
  onEdit: (category: CategoryWithStats) => void
  onDelete: (categoryId: string) => void
  onToggleExpansion: (categoryId: string) => void
  expandedCategories: Set<string>
  iconMapping: Record<string, React.ComponentType<{ className?: string }>>
}

export function MobileCategoryCard({ 
  category, 
  depth = 0, 
  onEdit, 
  onDelete, 
  onToggleExpansion,
  expandedCategories,
  iconMapping 
}: MobileCategoryCardProps) {
  const hasChildren = category.children.length > 0
  const isExpanded = expandedCategories.has(category.id)

  const renderCategoryIcon = (iconName: string | null, customIconUrl: string | null, color: string | null) => {
    const bgColor = color || '#6b7280'

    // Use custom icon URL if available
    if (customIconUrl) {
      return (
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: bgColor }}
        >
          <Image 
            src={customIconUrl} 
            alt="Category icon" 
            width={20}
            height={20}
            className="object-contain filter brightness-0 invert"
            onError={(e) => {
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
      : iconMapping['hash']
    
    return (
      <div 
        className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
        style={{ backgroundColor: bgColor }}
      >
        <IconComponent className="h-5 w-5" />
      </div>
    )
  }

  return (
    <div className={cn("", depth > 0 && "ml-4")}>
      <Card className="mb-3">
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Main category info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                {renderCategoryIcon(category.icon, category.customIconUrl || null, category.color)}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-medium text-base truncate">{category.name}</h3>
                    {category.isDefault && (
                      <Badge variant="secondary" className="text-xs">System</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {category.transactionCount} transactions
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {hasChildren && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleExpansion(category.id)}
                    className="p-2 h-8 w-8"
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-2 h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(category)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    {!category.isDefault && (
                      <DropdownMenuItem 
                        onClick={() => onDelete(category.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4 text-muted-foreground">
                <span className="font-medium">${Math.abs(category.totalAmount).toLocaleString()}</span>
                {hasChildren && (
                  <span>{category.children.length} subcategories</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subcategories */}
      {hasChildren && isExpanded && (
        <div className="ml-4 space-y-2">
          {category.children.map(child => (
            <MobileCategoryCard
              key={child.id}
              category={child}
              depth={depth + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleExpansion={onToggleExpansion}
              expandedCategories={expandedCategories}
              iconMapping={iconMapping}
            />
          ))}
        </div>
      )}
    </div>
  )
}