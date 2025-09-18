"use client"

import { useState } from 'react'
import { Menu, Bell, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import { MobileSidebar } from '@/components/mobile-sidebar'
import { UserButton } from '@clerk/nextjs'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

interface MobileNavigationHeaderProps {
  title?: string
  subtitle?: string
  showSearch?: boolean
  className?: string
  children?: React.ReactNode
}

export function MobileNavigationHeader({ 
  title, 
  subtitle,
  showSearch = false,
  className,
  children
}: MobileNavigationHeaderProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const isMobile = useIsMobile()

  if (!isMobile) {
    return null
  }

  return (
    <header className={cn(
      "sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      className
    )}>
      <div className="flex h-14 items-center justify-between px-4">
        {/* Left side - Menu button and title */}
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <MobileSidebar
            trigger={
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            }
            open={sidebarOpen}
            onOpenChange={setSidebarOpen}
          />
          
          {(title || subtitle) && (
            <div className="flex flex-col min-w-0 flex-1">
              {title && (
                <h1 className="text-lg font-semibold truncate">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-sm text-muted-foreground truncate">
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-2">
          {showSearch && (
            <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                  <Search className="h-5 w-5" />
                  <span className="sr-only">Search</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="top" className="h-auto">
                <div className="py-4">
                  <Input
                    placeholder="Search transactions, categories..."
                    className="w-full"
                    autoFocus
                  />
                </div>
              </SheetContent>
            </Sheet>
          )}
          
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Notifications</span>
          </Button>
          
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </div>

      {/* Custom content */}
      {children && (
        <div className="px-4 pb-3">
          {children}
        </div>
      )}
    </header>
  )
}