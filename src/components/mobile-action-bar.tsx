"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Plus,
  Search,
  Filter,
  Download,
  FileText,
  Zap,
  ChevronUp,
  MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type MobileActionBarProps = {
  selectedCount: number
  onQuickAdd: () => void
  onSearch: () => void
  onFilter: () => void
  onExport: () => void
  onTemplates: () => void
  onBulkActions: () => void
  className?: string
}

export function MobileActionBar({
  selectedCount,
  onQuickAdd,
  onSearch,
  onFilter,
  onExport,
  onTemplates,
  onBulkActions,
  className
}: MobileActionBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className={cn("lg:hidden", className)}>
      {/* Floating Action Button (Primary) */}
      <div className="fixed bottom-20 right-4 z-50">
        <Button
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg"
          onClick={onQuickAdd}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Quick Actions Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t lg:hidden">
        {/* Selection indicator when items are selected */}
        {selectedCount > 0 && (
          <div className="flex items-center justify-between p-3 bg-primary/10 border-b">
            <span className="text-sm font-medium">
              {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
            </span>
            <Button
              size="sm"
              onClick={onBulkActions}
              className="h-8"
            >
              <Zap className="h-4 w-4 mr-2" />
              Actions
            </Button>
          </div>
        )}

        {/* Main action bar */}
        <div className="flex items-center justify-around p-3">
          {/* Search */}
          <Button
            variant="ghost"
            size="sm"
            className="flex-col h-12 px-2"
            onClick={onSearch}
          >
            <Search className="h-5 w-5" />
            <span className="text-xs mt-1">Search</span>
          </Button>

          {/* Filter */}
          <Button
            variant="ghost"
            size="sm"
            className="flex-col h-12 px-2"
            onClick={onFilter}
          >
            <Filter className="h-5 w-5" />
            <span className="text-xs mt-1">Filter</span>
          </Button>

          {/* Templates */}
          <Button
            variant="ghost"
            size="sm"
            className="flex-col h-12 px-2"
            onClick={onTemplates}
          >
            <FileText className="h-5 w-5" />
            <span className="text-xs mt-1">Templates</span>
          </Button>

          {/* Export */}
          <Button
            variant="ghost"
            size="sm"
            className="flex-col h-12 px-2"
            onClick={onExport}
          >
            <Download className="h-5 w-5" />
            <span className="text-xs mt-1">Export</span>
          </Button>

          {/* More Actions */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex-col h-12 px-2"
              >
                <MoreHorizontal className="h-5 w-5" />
                <span className="text-xs mt-1">More</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto">
              <SheetHeader>
                <SheetTitle>More Actions</SheetTitle>
                <SheetDescription>
                  Additional tools and options
                </SheetDescription>
              </SheetHeader>
              
              <div className="grid grid-cols-2 gap-4 p-4">
                <Button
                  variant="outline"
                  className="flex-col h-20 space-y-2"
                  onClick={() => {
                    // Import action
                    console.log('Import')
                  }}
                >
                  <ChevronUp className="h-6 w-6" />
                  <span className="text-sm">Import</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="flex-col h-20 space-y-2"
                  onClick={() => {
                    // Keyboard shortcuts
                    console.log('Shortcuts')
                  }}
                >
                  <span className="text-lg font-mono">⌨</span>
                  <span className="text-sm">Shortcuts</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="flex-col h-20 space-y-2"
                  onClick={() => {
                    // Settings
                    console.log('Settings')
                  }}
                >
                  <span className="text-lg">⚙️</span>
                  <span className="text-sm">Settings</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="flex-col h-20 space-y-2"
                  onClick={() => {
                    // Help
                    console.log('Help')
                  }}
                >
                  <span className="text-lg">❓</span>
                  <span className="text-sm">Help</span>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  )
}

// Hook for mobile swipe gestures
export function useSwipeGestures() {
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    return { isLeftSwipe, isRightSwipe, distance }
  }

  return { onTouchStart, onTouchMove, onTouchEnd }
}
