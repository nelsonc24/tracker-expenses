'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { YearlyDataPoint } from '@/lib/investment-calculations'

interface Props {
  data: YearlyDataPoint[]
}

export function InvestmentYearTable({ data }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Year-by-Year Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-14">Year</TableHead>
                <TableHead>Total Invested</TableHead>
                <TableHead>Nominal Value</TableHead>
                <TableHead>Real Value</TableHead>
                <TableHead>Returns</TableHead>
                <TableHead className="text-right">Return %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => {
                const returnPct =
                  row.totalInvested > 0
                    ? ((row.nominalValue - row.totalInvested) / row.totalInvested) * 100
                    : 0
                return (
                  <TableRow key={row.year}>
                    <TableCell className="font-medium">{row.year}</TableCell>
                    <TableCell>{formatCurrency(row.totalInvested)}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(row.nominalValue)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatCurrency(row.realValue)}</TableCell>
                    <TableCell className="text-green-600 dark:text-green-400">
                      +{formatCurrency(row.totalReturns)}
                    </TableCell>
                    <TableCell className="text-right text-green-600 dark:text-green-400">
                      +{returnPct.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
