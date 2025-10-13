import { currentUser } from '@clerk/nextjs/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  CreditCard,
  ArrowUpRight,
  Calendar,
  Receipt,
  Landmark
} from 'lucide-react'
import { 
  InsightCard, 
  RecentTransactionsCard,
  SpendingInsightsCard 
} from '@/components/dashboard-insights'
import { BudgetProgressCard } from '@/components/budget-progress-card'
import { SpendingTrendCard } from '@/components/spending-trend-card'
import {
  MonthlyComparisonChart, 
} from '@/components/charts'
import { CategoryBreakdownWithFilter } from '@/components/category-breakdown-with-filter'
import { ChartColorSettings, InlineChartColorSettings } from '@/components/chart-color-settings'
import { DashboardActions } from '@/components/dashboard-actions'
import { 
  getCurrentUser,
  createOrUpdateUser,
  getUserTransactions,
  getUserAccountsWithBalance,
  getUserCategories,
  getUserBudgets,
  getTransactionSummary,
  getCategorySpending,
  getRecurringTransactionsSummary,
  getBillsSummary,
  getDebtsSummary
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
    thisMonthCategorySpending,
    last30DaysTransactions,
    recurringSummary,
    billsSummary,
    debtsSummary
  ] = await Promise.all([
    getUserAccountsWithBalance(userId),
    getUserCategories(userId),
    getUserBudgets(userId),
    getUserTransactions(userId, { limit: 10, sortBy: 'date', sortOrder: 'desc' }),
    getTransactionSummary(userId, startOfMonth, endOfMonth),
    getTransactionSummary(userId, startOfLastMonth, endOfLastMonth),
    getCategorySpending(userId), // All-time category spending for charts
    getCategorySpending(userId, startOfMonth, endOfMonth), // Current month for budget progress
    getUserTransactions(userId, { 
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: now,
      limit: 1000 
    }),
    getRecurringTransactionsSummary(userId),
    getBillsSummary(userId),
    getDebtsSummary(userId)
  ])

  // Calculate total balance across accounts using calculated balances
  const totalBalance = accounts.reduce((sum: number, account: { calculatedBalance: number }) => 
    sum + account.calculatedBalance, 0
  )

  // Calculate budget progress for CURRENT MONTH only
  const budgetProgress = budgets.length > 0 
    ? budgets.reduce((sum, budget) => {
        const spent = thisMonthCategorySpending
          .filter(cs => budget.categoryIds?.includes(cs.categoryId || ''))
          .reduce((total, cs) => total + Math.abs(parseFloat(cs.totalAmount || '0')), 0)
        return sum + (spent / parseFloat(budget.amount))
      }, 0) / budgets.length * 100
    : 0

  // Generate trend data from last 30 days - aggregate by date
  const dailySpending = new Map<string, number>()
  
  // Group transactions by date and sum ONLY expenses (negative amounts)
  // Spending trend should show how much was spent, not income
  last30DaysTransactions.forEach(({ transaction }) => {
    const date = transaction.transactionDate.toISOString().split('T')[0]
    const amount = parseFloat(transaction.amount)
    // Only count expenses (negative amounts)
    if (amount < 0) {
      const expense = Math.abs(amount)
      dailySpending.set(date, (dailySpending.get(date) || 0) + expense)
    }
  })
  
  // Convert to array and get last 7 days
  const trendData = Array.from(dailySpending.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7) // Last 7 days

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
    recurringSummary,
    billsSummary,
    debtsSummary
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

  // Calculate balance change (Total Balance change indicator)
  // For now, we'll use net amount as a proxy for balance change
  const balanceChange = dashboardData.thisMonthSummary.netAmount
  const balanceChangePercentage = dashboardData.totalBalance > 0 
    ? Math.abs((balanceChange / dashboardData.totalBalance) * 100)
    : 0

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
          <ChartColorSettings />
          <DashboardActions 
            accounts={dashboardData.accounts.map(a => ({
              id: a.id,
              name: a.name,
              institution: a.institution
            }))}
            categories={dashboardData.categories.map(c => ({
              id: c.id,
              name: c.name
            }))}
          />
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <InsightCard
          title="Total Balance"
          value={`$${dashboardData.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change={{ 
            value: Number(balanceChangePercentage.toFixed(1)), 
            type: balanceChange >= 0 ? 'increase' : 'decrease', 
            period: 'this month' 
          }}
          icon={<DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />}
          description={`Across ${dashboardData.accounts.length} connected accounts`}
          href="/accounts"
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
          href="/transactions"
        />
        <InsightCard
          title="Budget Progress"
          value={`${Math.round(dashboardData.budgetProgress)}%`}
          icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
          description={`This month: ${dashboardData.budgetProgress > 80 ? "Over budget target" : "On track"}`}
          href="/budgets"
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
          href="/bills"
        />
        <InsightCard
          title="Bills & Projections"
          value={`$${dashboardData.billsSummary.monthlyTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change={dashboardData.billsSummary.upcomingDue > 0 ? { 
            value: dashboardData.billsSummary.upcomingDue, 
            type: 'decrease', 
            period: 'due this week' 
          } : undefined}
          icon={<Receipt className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />}
          description={`${dashboardData.billsSummary.activeBills} active bills tracked`}
          href="/bills"
        />
        <InsightCard
          title="Debt Tracking"
          value={`$${dashboardData.debtsSummary.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change={dashboardData.debtsSummary.totalDebts > 0 ? { 
            value: Number(dashboardData.debtsSummary.avgInterestRate.toFixed(1)), 
            type: 'decrease', 
            period: 'avg rate' 
          } : undefined}
          icon={<Landmark className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />}
          description={`$${dashboardData.debtsSummary.monthlyPayments.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} monthly payments`}
          href="/debts"
        />
        <InsightCard
          title="Income vs Expenses"
          value={`$${dashboardData.thisMonthSummary.netAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change={dashboardData.thisMonthSummary.totalIncome > 0 && dashboardData.thisMonthSummary.totalExpenses > 0 ? { 
            value: Number(((dashboardData.thisMonthSummary.totalExpenses / dashboardData.thisMonthSummary.totalIncome) * 100).toFixed(1)), 
            type: dashboardData.thisMonthSummary.netAmount >= 0 ? 'increase' : 'decrease', 
            period: 'spending rate' 
          } : undefined}
          icon={<CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />}
          description={`Income: $${dashboardData.thisMonthSummary.totalIncome.toLocaleString()} | Expenses: $${dashboardData.thisMonthSummary.totalExpenses.toLocaleString()}`}
          href="/transactions"
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
            <SpendingTrendCard initialData={dashboardData.trendData} />

            <CategoryBreakdownWithFilter initialData={dashboardData.categoryData} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <BudgetProgressCard initialBudgets={transformedBudgets} />
            <RecentTransactionsCard transactions={transformedTransactions} />
            <SpendingInsightsCard insights={insights} />
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Monthly Comparison</CardTitle>
                    <CardDescription>Spending comparison over recent months</CardDescription>
                  </div>
                  <InlineChartColorSettings />
                </div>
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
                        <span>${Math.abs(category.amount).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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

          {/* Bills & Projections Insights */}
          {dashboardData.billsSummary.activeBills > 0 && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Bills & Projections Overview</CardTitle>
                  <CardDescription>Your upcoming recurring bill schedule</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Projected Total</p>
                      <p className="text-2xl font-bold">${dashboardData.billsSummary.monthlyTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <Receipt className="h-8 w-8 text-muted-foreground" />
                  </div>
                  {dashboardData.billsSummary.nextBillName && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                      <h4 className="font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Next Bill Due
                      </h4>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        {dashboardData.billsSummary.nextBillName}: ${dashboardData.billsSummary.nextBillAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        Due: {new Date(dashboardData.billsSummary.nextBillDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                  {dashboardData.billsSummary.upcomingDue > 0 && (
                    <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                      <h4 className="font-semibold text-red-900 dark:text-red-100">⏰ Upcoming This Week</h4>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        You have {dashboardData.billsSummary.upcomingDue} bill{dashboardData.billsSummary.upcomingDue > 1 ? 's' : ''} due in the next 7 days. Make sure you have sufficient funds!
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Bill Management Tips</CardTitle>
                  <CardDescription>Stay on top of your recurring expenses</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                    <div>
                      <p className="font-medium text-sm">Track All Bills</p>
                      <p className="text-xs text-muted-foreground">
                        You&apos;re tracking {dashboardData.billsSummary.activeBills} recurring bills. Review and update regularly to ensure accurate projections.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                    <div>
                      <p className="font-medium text-sm">Enable Auto-Pay</p>
                      <p className="text-xs text-muted-foreground">
                        Consider setting up auto-pay for bills to avoid late fees and improve your credit score.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                    <div>
                      <p className="font-medium text-sm">Plan Ahead</p>
                      <p className="text-xs text-muted-foreground">
                        Review your bill projections to plan your cash flow and avoid surprises.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Debt Tracking Insights */}
          {dashboardData.debtsSummary.totalDebts > 0 && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Debt Overview</CardTitle>
                  <CardDescription>Your debt payoff journey</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Debt Balance</p>
                      <p className="text-2xl font-bold text-red-600">${dashboardData.debtsSummary.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <Landmark className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Active Debts</p>
                      <p className="text-xl font-bold">{dashboardData.debtsSummary.totalDebts}</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Avg Interest Rate</p>
                      <p className="text-xl font-bold">{dashboardData.debtsSummary.avgInterestRate.toFixed(1)}%</p>
                    </div>
                  </div>
                  {dashboardData.debtsSummary.highestInterestDebt && (
                    <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                      <h4 className="font-semibold text-orange-900 dark:text-orange-100">🎯 Priority Debt</h4>
                      <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                        {dashboardData.debtsSummary.highestInterestDebt.name} at {dashboardData.debtsSummary.highestInterestDebt.rate.toFixed(1)}% interest
                      </p>
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        Balance: ${dashboardData.debtsSummary.highestInterestDebt.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Debt Payoff Strategies</CardTitle>
                  <CardDescription>Accelerate your path to debt freedom</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                    <div>
                      <p className="font-medium text-sm">Pay More Than Minimum</p>
                      <p className="text-xs text-muted-foreground">
                        Your monthly minimum payments total ${dashboardData.debtsSummary.monthlyPayments.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Even $50 extra per month can save thousands in interest.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                    <div>
                      <p className="font-medium text-sm">Target High-Interest First</p>
                      <p className="text-xs text-muted-foreground">
                        Focus on paying off high-interest debts first to minimize total interest paid over time.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                    <div>
                      <p className="font-medium text-sm">Track Your Progress</p>
                      <p className="text-xs text-muted-foreground">
                        Log all debt payments to visualize your payoff timeline and stay motivated.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
