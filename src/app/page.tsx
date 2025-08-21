import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthButton } from "@/components/auth-button";
import { BarChart3, CreditCard, PieChart, TrendingUp } from "lucide-react";
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
            <Link href="/dashboard">
              <Button size="lg" className="text-lg px-8">
                Get Started
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="text-lg px-8">
              Learn More
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
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
          <Card className="max-w-4xl mx-auto">
            <CardContent className="p-8">
              <div className="bg-gradient-to-br from-primary/10 to-blue-500/10 rounded-lg p-8 text-center">
                <p className="text-lg text-muted-foreground">
                  🚧 Dashboard Preview Coming Soon
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Interactive charts, spending insights, and financial analytics
                </p>
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
