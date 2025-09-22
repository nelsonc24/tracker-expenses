import { currentUser } from '@clerk/nextjs/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  CreditCard,
  ArrowUpRight,
  Plus,
  Download,
  Calendar
} from 'lucide-react'
import { 
  InsightCard, 
  BudgetProgressCard, 
  RecentTransactionsCard,
  SpendingInsightsCard 
} from '@/components/dashboard-insights'
import {
  MonthlyComparisonChart, 
  SpendingTrendChart, 
  BudgetProgressChart,
  InteractivePieChart,
} from '@/components/charts'
import { CategoryBreakdownWithFilter } from '@/components/category-breakdown-with-filter'
import { 
  getCurrentUser,
  createOrUpdateUser,
  getUserTransactions,
  getUserAccountsWithBalance,
  getUserCategories,
  getUserBudgets,
  getTransactionSummary,
  getCategorySpending,
  getRecurringTransactionsSummary
} from '@/lib/db-utils'
import { redirect } from 'next/navigation'

async function getDashboardData(userId: string) {
  // Get current date ranges
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  // Fetch all dashboard data in parallel
  const [
    accounts,
    categories,
    budgets,
    recentTransactions,
    thisMonthSummary,
    lastMonthSummary,
    categorySpending,
    last30DaysTransactions,
    recurringSummary
  ] = await Promise.all([
    getUserAccountsWithBalance(userId),
    getUserCategories(userId),
    getUserBudgets(userId),
    getUserTransactions(userId, { limit: 10, sortBy: 'date', sortOrder: 'desc' }),
    getTransactionSummary(userId, startOfMonth, endOfMonth),
    getTransactionSummary(userId, startOfLastMonth, endOfLastMonth),
    getCategorySpending(userId), // Remove date filtering to show all-time category spending
    getUserTransactions(userId, { 
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: now,
      limit: 1000 
    }),
    getRecurringTransactionsSummary(userId)
  ])

  // Calculate total balance across accounts using calculated balances
  const totalBalance = accounts.reduce((sum: number, account: { calculatedBalance: number }) => 
    sum + account.calculatedBalance, 0
  )

  // Calculate budget progress
  const budgetProgress = budgets.length > 0 
    ? budgets.reduce((sum, budget) => {
        const spent = categorySpending
          .filter(cs => budget.categoryIds?.includes(cs.categoryId || ''))
          .reduce((total, cs) => total + Math.abs(parseFloat(cs.totalAmount || '0')), 0)
        return sum + (spent / parseFloat(budget.amount))
      }, 0) / budgets.length * 100
    : 0

  // Generate trend data from last 30 days
  const trendData = last30DaysTransactions.map(({ transaction }) => ({
    date: transaction.transactionDate.toISOString().split('T')[0],
    amount: Math.abs(parseFloat(transaction.amount))
  })).slice(-7) // Last 7 days

  // Transform category spending for charts
  const categoryData = categorySpending.slice(0, 5).map((cs, index) => ({
    category: cs.categoryName || 'Uncategorized',
    amount: parseFloat(cs.totalAmount || '0'), // No need for Math.abs since query already returns absolute values
    color: cs.categoryColor || `hsl(${index * 60}, 70%, 50%)`
  }))

  // Generate monthly comparison data
  const monthlyData = [
    { name: 'Last Month', value: lastMonthSummary.totalExpenses },
    { name: 'This Month', value: thisMonthSummary.totalExpenses }
  ]

  return {
    accounts,
    categories,
    budgets,
    recentTransactions: recentTransactions.slice(0, 5),
    thisMonthSummary,
    lastMonthSummary,
    categorySpending,
    totalBalance,
    budgetProgress,
    trendData,
    categoryData,
    monthlyData,
    recurringSummary
  }
}

export default async function DashboardPage() {
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
        // If still can't create user, redirect to setup page
        redirect('/setup')
      }
    } catch (error) {
      console.error('Error creating user:', error)
      // Redirect to setup page instead of sign-in to avoid loop
      redirect('/setup')
    }
  }

  // Fetch all dashboard data
  const dashboardData = await getDashboardData(user.id)
  
  // Calculate derived values
  const monthlyChange = dashboardData.lastMonthSummary.totalExpenses > 0 
    ? ((dashboardData.thisMonthSummary.totalExpenses - dashboardData.lastMonthSummary.totalExpenses) / dashboardData.lastMonthSummary.totalExpenses) * 100
    : dashboardData.thisMonthSummary.totalExpenses > 0 ? 100 : 0

  const topCategory = dashboardData.categorySpending[0]
  const avgDailySpend = dashboardData.thisMonthSummary.totalExpenses / new Date().getDate()

  const insights = {
    topCategory: { 
      name: topCategory?.categoryName || 'No category', 
      amount: parseFloat(topCategory?.totalAmount || '0'), 
      percentage: 35 
    },
    avgDailySpend,
    monthlyTrend: monthlyChange >= 0 ? 'up' as const : 'down' as const,
    trendPercentage: Number(Math.abs(monthlyChange).toFixed(1)),
    unusualSpending: Math.abs(monthlyChange) > 20,
  }

  // Transform transactions for display
  const transformedTransactions = dashboardData.recentTransactions.map(({ transaction, account, category }) => ({
    id: transaction.id,
    description: transaction.description,
    amount: parseFloat(transaction.amount),
    category: category?.name || 'Uncategorized',
    date: transaction.transactionDate.toISOString().split('T')[0],
    account: account?.name || 'Unknown Account'
  }))

  // Transform budgets for display
  const transformedBudgets = dashboardData.budgets.map(budget => {
    const spent = dashboardData.categorySpending
      .filter(cs => budget.categoryIds?.includes(cs.categoryId || ''))
      .reduce((total, cs) => total + Math.abs(parseFloat(cs.totalAmount || '0')), 0)
    
    return {
      id: budget.id,
      name: budget.name,
      spent,
      budget: parseFloat(budget.amount),
      category: budget.description || 'General'
    }
  })

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Welcome back, {user?.firstName}!</h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
            Here&apos;s your financial overview for today
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" className="text-xs sm:text-sm">
            <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Export</span>
            <span className="sm:hidden">Export</span>
          </Button>
          <Button size="sm" className="text-xs sm:text-sm">
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Add Transaction</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-2 lg:grid-cols-5">
        <InsightCard
          title="Total Balance"
          value={`$${dashboardData.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change={{ 
            value: Number(Math.abs(monthlyChange).toFixed(1)), 
            type: monthlyChange >= 0 ? 'increase' : 'decrease', 
            period: 'last month' 
          }}
          icon={<DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />}
          description={`Across ${dashboardData.accounts.length} connected accounts`}
        />
        <InsightCard
          title="This Month"
          value={`$${dashboardData.thisMonthSummary.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change={{ 
            value: Number(Math.abs(monthlyChange).toFixed(1)), 
            type: monthlyChange >= 0 ? 'increase' : 'decrease', 
            period: 'last month' 
          }}
          icon={<TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />}
          description="Total expenses"
        />
        <InsightCard
          title="Budget Progress"
          value={`${Math.round(dashboardData.budgetProgress)}%`}
          icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
          description={dashboardData.budgetProgress > 80 ? "Over budget target" : "On track for monthly goals"}
        />
        <InsightCard
          title="Recurring"
          value={`${dashboardData.recurringSummary.active}/${dashboardData.recurringSummary.total}`}
          change={dashboardData.recurringSummary.due > 0 ? { 
            value: dashboardData.recurringSummary.due, 
            type: 'decrease', 
            period: 'due now' 
          } : undefined}
          icon={<Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />}
          description={`$${dashboardData.recurringSummary.monthlyTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} monthly total`}
        />
        <InsightCard
          title="Income vs Expenses"
          value={`$${dashboardData.thisMonthSummary.netAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change={dashboardData.thisMonthSummary.totalIncome > 0 ? { 
            value: Number(((dashboardData.thisMonthSummary.totalExpenses / dashboardData.thisMonthSummary.totalIncome) * 100).toFixed(1)), 
            type: dashboardData.thisMonthSummary.netAmount >= 0 ? 'increase' : 'decrease', 
            period: 'expense ratio' 
          } : undefined}
          icon={<CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />}
          description="This month's net amount"
        />
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="overview" className="flex-1 sm:flex-none text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="analytics" className="flex-1 sm:flex-none text-xs sm:text-sm">Analytics</TabsTrigger>
          <TabsTrigger value="insights" className="flex-1 sm:flex-none text-xs sm:text-sm">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 sm:space-y-6">
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Spending Trend</CardTitle>
                <CardDescription className="text-sm">Daily spending over the last week</CardDescription>
              </CardHeader>
              <CardContent>
                <SpendingTrendChart data={dashboardData.trendData} />
              </CardContent>
            </Card>

            <CategoryBreakdownWithFilter initialData={dashboardData.categoryData} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <BudgetProgressCard budgets={transformedBudgets} />
            <RecentTransactionsCard transactions={transformedTransactions} />
            <SpendingInsightsCard insights={insights} />
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Comparison</CardTitle>
                <CardDescription>Spending comparison over recent months</CardDescription>
              </CardHeader>
              <CardContent>
                <MonthlyComparisonChart data={dashboardData.monthlyData} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Trends</CardTitle>
                <CardDescription>How your spending categories have changed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.categoryData.map((category) => (
                    <div key={category.category} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="font-medium">{category.category}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <span>${category.amount}</span>
                        <ArrowUpRight className="h-3 w-3 text-green-500" />
                        <span className="text-green-500">+5%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Spending Patterns</CardTitle>
                <CardDescription>AI-powered insights about your habits</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">💡 Smart Insight</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    You spend 40% more on weekends. Consider setting weekend budgets.
                  </p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <h4 className="font-semibold text-green-900 dark:text-green-100">🎯 Goal Progress</h4>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    You&apos;re on track to save $500 this month. Keep it up!
                  </p>
                </div>
                <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                  <h4 className="font-semibold text-orange-900 dark:text-orange-100">⚠️ Watch Out</h4>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                    Entertainment spending is 30% over budget this month.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
                <CardDescription>Personalized tips to improve your finances</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                    <div>
                      <p className="font-medium text-sm">Reduce dining out</p>
                      <p className="text-xs text-muted-foreground">
                        You could save $200/month by cooking at home 2 more times per week
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                    <div>
                      <p className="font-medium text-sm">Set up automatic savings</p>
                      <p className="text-xs text-muted-foreground">
                        Transfer $300 monthly to savings to reach your emergency fund goal
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                    <div>
                      <p className="font-medium text-sm">Review subscriptions</p>
                      <p className="text-xs text-muted-foreground">
                        You have 8 active subscriptions totaling $127/month
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
