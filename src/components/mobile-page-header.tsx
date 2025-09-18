"use client"

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'

interface MobilePageHeaderProps {
  title: string
  description: string
  onAdd?: () => void
  addButtonText?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  showSearch?: boolean
  children?: React.ReactNode
}

export function MobilePageHeader({
  title,
  description,
  onAdd,
  addButtonText = "Add",
  searchValue = "",
  onSearchChange,
  showSearch = false,
  children
}: MobilePageHeaderProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Title and Add Button */}
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{title}</h1>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {description}
            </p>
          </div>
          {onAdd && (
            <Button onClick={onAdd} size="sm" className="ml-3 shrink-0">
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden xs:inline">{addButtonText}</span>
            </Button>
          )}
        </div>

        {/* Search and Filters */}
        {(showSearch || children) && (
          <div className="space-y-3">
            {showSearch && onSearchChange && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder={`Search ${title.toLowerCase()}...`}
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}
            {children && (
              <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                {children}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Desktop version
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {description}
        </p>
      </div>
      
      <div className="flex items-center space-x-2">
        {onAdd && (
          <Button onClick={onAdd} className="w-full sm:w-auto">
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            {addButtonText}
          </Button>
        )}
      </div>
    </div>
  )
}