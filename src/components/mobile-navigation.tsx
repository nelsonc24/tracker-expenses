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
  Menu,
  Home,
  CreditCard,
  PieChart,
  Settings,
  Search,
  FileText,
  Bell,
  User,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type MobileNavItem = {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
  badge?: string | number
  isActive?: boolean
}

type MobileNavigationProps = {
  currentPath?: string
  onNavigate?: (href: string) => void
}

export function MobileNavigation({ currentPath = '', onNavigate }: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false)

  const navItems: MobileNavItem[] = [
    {
      icon: Home,
      label: 'Dashboard',
      href: '/dashboard',
      isActive: currentPath === '/dashboard'
    },
    {
      icon: CreditCard,
      label: 'Transactions',
      href: '/transactions',
      isActive: currentPath === '/transactions'
    },
    {
      icon: PieChart,
      label: 'Analytics',
      href: '/analytics',
      isActive: currentPath === '/analytics'
    },
    {
      icon: FileText,
      label: 'Reports',
      href: '/reports',
      isActive: currentPath === '/reports'
    },
    {
      icon: Settings,
      label: 'Settings',
      href: '/settings',
      isActive: currentPath === '/settings'
    },
  ]

  const handleNavigate = (href: string) => {
    onNavigate?.(href)
    setIsOpen(false)
  }

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Left side - Menu button */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="p-2">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="text-left">Expense Tracker</SheetTitle>
              <SheetDescription className="text-left">
                Manage your finances
              </SheetDescription>
            </SheetHeader>
            
            <div className="flex flex-col p-4 space-y-2">
              {navItems.map((item) => (
                <Button
                  key={item.href}
                  variant={item.isActive ? "secondary" : "ghost"}
                  className={cn(
                    "justify-start h-12 px-3",
                    item.isActive && "bg-secondary"
                  )}
                  onClick={() => handleNavigate(item.href)}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>

            {/* User section */}
            <div className="mt-auto p-4 border-t">
              <Button
                variant="ghost"
                className="w-full justify-start h-12 px-3"
                onClick={() => handleNavigate('/profile')}
              >
                <User className="mr-3 h-5 w-5" />
                <span className="text-sm font-medium">Profile</span>
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Center - Page title */}
        <h1 className="font-semibold text-lg">
          {navItems.find(item => item.isActive)?.label || 'Expense Tracker'}
        </h1>

        {/* Right side - Notifications */}
        <Button variant="ghost" size="sm" className="p-2 relative">
          <Bell className="h-5 w-5" />
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            3
          </Badge>
        </Button>
      </div>

      {/* Mobile Bottom Navigation (Alternative/Additional) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t">
        <div className="flex items-center justify-around p-2">
          {navItems.slice(0, 4).map((item) => (
            <Button
              key={item.href}
              variant="ghost"
              size="sm"
              className={cn(
                "flex-col h-12 w-12 p-1",
                item.isActive && "text-primary"
              )}
              onClick={() => handleNavigate(item.href)}
            >
              <item.icon className={cn(
                "h-5 w-5",
                item.isActive && "text-primary"
              )} />
              <span className="text-xs mt-1">{item.label}</span>
            </Button>
          ))}
          
          {/* More button for additional items */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="flex-col h-12 w-12 p-1">
                <Menu className="h-5 w-5" />
                <span className="text-xs mt-1">More</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto">
              <SheetHeader>
                <SheetTitle>More Options</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-2 gap-4 p-4">
                {navItems.slice(4).map((item) => (
                  <Button
                    key={item.href}
                    variant="ghost"
                    className="flex-col h-16 space-y-2"
                    onClick={() => handleNavigate(item.href)}
                  >
                    <item.icon className="h-6 w-6" />
                    <span className="text-sm">{item.label}</span>
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  className="flex-col h-16 space-y-2"
                  onClick={() => handleNavigate('/profile')}
                >
                  <User className="h-6 w-6" />
                  <span className="text-sm">Profile</span>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </>
  )
}
