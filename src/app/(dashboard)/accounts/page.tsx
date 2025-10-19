import { currentUser } from '@clerk/nextjs/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  CreditCard, 
  Wifi, 
  WifiOff,
  TrendingUp,
  DollarSign,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { 
  getCurrentUser,
  createOrUpdateUser,
  getUserAccountsWithBalance,
} from '@/lib/db-utils'
import { redirect } from 'next/navigation'
import { AccountActions } from '@/components/accounts/account-actions'
import { AddAccountDialog } from '@/components/accounts/add-account-dialog'
import { AccountsClientHandler } from '@/components/accounts/accounts-page-wrapper'
import { SafePageWrapper } from '@/components/safe-page-wrapper'
import { BrowserExtensionWarning } from '@/components/browser-extension-warning'

const institutionLogos = {
  'Commonwealth Bank': '🔶',
  'UBank': '🔵',
  'ANZ Bank': '🟡',
  'Westpac': '🔴',
  'NAB': '⚫',
  'ING': '🟠',
  'Bendigo Bank': '🟤',
  'Primary Account': '🏦',
  'Imported Data': '�',
}

const accountTypes = {
  checking: { label: 'Checking', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' },
  savings: { label: 'Savings', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' },
  credit: { label: 'Credit', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' },
  investment: { label: 'Investment', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100' },
}

const connectionStatus = {
  healthy: { label: 'Connected', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100', icon: Wifi },
  warning: { label: 'Issues', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100', icon: Wifi },
  error: { label: 'Disconnected', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100', icon: WifiOff },
}

export default async function AccountsPage() {
  const user = await currentUser()
  
  if (!user) {
    redirect('/sign-in')
  }

  // Get user from database
  let dbUser = await getCurrentUser()
  
  if (!dbUser) {
    // User not yet synced to database, create the user
    try {
      dbUser = await createOrUpdateUser({
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        imageUrl: user.imageUrl || '',
      })
      
      if (!dbUser) {
        redirect('/setup')
      }
    } catch (error) {
      console.error('Error creating user:', error)
      redirect('/setup')
    }
  }

  // Fetch user accounts with calculated balances
  const accounts = await getUserAccountsWithBalance(user.id)

  const totalBalance = accounts
    .filter(account => account.accountType !== 'credit')
    .reduce((sum, account) => sum + account.calculatedBalance, 0)

  const totalDebt = accounts
    .filter(account => account.accountType === 'credit' && account.calculatedBalance < 0)
    .reduce((sum, account) => sum + Math.abs(account.calculatedBalance), 0)

  const netWorth = totalBalance - totalDebt

  return (
    <SafePageWrapper>
      <AccountsClientHandler />
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Accounts</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
              Manage your connected bank accounts and monitor balances
            </p>
          </div>
          <AddAccountDialog />
        </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Balance</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-green-600">
              ${totalBalance.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {accounts.filter(a => a.accountType !== 'credit').length} accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Debt</CardTitle>
            <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-red-600">
              ${totalDebt.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {accounts.filter(a => a.accountType === 'credit').length} credit accounts
            </p>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Net Worth</CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-lg sm:text-2xl font-bold",
              netWorth >= 0 ? "text-green-600" : "text-red-600"
            )}>
              ${netWorth.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              All accounts combined
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Accounts List */}
      <div className="grid gap-4">
        {accounts.map((account) => {
          const typeInfo = accountTypes[account.accountType as keyof typeof accountTypes] || accountTypes.checking
          const statusInfo = connectionStatus.healthy // Default to healthy since we don't have connection status in real data
          const StatusIcon = statusInfo.icon
          const balance = account.calculatedBalance

          return (
            <Card key={account.id} className="transition-all hover:shadow-md">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-muted rounded-full flex items-center justify-center text-lg sm:text-2xl">
                        {institutionLogos[account.institution as keyof typeof institutionLogos] || '🏦'}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                        <h3 className="text-base sm:text-lg font-semibold truncate">{account.name}</h3>
                        <div className="flex flex-wrap gap-1 sm:gap-2">
                          <Badge variant="secondary" className={cn(typeInfo.color, "text-xs")}>
                            {typeInfo.label}
                          </Badge>
                          <Badge variant="secondary" className={cn(statusInfo.color, "text-xs")}>
                            <StatusIcon className="w-2 h-2 sm:w-3 sm:h-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {account.institution} • {account.accountNumber || 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last updated: {formatDate(account.updatedAt?.toISOString() || new Date().toISOString())}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-4">
                    <div className="text-left sm:text-right">
                      <div className={cn(
                        "text-lg sm:text-xl font-bold",
                        account.accountType === 'credit' 
                          ? balance < 0 ? "text-red-600" : "text-green-600"
                          : "text-foreground"
                      )}>
                        {account.accountType === 'credit' && balance < 0 ? '-' : ''}
                        ${Math.abs(balance).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                      </div>
                      {account.accountType === 'credit' && (
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Credit Account
                        </p>
                      )}
                    </div>

                    <AccountActions account={account} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Connection Health Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Account Summary</CardTitle>
          <CardDescription>
            Overview of your connected accounts and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Accounts</span>
              <span className="text-2xl font-bold text-green-600">{accounts.length}</span>
            </div>
            <Progress value={accounts.length > 0 ? 100 : 0} className="h-2" />
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <div className="text-center p-3 sm:p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div className="text-xl sm:text-2xl font-bold text-blue-600">
                  {accounts.filter(a => a.accountType === 'checking').length}
                </div>
                <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                  Checking Accounts
                </p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <div className="text-xl sm:text-2xl font-bold text-green-600">
                  {accounts.filter(a => a.accountType === 'savings').length}
                </div>
                <p className="text-xs sm:text-sm text-green-700 dark:text-green-300">
                  Savings Accounts
                </p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <div className="text-xl sm:text-2xl font-bold text-red-600">
                  {accounts.filter(a => a.accountType === 'credit').length}
                </div>
                <p className="text-xs sm:text-sm text-red-700 dark:text-red-300">
                  Credit Accounts
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
      <BrowserExtensionWarning />
    </SafePageWrapper>
  )
}
