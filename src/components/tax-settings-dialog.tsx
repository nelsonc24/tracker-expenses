'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

interface TaxSettings {
  annualSalary: number | null
  employerSuperRate: number
  salarySacrificeAmount: number
  personalSuperContributions: number
  hasPrivateHealthInsurance: boolean
}

interface TaxSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings?: TaxSettings
  onSaved: (settings: TaxSettings) => void
}

export function TaxSettingsDialog({
  open,
  onOpenChange,
  settings: propSettings,
  onSaved,
}: TaxSettingsDialogProps) {
  const [salary, setSalary] = useState('')
  const [superRate, setSuperRate] = useState('11.5')
  const [sacrifice, setSacrifice] = useState('0')
  const [personalSuper, setPersonalSuper] = useState('0')
  const [privateHealth, setPrivateHealth] = useState(false)
  const [saving, setSaving] = useState(false)

  // When dialog opens and no settings provided via props, fetch from API
  useEffect(() => {
    if (!open) return
    if (propSettings) {
      setSalary(propSettings.annualSalary?.toString() ?? '')
      setSuperRate(propSettings.employerSuperRate.toString())
      setSacrifice(propSettings.salarySacrificeAmount.toString())
      setPersonalSuper(propSettings.personalSuperContributions.toString())
      setPrivateHealth(propSettings.hasPrivateHealthInsurance)
      return
    }
    fetch('/api/tax/settings')
      .then((r) => r.json())
      .then((data: TaxSettings) => {
        setSalary(data.annualSalary?.toString() ?? '')
        setSuperRate(data.employerSuperRate.toString())
        setSacrifice(data.salarySacrificeAmount.toString())
        setPersonalSuper(data.personalSuperContributions.toString())
        setPrivateHealth(data.hasPrivateHealthInsurance)
      })
      .catch(() => {
        setSalary('')
        setSuperRate('11.5')
        setSacrifice('0')
        setPersonalSuper('0')
        setPrivateHealth(false)
      })
  }, [open, propSettings])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/tax/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          annualSalary: salary ? parseFloat(salary) : null,
          employerSuperRate: parseFloat(superRate) || 11.5,
          salarySacrificeAmount: parseFloat(sacrifice) || 0,
          personalSuperContributions: parseFloat(personalSuper) || 0,
          hasPrivateHealthInsurance: privateHealth,
        }),
      })
      if (!res.ok) throw new Error('Failed to save settings')
      toast.success('Tax settings saved')
      onSaved({
        annualSalary: salary ? parseFloat(salary) : null,
        employerSuperRate: parseFloat(superRate) || 11.5,
        salarySacrificeAmount: parseFloat(sacrifice) || 0,
        personalSuperContributions: parseFloat(personalSuper) || 0,
        hasPrivateHealthInsurance: privateHealth,
      })
      onOpenChange(false)
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tax Settings — FY 2025-26</DialogTitle>
          <DialogDescription>
            Enter your income and super details for an estimated tax saving. Figures are estimates
            only — consult a registered tax agent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="salary">Annual Gross Salary (AUD)</Label>
            <Input
              id="salary"
              type="number"
              min="0"
              step="1000"
              placeholder="e.g. 95000"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="superRate">Employer Super Rate (%)</Label>
            <Input
              id="superRate"
              type="number"
              min="0"
              max="30"
              step="0.5"
              placeholder="11.5"
              value={superRate}
              onChange={(e) => setSuperRate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">FY 2025-26 SG rate is 11.5%</p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="sacrifice">Salary Sacrifice (FY total, AUD)</Label>
            <Input
              id="sacrifice"
              type="number"
              min="0"
              step="500"
              placeholder="0"
              value={sacrifice}
              onChange={(e) => setSacrifice(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="personalSuper">Personal Deductible Super Contributions (AUD)</Label>
            <Input
              id="personalSuper"
              type="number"
              min="0"
              step="500"
              placeholder="0"
              value={personalSuper}
              onChange={(e) => setPersonalSuper(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Amounts you&apos;ve contributed and will claim via a Notice of Intent
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="privateHealth"
              checked={privateHealth}
              onCheckedChange={(v) => setPrivateHealth(!!v)}
            />
            <Label htmlFor="privateHealth" className="cursor-pointer">
              I have private hospital insurance (avoids MLS surcharge for incomes over $93k)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Settings'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
