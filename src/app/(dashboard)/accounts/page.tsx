"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Plus, 
  CreditCard, 
  Building2, 
  Wifi, 
  WifiOff,
  MoreHorizontal,
  Edit,
  Trash2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Sample account data
const sampleAccounts = [
  {
    id: '1',
    name: 'Everyday Account',
    officialName: 'CommBank Smart Access',
    institution: 'Commonwealth Bank',
    type: 'checking' as const,
    mask: '****1234',
    balance: 2847.56,
    availableBalance: 2847.56,
    currency: 'AUD',
    isConnected: true,
    lastSync: '2024-01-15T10:30:00Z',
    connectionHealth: 'healthy' as const,
    balanceHistory: [
      { date: '2024-01-01', balance: 3200.00 },
      { date: '2024-01-07', balance: 2950.00 },
      { date: '2024-01-15', balance: 2847.56 },
    ]
  },
  {
    id: '2',
    name: 'High Interest Savings',
    officialName: 'UBank USaver',
    institution: 'UBank',
    type: 'savings' as const,
    mask: '****5678',
    balance: 15420.33,
    availableBalance: 15420.33,
    currency: 'AUD',
    isConnected: true,
    lastSync: '2024-01-15T10:25:00Z',
    connectionHealth: 'healthy' as const,
    balanceHistory: [
      { date: '2024-01-01', balance: 14800.00 },
      { date: '2024-01-07', balance: 15100.00 },
      { date: '2024-01-15', balance: 15420.33 },
    ]
  },
  {
    id: '3',
    name: 'Travel Rewards Credit',
    officialName: 'ANZ Frequent Flyer Black',
    institution: 'ANZ Bank',
    type: 'credit' as const,
    mask: '****9012',
    balance: -1247.89,
    availableBalance: 8752.11,
    currency: 'AUD',
    isConnected: false,
    lastSync: '2024-01-12T15:20:00Z',
    connectionHealth: 'error' as const,
    balanceHistory: [
      { date: '2024-01-01', balance: -890.00 },
      { date: '2024-01-07', balance: -1100.00 },
      { date: '2024-01-12', balance: -1247.89 },
    ]
  },
  {
    id: '4',
    name: 'Investment Portfolio',
    officialName: 'Westpac Online Investing',
    institution: 'Westpac',
    type: 'investment' as const,
    mask: '****3456',
    balance: 45230.78,
    availableBalance: 45230.78,
    currency: 'AUD',
    isConnected: true,
    lastSync: '2024-01-15T09:45:00Z',
    connectionHealth: 'warning' as const,
    balanceHistory: [
      { date: '2024-01-01', balance: 44500.00 },
      { date: '2024-01-07', balance: 44800.00 },
      { date: '2024-01-15', balance: 45230.78 },
    ]
  }
]

const institutionLogos = {
  'Commonwealth Bank': '🟡',
  'UBank': '🔶',
  'ANZ Bank': '🔵',
  'Westpac': '🔴',
  'NAB': '⚫',
  'ING': '🟠',
  'Bendigo Bank': '🟤',
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

export default function AccountsPage() {
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)

  const totalBalance = sampleAccounts
    .filter(account => account.type !== 'credit')
    .reduce((sum, account) => sum + account.balance, 0)

  const totalDebt = sampleAccounts
    .filter(account => account.type === 'credit' && account.balance < 0)
    .reduce((sum, account) => sum + Math.abs(account.balance), 0)

  const netWorth = totalBalance - totalDebt

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Accounts</h1>
          <p className="text-muted-foreground mt-2">
            Manage your connected bank accounts and monitor balances
          </p>
        </div>
        <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Account</DialogTitle>
              <DialogDescription>
                Connect a new bank account or add a manual account to track.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="institution">Institution</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your bank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="commbank">Commonwealth Bank</SelectItem>
                    <SelectItem value="anz">ANZ Bank</SelectItem>
                    <SelectItem value="westpac">Westpac</SelectItem>
                    <SelectItem value="nab">NAB</SelectItem>
                    <SelectItem value="ubank">UBank</SelectItem>
                    <SelectItem value="ing">ING</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="account-name">Account Name</Label>
                <Input
                  id="account-name"
                  placeholder="e.g., Everyday Account"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="account-type">Account Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Checking</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="credit">Credit Card</SelectItem>
                    <SelectItem value="investment">Investment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="balance">Current Balance (AUD)</Label>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddAccountOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsAddAccountOpen(false)}>
                Add Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalBalance.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {sampleAccounts.filter(a => a.type !== 'credit').length} accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Debt</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${totalDebt.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {sampleAccounts.filter(a => a.type === 'credit').length} credit accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
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
        {sampleAccounts.map((account) => {
          const typeInfo = accountTypes[account.type]
          const statusInfo = connectionStatus[account.connectionHealth]
          const StatusIcon = statusInfo.icon
          const balanceChange = account.balanceHistory.length >= 2 
            ? account.balanceHistory[account.balanceHistory.length - 1].balance - 
              account.balanceHistory[account.balanceHistory.length - 2].balance
            : 0

          return (
            <Card key={account.id} className="transition-all hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center text-2xl">
                        {institutionLogos[account.institution as keyof typeof institutionLogos] || '🏦'}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold truncate">{account.name}</h3>
                        <Badge variant="secondary" className={typeInfo.color}>
                          {typeInfo.label}
                        </Badge>
                        <Badge variant="secondary" className={statusInfo.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {account.institution} • {account.mask}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last sync: {formatDate(account.lastSync)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className={cn(
                        "text-xl font-bold",
                        account.type === 'credit' 
                          ? account.balance < 0 ? "text-red-600" : "text-green-600"
                          : "text-foreground"
                      )}>
                        {account.type === 'credit' && account.balance < 0 ? '-' : ''}
                        ${Math.abs(account.balance).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                      </div>
                      {account.type === 'credit' && (
                        <p className="text-sm text-muted-foreground">
                          ${account.availableBalance.toLocaleString('en-AU')} available
                        </p>
                      )}
                      {balanceChange !== 0 && (
                        <div className="flex items-center space-x-1 text-sm">
                          {balanceChange > 0 ? (
                            <TrendingUp className="h-3 w-3 text-green-500" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-500" />
                          )}
                          <span className={balanceChange > 0 ? "text-green-500" : "text-red-500"}>
                            ${Math.abs(balanceChange).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Account
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Sync Now
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Calendar className="h-4 w-4 mr-2" />
                          View History
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove Account
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
          <CardTitle>Connection Health</CardTitle>
          <CardDescription>
            Overview of your account connection status and sync health
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Health Score</span>
              <span className="text-2xl font-bold text-green-600">85%</span>
            </div>
            <Progress value={85} className="h-2" />
            
            <div className="grid gap-4 md:grid-cols-3 mt-6">
              <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {sampleAccounts.filter(a => a.connectionHealth === 'healthy').length}
                </div>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Healthy Connections
                </p>
              </div>
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {sampleAccounts.filter(a => a.connectionHealth === 'warning').length}
                </div>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Need Attention
                </p>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {sampleAccounts.filter(a => a.connectionHealth === 'error').length}
                </div>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Disconnected
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
