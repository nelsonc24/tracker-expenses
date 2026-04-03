'use client'

import { useCallback, useEffect, useState } from 'react'
import { TrendingUp, DollarSign, BarChart2, Landmark } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InvestmentCalculatorForm } from '@/components/investment-calculator-form'
import { InvestmentProjectionChart } from '@/components/investment-projection-chart'
import { InvestmentGrowthBar } from '@/components/investment-growth-bar'
import { InvestmentYearTable } from '@/components/investment-year-table'
import { InvestmentMilestones } from '@/components/investment-milestones'
import { InvestmentScenariosPanel } from '@/components/investment-scenarios-panel'
import { calculateProjection, type ProjectionInput, type ProjectionResult } from '@/lib/investment-calculations'
import { formatCurrency } from '@/lib/utils'
import type { SelectInvestmentScenario } from '@/db/schema'

const DEFAULT_INPUT: ProjectionInput & { investmentType: string } = {
  investmentType: 'etf',
  initialAmount: 10000,
  monthlyContribution: 500,
  annualReturnRate: 8,
  years: 20,
  inflationRate: 2.5,
  contributionIncreaseRate: 0,
  taxRate: 0,
}

export default function InvestmentsPage() {
  const [result, setResult] = useState<ProjectionResult>(() => calculateProjection(DEFAULT_INPUT))
  const [loadedInput, setLoadedInput] = useState<(ProjectionInput & { investmentType: string }) | undefined>(undefined)
  const [scenarios, setScenarios] = useState<SelectInvestmentScenario[]>([])
  const [scenariosLoading, setScenariosLoading] = useState(true)

  const fetchScenarios = useCallback(async () => {
    try {
      const res = await fetch('/api/investments')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setScenarios(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Failed to load saved scenarios')
    } finally {
      setScenariosLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchScenarios()
  }, [fetchScenarios])

  function handleCalculate(input: ProjectionInput) {
    setResult(calculateProjection(input))
  }

  function handleLoadScenario(input: ProjectionInput & { investmentType: string }) {
    setLoadedInput({ ...input })
    setResult(calculateProjection(input))
    toast.success('Scenario loaded')
  }

  const { summary, yearlyData, milestones } = result

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" />
          Investment Projections
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Model compound growth across bear, base, and bull scenarios. Save projections for later.
        </p>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              Final Value
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xl font-bold">{formatCurrency(summary.finalValue)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Nominal (base rate)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5" />
              Total Returns
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xl font-bold text-green-600 dark:text-green-400">
              +{formatCurrency(summary.totalReturns)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              on {formatCurrency(summary.totalInvested)} invested
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5" />
              Real Value
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
              {formatCurrency(summary.realFinalValue)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">After inflation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              After Tax
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xl font-bold">{formatCurrency(summary.afterTaxValue)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Net of CGT on gains</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Layout: Form + Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
        {/* Left: Calculator Form */}
        <div>
          <InvestmentCalculatorForm
            onCalculate={handleCalculate}
            initialValues={loadedInput}
            onScenarioSaved={fetchScenarios}
          />
        </div>

        {/* Right: Charts + Table */}
        <div className="space-y-4">
          <Tabs defaultValue="growth">
            <TabsList className="mb-2">
              <TabsTrigger value="growth">Growth Chart</TabsTrigger>
              <TabsTrigger value="breakdown">Invested vs Returns</TabsTrigger>
              <TabsTrigger value="table">Year-by-Year</TabsTrigger>
            </TabsList>
            <TabsContent value="growth">
              <InvestmentProjectionChart data={yearlyData} />
            </TabsContent>
            <TabsContent value="breakdown">
              <InvestmentGrowthBar data={yearlyData} />
            </TabsContent>
            <TabsContent value="table">
              <InvestmentYearTable data={yearlyData} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Milestones */}
      <InvestmentMilestones
        milestones={milestones}
        years={yearlyData.length}
      />

      {/* Saved Scenarios */}
      {!scenariosLoading && (
        <InvestmentScenariosPanel
          scenarios={scenarios}
          onLoad={handleLoadScenario}
          onDeleted={fetchScenarios}
        />
      )}
    </div>
  )
}
