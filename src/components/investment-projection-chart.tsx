'use client'

import {
  LineChart,
  Line,
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
  return (
    <div
      style={{
        backgroundColor: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        borderRadius: 8,
        padding: '10px 14px',
        minWidth: 220,
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
      }}
    >
      <p style={{ fontWeight: 600, marginBottom: 8, fontSize: 13, color: 'hsl(var(--foreground))' }}>
        Year {label}
      </p>
      {payload.map((entry: { name: string; value: number; color: string }) => (
        <div
          key={entry.name}
          style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}
        >
          <span style={{ color: entry.color, fontSize: 12 }}>{entry.name}</span>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--foreground))' }}>
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function InvestmentProjectionChart({ data }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Portfolio Growth</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
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
            <Line
              type="monotone"
              dataKey="nominalValue"
              name="Base (Nominal)"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="bullValue"
              name={`Bull (+4%)`}
              stroke="#22c55e"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="bearValue"
              name={`Bear (−4%)`}
              stroke="#ef4444"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="realValue"
              name="Inflation-Adjusted"
              stroke="#a855f7"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
