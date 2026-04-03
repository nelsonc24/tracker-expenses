'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SaveScenarioDialog } from '@/components/save-scenario-dialog'
import { INVESTMENT_TYPE_PRESETS, type ProjectionInput } from '@/lib/investment-calculations'

type FormState = ProjectionInput & { investmentType: string }

interface Props {
  onCalculate: (input: ProjectionInput) => void
  initialValues?: FormState
  onScenarioSaved?: () => void
}

const DEFAULT_INPUT: FormState = {
  investmentType: 'etf',
  initialAmount: 10000,
  monthlyContribution: 500,
  annualReturnRate: 8,
  years: 20,
  inflationRate: 2.5,
  contributionIncreaseRate: 0,
  taxRate: 0,
}

export function InvestmentCalculatorForm({ onCalculate, initialValues, onScenarioSaved }: Props) {
  const [form, setForm] = useState<FormState>(initialValues ?? DEFAULT_INPUT)
  const [saveOpen, setSaveOpen] = useState(false)

  // Re-populate when a saved scenario is loaded
  useEffect(() => {
    if (initialValues) {
      setForm(initialValues)
    }
  }, [initialValues])

  // Recalculate on every change
  useEffect(() => {
    onCalculate(form)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form])

  function setField(key: keyof FormState, raw: string) {
    const value = parseFloat(raw)
    if (isNaN(value)) return
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleTypeChange(type: string) {
    const preset = INVESTMENT_TYPE_PRESETS[type]
    setForm((prev) => ({
      ...prev,
      investmentType: type,
      annualReturnRate: preset?.returnRate ?? prev.annualReturnRate,
    }))
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Calculator Inputs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Investment Type */}
          <div className="space-y-1.5">
            <Label>Investment Type</Label>
            <Select
              value={form.investmentType}
              onValueChange={handleTypeChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(INVESTMENT_TYPE_PRESETS).map(([key, preset]) => (
                  <SelectItem key={key} value={key}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Initial Amount */}
          <div className="space-y-1.5">
            <Label>Initial Lump Sum ($)</Label>
            <Input
              type="number"
              min={0}
              value={form.initialAmount}
              onChange={(e) => setField('initialAmount', e.target.value)}
            />
          </div>

          {/* Monthly Contribution */}
          <div className="space-y-1.5">
            <Label>Monthly Contribution ($)</Label>
            <Input
              type="number"
              min={0}
              value={form.monthlyContribution}
              onChange={(e) => setField('monthlyContribution', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Annual Return Rate */}
            <div className="space-y-1.5">
              <Label>Return Rate (% p.a.)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={form.annualReturnRate}
                onChange={(e) => setField('annualReturnRate', e.target.value)}
              />
            </div>
            {/* Time Horizon */}
            <div className="space-y-1.5">
              <Label>Time Horizon (years)</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={form.years}
                onChange={(e) => setField('years', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Inflation Rate */}
            <div className="space-y-1.5">
              <Label>Inflation Rate (%)</Label>
              <Input
                type="number"
                min={0}
                max={30}
                step={0.1}
                value={form.inflationRate}
                onChange={(e) => setField('inflationRate', e.target.value)}
              />
            </div>
            {/* Contribution Increase */}
            <div className="space-y-1.5">
              <Label>Contribution Growth (% p.a.)</Label>
              <Input
                type="number"
                min={0}
                max={50}
                step={0.1}
                value={form.contributionIncreaseRate}
                onChange={(e) => setField('contributionIncreaseRate', e.target.value)}
              />
            </div>
          </div>

          {/* Tax Rate */}
          <div className="space-y-1.5">
            <Label>Capital Gains Tax (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={form.taxRate}
              onChange={(e) => setField('taxRate', e.target.value)}
            />
          </div>

          <Button variant="outline" className="w-full" onClick={() => setSaveOpen(true)}>
            Save Scenario
          </Button>
        </CardContent>
      </Card>

      <SaveScenarioDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        input={form}
        onSaved={() => {
          onScenarioSaved?.()
          setSaveOpen(false)
        }}
      />
    </>
  )
}
