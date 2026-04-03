'use client'

import { useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TrendingDown, Calendar, DollarSign, Zap } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import {
  buildSingleDebtComparison,
  buildMultiDebtComparison,
  mergeSchedulesForChart,
  type DebtInput,
  type Strategy,
  type ComparisonResult,
  type PayoffSummary,
  type MultiDebtPayoffResult,
} from '@/lib/debt-calculations'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  debts: DebtInput[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PRESET_AMOUNTS = [0, 50, 100, 200, 500]
const MAX_EXTRA = 2000
const SLIDER_STEP = 25

function tickFormatter(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`
  return `$${value}`
}

function formatMonths(months: number): string {
  if (months === Infinity || months === 0) return '—'
  const y = Math.floor(months / 12)
  const m = months % 12
  if (y === 0) return `${m}mo`
  if (m === 0) return `${y}yr`
  return `${y}yr ${m}mo`
}

function formatPayoffDate(date: Date | undefined): string {
  if (!date) return '—'
  return date.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })
}

// ---------------------------------------------------------------------------
// ChartConfig — colours used by ChartContainer / ChartTooltipContent
// ---------------------------------------------------------------------------

function makeChartConfig(extraLabel: string): ChartConfig {
  return {
    minBalance: {
      label: 'Minimum only',
      color: 'hsl(0 72% 51%)',          // red-500
    },
    extraBalance: {
      label: extraLabel,
      color: 'hsl(142 71% 45%)',         // green-500
    },
  } satisfies ChartConfig
}

// ---------------------------------------------------------------------------
// Summary Cards
// ---------------------------------------------------------------------------

interface SummaryCardsProps {
  result: ComparisonResult
  extraPayment: number
}

function SummaryCards({ result, extraPayment }: SummaryCardsProps) {
  const withExtra = result.withExtra
  const isSingle = 'months' in withExtra
  const months = isSingle
    ? (withExtra as PayoffSummary).months
    : (withExtra as MultiDebtPayoffResult).totalMonths
  const totalInterest = withExtra.totalInterest
  const payoffDate = isSingle
    ? (withExtra as PayoffSummary).payoffDate
    : (withExtra as MultiDebtPayoffResult).debtFreeDate

  const items = [
    {
      label: 'Debt-Free Date',
      value: formatPayoffDate(payoffDate),
      icon: <Calendar className="h-4 w-4 text-muted-foreground" />,
      badge: null,
    },
    {
      label: 'Time to Pay Off',
      value: formatMonths(months),
      icon: <TrendingDown className="h-4 w-4 text-green-500" />,
      badge:
        result.monthsSaved > 0
          ? { text: `${formatMonths(result.monthsSaved)} faster`, color: 'green' }
          : null,
    },
    {
      label: 'Total Interest',
      value: totalInterest === Infinity ? '∞' : formatCurrency(totalInterest),
      icon: <DollarSign className="h-4 w-4 text-orange-500" />,
      badge: null,
    },
    {
      label: 'Interest Saved',
      value:
        result.interestSaved > 0
          ? formatCurrency(result.interestSaved)
          : extraPayment === 0
          ? '—'
          : formatCurrency(0),
      icon: <Zap className="h-4 w-4 text-yellow-500" />,
      badge:
        result.interestSaved > 0
          ? { text: 'vs minimum', color: 'yellow' }
          : null,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border bg-card p-3 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            {item.icon}
          </div>
          <p className="text-base sm:text-lg font-bold leading-tight">{item.value}</p>
          {item.badge && (
            <Badge
              variant="outline"
              className={
                item.badge.color === 'green'
                  ? 'text-green-600 border-green-300 text-xs'
                  : 'text-yellow-600 border-yellow-300 text-xs'
              }
            >
              {item.badge.text}
            </Badge>
          )}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared chart render
// ---------------------------------------------------------------------------

interface DebtChartProps {
  chartData: { label: string; minBalance: number; extraBalance: number }[]
  extraPayment: number
  extraLabel: string
  height?: number
}

function DebtAreaChart({ chartData, extraPayment, extraLabel, height = 280 }: DebtChartProps) {
  const chartConfig = useMemo(() => makeChartConfig(extraLabel), [extraLabel])

  return (
    <ChartContainer config={chartConfig} className={`w-full`} style={{ height }}>
      <AreaChart data={chartData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <defs>
          <linearGradient id="fillMin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-minBalance)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--color-minBalance)" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="fillExtra" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-extraBalance)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--color-extraBalance)" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 11 }}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={tickFormatter}
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          tick={{ fontSize: 11 }}
          width={64}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => formatCurrency(Number(value))}
              indicator="line"
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Area
          type="monotone"
          dataKey="minBalance"
          name="minBalance"
          stroke="var(--color-minBalance)"
          fill="url(#fillMin)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        {extraPayment > 0 && (
          <Area
            type="monotone"
            dataKey="extraBalance"
            name="extraBalance"
            stroke="var(--color-extraBalance)"
            fill="url(#fillExtra)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        )}
      </AreaChart>
    </ChartContainer>
  )
}

// ---------------------------------------------------------------------------
// Per-Debt Chart Tab Content
// ---------------------------------------------------------------------------

interface SingleDebtTabProps {
  debt: DebtInput
  extraPayment: number
}

function SingleDebtTabContent({ debt, extraPayment }: SingleDebtTabProps) {
  const balance = parseFloat(String(debt.currentBalance))
  const apr = parseFloat(String(debt.interestRate))
  const minMonthly = (() => {
    const raw = parseFloat(String(debt.minimumPayment))
    switch (debt.paymentFrequency) {
      case 'weekly': return raw * (52 / 12)
      case 'biweekly': return raw * (26 / 12)
      default: return raw
    }
  })()

  const result = useMemo(
    () => buildSingleDebtComparison(balance, apr, minMonthly, extraPayment),
    [balance, apr, minMonthly, extraPayment],
  )

  const chartData = useMemo(() => {
    const merged = mergeSchedulesForChart(
      (result.minOnly as PayoffSummary).schedule,
      (result.withExtra as PayoffSummary).schedule,
    )
    return [{ label: 'Now', minBalance: balance, extraBalance: balance }, ...merged]
  }, [result, balance])

  if ((result.minOnly as PayoffSummary).months === Infinity) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        Current minimum payment is too low to cover monthly interest. Increase the payment to see
        a projection.
      </div>
    )
  }

  const extraLabel =
    extraPayment > 0 ? `With +${formatCurrency(extraPayment)}/mo` : 'Minimum payment'

  return (
    <div className="space-y-4">
      <SummaryCards result={result} extraPayment={extraPayment} />
      <DebtAreaChart
        chartData={chartData}
        extraPayment={extraPayment}
        extraLabel={extraLabel}
        height={280}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// All-Debts Chart Tab Content
// ---------------------------------------------------------------------------

interface AllDebtsTabProps {
  debts: DebtInput[]
  extraPayment: number
  strategy: Strategy
  onStrategyChange: (s: Strategy) => void
}

function AllDebtsTabContent({
  debts,
  extraPayment,
  strategy,
  onStrategyChange,
}: AllDebtsTabProps) {
  const totalStartBalance = useMemo(
    () => debts.reduce((sum, d) => sum + parseFloat(String(d.currentBalance)), 0),
    [debts],
  )

  const result = useMemo(
    () => buildMultiDebtComparison(debts, extraPayment, strategy),
    [debts, extraPayment, strategy],
  )

  const chartData = useMemo(() => {
    const merged = mergeSchedulesForChart(
      (result.minOnly as MultiDebtPayoffResult).schedule,
      (result.withExtra as MultiDebtPayoffResult).schedule,
    )
    return [
      { label: 'Now', minBalance: totalStartBalance, extraBalance: totalStartBalance },
      ...merged,
    ]
  }, [result, totalStartBalance])

  const extraLabel =
    extraPayment > 0 ? `With +${formatCurrency(extraPayment)}/mo` : 'Minimum only'

  return (
    <div className="space-y-4">
      {/* Strategy Selector */}
      <div className="flex items-center gap-3">
        <p className="text-sm font-medium shrink-0">Payoff strategy:</p>
        <Select value={strategy} onValueChange={(v) => onStrategyChange(v as Strategy)}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="avalanche">Avalanche — highest rate first</SelectItem>
            <SelectItem value="snowball">Snowball — smallest balance first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <SummaryCards result={result} extraPayment={extraPayment} />

      <DebtAreaChart
        chartData={chartData}
        extraPayment={extraPayment}
        extraLabel={extraLabel}
        height={300}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function DebtPayoffProjection({ debts }: Props) {
  const activeDebts = useMemo(
    () => debts.filter((d) => d.status === 'active'),
    [debts],
  )

  const [extraPayment, setExtraPayment] = useState(0)
  const [inputValue, setInputValue] = useState('0')
  const [strategy, setStrategy] = useState<Strategy>('avalanche')
  const [activeTab, setActiveTab] = useState('all')

  if (activeDebts.length === 0) return null

  function applyExtra(amount: number) {
    const clamped = Math.max(0, Math.min(MAX_EXTRA, amount))
    setExtraPayment(clamped)
    setInputValue(String(clamped))
  }

  function handleInputChange(raw: string) {
    setInputValue(raw)
    const parsed = parseInt(raw, 10)
    if (!isNaN(parsed)) applyExtra(parsed)
  }

  function handleInputBlur() {
    const parsed = parseInt(inputValue, 10)
    applyExtra(isNaN(parsed) ? 0 : parsed)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-primary" />
          Payoff Projections
        </CardTitle>
        <CardDescription>
          See how increasing your monthly payment can accelerate debt payoff and reduce total
          interest paid.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium shrink-0">Extra monthly payment:</p>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_AMOUNTS.map((amount) => (
                <Button
                  key={amount}
                  size="sm"
                  variant={extraPayment === amount ? 'default' : 'outline'}
                  className="h-7 px-2.5 text-xs"
                  onClick={() => applyExtra(amount)}
                >
                  {amount === 0 ? 'Min only' : `+$${amount}`}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                type="number"
                min={0}
                max={MAX_EXTRA}
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onBlur={handleInputBlur}
                className="w-20 h-7 text-sm"
              />
            </div>
          </div>
          <Slider
            value={[extraPayment]}
            min={0}
            max={MAX_EXTRA}
            step={SLIDER_STEP}
            onValueChange={([v]) => applyExtra(v)}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>$0 (minimums only)</span>
            <span>${MAX_EXTRA.toLocaleString()}/mo extra</span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="all">All Debts</TabsTrigger>
            {activeDebts.map((debt) => (
              <TabsTrigger key={debt.id} value={debt.id} className="max-w-[140px] truncate">
                {debt.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <AllDebtsTabContent
              debts={activeDebts}
              extraPayment={extraPayment}
              strategy={strategy}
              onStrategyChange={setStrategy}
            />
          </TabsContent>

          {activeDebts.map((debt) => (
            <TabsContent key={debt.id} value={debt.id} className="mt-4">
              <SingleDebtTabContent debt={debt} extraPayment={extraPayment} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}

