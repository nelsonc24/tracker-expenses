import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthButton } from "@/components/auth-button";
import { GetStartedButton } from "@/components/get-started-button";
import { BarChart3, CreditCard, PieChart, TrendingUp, DollarSign } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Expenses Tracker</h1>
          </div>
          <div className="flex items-center space-x-4">
            <AuthButton />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Smart Personal Finance Management
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Track your spending, set budgets, and gain insights into your financial health 
            with our modern expense tracking app built for Australians.
          </p>
          <div className="flex gap-4 justify-center">
            <GetStartedButton />
            <Link href="#features-section">
              <Button variant="outline" size="lg" className="text-lg px-8">
                Learn More
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div id="features-section" className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center">
            <CardHeader>
              <CreditCard className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Bank Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Connect your Australian bank accounts securely via Open Banking (CDR)
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <PieChart className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Smart Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Get automated insights and visualizations of your spending patterns
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <TrendingUp className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Budget Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Set budgets, track progress, and get alerts before you overspend
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <BarChart3 className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>CSV Import</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Import transactions from CSV files with intelligent categorization
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Preview Section */}
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-4">Beautiful, Modern Interface</h3>
          <p className="text-muted-foreground mb-8">
            Enjoy a clean, responsive design with dark/light themes and comprehensive accessibility support
          </p>
          
          {/* Dashboard Preview */}
          <Card className="max-w-6xl mx-auto">
            <CardContent className="p-8">
              <div className="grid gap-6">
                {/* Overview Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">Total Balance</span>
                    </div>
                    <div className="text-2xl font-bold text-green-800 dark:text-green-200">$12,450</div>
                    <div className="text-xs text-green-600 dark:text-green-400">+2.3% this month</div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">This Month</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">$2,840</div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">-5.1% vs last month</div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <BarChart3 className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Budget Progress</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">74%</div>
                    <div className="text-xs text-purple-600 dark:text-purple-400">On track for goals</div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <PieChart className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Top Category</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-800 dark:text-orange-200">Groceries</div>
                    <div className="text-xs text-orange-600 dark:text-orange-400">$680 this month</div>
                  </div>
                </div>

                {/* Charts Preview */}
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Spending Trend */}
                  <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/50 rounded-lg">
                    <h4 className="font-semibold mb-4 flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <span>Spending Trends</span>
                    </h4>
                    <div className="h-32 flex items-end justify-between space-x-1">
                      {[45, 62, 38, 71, 55, 48, 67].map((height, i) => (
                        <div key={i} className="flex-1 bg-primary/20 rounded-t" style={{ height: `${height}%` }} />
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground text-center">7-day spending pattern</div>
                  </div>

                  {/* Category Breakdown */}
                  <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/50 rounded-lg">
                    <h4 className="font-semibold mb-4 flex items-center space-x-2">
                      <PieChart className="h-5 w-5 text-primary" />
                      <span>Category Breakdown</span>
                    </h4>
                    <div className="space-y-3">
                      {[
                        { name: 'Groceries', amount: '$680', width: '34%', color: 'bg-green-500' },
                        { name: 'Entertainment', amount: '$340', width: '17%', color: 'bg-purple-500' },
                        { name: 'Transport', amount: '$220', width: '11%', color: 'bg-blue-500' },
                        { name: 'Dining', amount: '$465', width: '23%', color: 'bg-orange-500' },
                      ].map((cat, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 flex-1">
                            <div className={`w-3 h-3 rounded ${cat.color}`} />
                            <span className="text-sm">{cat.name}</span>
                          </div>
                          <div className="text-sm font-medium">{cat.amount}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Features Highlight */}
                <div className="mt-8 p-6 bg-gradient-to-r from-primary/5 to-blue-500/5 rounded-lg border border-primary/10">
                  <div className="grid gap-4 md:grid-cols-3 text-center">
                    <div>
                      <BarChart3 className="h-8 w-8 text-primary mx-auto mb-2" />
                      <h5 className="font-semibold mb-1">Interactive Charts</h5>
                      <p className="text-sm text-muted-foreground">Drill down into your spending with interactive visualizations</p>
                    </div>
                    <div>
                      <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
                      <h5 className="font-semibold mb-1">Smart Insights</h5>
                      <p className="text-sm text-muted-foreground">AI-powered analysis of your financial patterns</p>
                    </div>
                    <div>
                      <PieChart className="h-8 w-8 text-primary mx-auto mb-2" />
                      <h5 className="font-semibold mb-1">Real-time Updates</h5>
                      <p className="text-sm text-muted-foreground">Live budget tracking and spending alerts</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>&copy; 2025 Expenses Tracker. Built with Next.js, shadcn/ui, and ❤️</p>
        </div>
      </footer>
    </div>
  );
}
