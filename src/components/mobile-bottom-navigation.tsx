"use client"

import { 
  Home, 
  BarChart3, 
  CreditCard, 
  Settings,
  Target,
  FolderOpen,
  Menu,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

// Main bottom navigation items (most important)
const bottomNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Transactions', href: '/transactions', icon: BarChart3 },
  { name: 'Accounts', href: '/accounts', icon: CreditCard },
  { name: 'Categories', href: '/categories', icon: FolderOpen },
  { name: 'More', href: '#', icon: Menu, isMore: true },
]

// Additional navigation items shown in "More" sheet
const moreNavItems = [
  { name: 'Goals', href: '/goals', icon: Sparkles },
  { name: 'Budgets', href: '/budgets', icon: Target },
  { name: 'Bills', href: '/bills', icon: BarChart3 },
  { name: 'Recurring', href: '/recurring', icon: BarChart3 },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Advanced Analytics', href: '/advanced-analytics', icon: BarChart3 },
  { name: 'Import', href: '/import', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
]

interface MobileBottomNavigationProps {
  className?: string
}

export function MobileBottomNavigation({ className }: MobileBottomNavigationProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href
    }
    return pathname?.startsWith(href) && href !== '#'
  }

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden",
      "safe-area-inset-bottom",
      className
    )}>
      <nav className="flex items-center justify-around px-2 py-1">
        {bottomNavItems.map((item) => {
          if (item.isMore) {
            return (
              <Sheet key={item.name}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "flex flex-col items-center gap-1 px-3 py-2 h-auto min-h-[60px]",
                      "text-muted-foreground hover:text-foreground",
                      "transition-colors duration-200"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{item.name}</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="max-h-[80vh]">
                  <SheetHeader>
                    <SheetTitle>More Options</SheetTitle>
                  </SheetHeader>
                  <div className="grid grid-cols-3 gap-4 py-6">
                    {moreNavItems.map((moreItem) => {
                      const itemIsActive = isActive(moreItem.href)
                      return (
                        <Link
                          key={moreItem.name}
                          href={moreItem.href}
                          className={cn(
                            "flex flex-col items-center gap-2 p-4 rounded-lg",
                            "transition-colors duration-200",
                            itemIsActive
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <moreItem.icon className="h-6 w-6" />
                          <span className="text-sm font-medium text-center">
                            {moreItem.name}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                </SheetContent>
              </Sheet>
            )
          }

          const itemIsActive = isActive(item.href)
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 min-h-[60px]",
                "transition-colors duration-200 rounded-lg",
                itemIsActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5",
                itemIsActive && "fill-current"
              )} />
              <span className="text-xs font-medium">{item.name}</span>
              {itemIsActive && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}