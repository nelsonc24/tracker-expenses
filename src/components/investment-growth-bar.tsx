'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { YearlyDataPoint } from '@/lib/investment-calculations'

interface Props {
  data: YearlyDataPoint[]
}

function tickFormatter(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`
  return `$${value}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const invested = payload.find((p: { dataKey: string }) => p.dataKey === 'totalInvested')?.value ?? 0
  const returns = payload.find((p: { dataKey: string }) => p.dataKey === 'totalReturns')?.value ?? 0
  return (
    <div
      style={{
        backgroundColor: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        borderRadius: 8,
        padding: '10px 14px',
        minWidth: 200,
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
      }}
    >
      <p style={{ fontWeight: 600, marginBottom: 8, fontSize: 13, color: 'hsl(var(--foreground))' }}>
        Year {label}
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
        <span style={{ color: 'hsl(var(--primary))', fontSize: 12 }}>Invested</span>
        <span style={{ fontSize: 12, fontWeight: 500 }}>{formatCurrency(invested)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
        <span style={{ color: '#22c55e', fontSize: 12 }}>Returns</span>
        <span style={{ fontSize: 12, fontWeight: 500 }}>{formatCurrency(returns)}</span>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          marginTop: 6,
          paddingTop: 6,
          borderTop: '1px solid hsl(var(--border))',
        }}
      >
        <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>Total</span>
        <span style={{ fontSize: 12, fontWeight: 600 }}>{formatCurrency(invested + returns)}</span>
      </div>
    </div>
  )
}

export function InvestmentGrowthBar({ data }: Props) {
  // Group by 5-year intervals when horizon > 20
  const displayData =
    data.length > 20
      ? data.filter((d) => d.year % 5 === 0 || d.year === 1)
      : data

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Invested vs Returns</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={displayData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="year"
              tickFormatter={(v) => `Yr ${v}`}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              tickFormatter={tickFormatter}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              width={70}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="totalInvested" name="Total Invested" stackId="a" fill="hsl(var(--primary))" />
            <Bar dataKey="totalReturns" name="Returns" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
