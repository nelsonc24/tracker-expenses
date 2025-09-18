"use client"

import { 
  Home, 
  BarChart3, 
  CreditCard, 
  Settings, 
  Upload,
  Target,
  TrendingUp,
  FolderOpen,
  Calendar,
  LineChart,
  Receipt,
  Activity
} from 'lucide-react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { UserButton } from '@clerk/nextjs'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Transactions', href: '/transactions', icon: BarChart3 },
  { name: 'Accounts', href: '/accounts', icon: CreditCard },
  { name: 'Categories', href: '/categories', icon: FolderOpen },
  { name: 'Activities', href: '/activities', icon: Activity },
  { name: 'Budgets', href: '/budgets', icon: Target },
  { name: 'Bills', href: '/bills', icon: Receipt },
  { name: 'Recurring', href: '/recurring', icon: Calendar },
]

const analyticsItems = [
  { name: 'Analytics', href: '/analytics', icon: TrendingUp },
  { name: 'Advanced Analytics', href: '/advanced-analytics', icon: LineChart },
]

const settingsItems = [
  { name: 'Import', href: '/import', icon: Upload },
  { name: 'Settings', href: '/settings', icon: Settings },
]

interface MobileSidebarProps {
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function MobileSidebar({ trigger, open, onOpenChange }: MobileSidebarProps) {
  const pathname = usePathname()
  const { user } = useUser()

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href
    }
    return pathname?.startsWith(href)
  }

  const handleLinkClick = () => {
    // Close the sheet when a link is clicked
    onOpenChange?.(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger && (
        <SheetTrigger asChild>
          {trigger}
        </SheetTrigger>
      )}
      <SheetContent side="left" className="w-80 p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="p-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <Link 
                href="/dashboard" 
                className="flex items-center space-x-3"
                onClick={handleLinkClick}
              >
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="flex flex-col">
                  <SheetTitle className="text-left text-lg font-semibold">
                    ExpenseTracker
                  </SheetTitle>
                  <span className="text-sm text-muted-foreground">
                    Manage your finances
                  </span>
                </div>
              </Link>
            </div>
          </SheetHeader>

          {/* Navigation Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Main Navigation */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-2">
                Main
              </h3>
              <nav className="space-y-1">
                {navigation.map((item) => {
                  const itemIsActive = isActive(item.href)
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={handleLinkClick}
                      className={cn(
                        "flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                        itemIsActive
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>

            {/* Analytics Section */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-2">
                Analytics
              </h3>
              <nav className="space-y-1">
                {analyticsItems.map((item) => {
                  const itemIsActive = isActive(item.href)
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={handleLinkClick}
                      className={cn(
                        "flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                        itemIsActive
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>

            {/* Settings Section */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-2">
                Settings
              </h3>
              <nav className="space-y-1">
                {settingsItems.map((item) => {
                  const itemIsActive = isActive(item.href)
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={handleLinkClick}
                      className={cn(
                        "flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                        itemIsActive
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Footer with User Info */}
          <div className="border-t p-6">
            <div className="flex items-center space-x-3">
              <UserButton afterSignOutUrl="/sign-in" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.primaryEmailAddress?.emailAddress}
                </p>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}