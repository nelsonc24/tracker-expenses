import { ClerkProvider } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  Home, 
  BarChart3, 
  CreditCard, 
  Settings, 
  Upload,
  Target,
  TrendingUp,
  Users
} from 'lucide-react'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await currentUser()
  
  if (!user) {
    redirect('/sign-in')
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Transactions', href: '/dashboard/transactions', icon: BarChart3 },
    { name: 'Accounts', href: '/dashboard/accounts', icon: CreditCard },
    { name: 'Budgets', href: '/dashboard/budgets', icon: Target },
    { name: 'Analytics', href: '/dashboard/analytics', icon: TrendingUp },
    { name: 'Import', href: '/dashboard/import', icon: Upload },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b border-border">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">ExpenseTracker</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => (
              <Link key={item.name} href={item.href}>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Button>
              </Link>
            ))}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center space-x-3">
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "w-10 h-10"
                  }
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.emailAddresses[0]?.emailAddress}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        {/* Top bar */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {/* Breadcrumb or page title can go here */}
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
