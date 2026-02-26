'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { GoalWithStats } from './goal-card'

// ── Preset Goal Types ──────────────────────────────────────────────────────
const PRESET_TYPES = [
  { type: 'vacation',       emoji: '✈️', label: 'Vacation' },
  { type: 'emergency_fund', emoji: '🛡️', label: 'Emergency Fund' },
  { type: 'car',            emoji: '🚗', label: 'New Car' },
  { type: 'home',           emoji: '🏠', label: 'Home / Deposit' },
  { type: 'education',      emoji: '🎓', label: 'Education' },
  { type: 'wedding',        emoji: '💍', label: 'Wedding' },
  { type: 'retirement',     emoji: '🌴', label: 'Retirement' },
  { type: 'custom',         emoji: '✨', label: 'Custom Goal' },
]

const COLOR_PALETTE = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
]

// ── Form Schema ────────────────────────────────────────────────────────────
const formSchema = z.object({
  name: z.string().min(1, 'Goal name is required').max(60),
  emoji: z.string().min(1, 'Pick an emoji'),
  description: z.string().max(300).optional().or(z.literal('')),
  type: z.string(),
  color: z.string(),
  targetAmount: z.string().regex(/^\d+\.?\d{0,2}$/, 'Enter a valid amount'),
  saveFrequency: z.enum(['weekly', 'fortnightly', 'monthly', 'none']),
  saveAmount: z.string().regex(/^\d*\.?\d{0,2}$/).optional().or(z.literal('')),
  targetDate: z.string().optional().or(z.literal('')),
})

type FormValues = z.infer<typeof formSchema>

interface AddGoalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editGoal?: GoalWithStats | null
  onSaved: (goal: GoalWithStats) => void
}

export function AddGoalDialog({ open, onOpenChange, editGoal, onSaved }: AddGoalDialogProps) {
  const isEdit = Boolean(editGoal)
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedPreset, setSelectedPreset] = useState<(typeof PRESET_TYPES)[number] | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: editGoal
      ? {
          name: editGoal.name,
          emoji: editGoal.emoji,
          description: editGoal.description ?? '',
          type: editGoal.type,
          color: editGoal.color,
          targetAmount: editGoal.targetAmount,
          saveFrequency: (editGoal.saveFrequency as FormValues['saveFrequency']) ?? 'none',
          saveAmount: editGoal.saveAmount ?? '',
          targetDate: editGoal.targetDate
            ? new Date(editGoal.targetDate).toISOString().slice(0, 10)
            : '',
        }
      : {
          name: '',
          emoji: '🎯',          description: '',          type: 'custom',
          color: '#6366f1',
          targetAmount: '',
          saveFrequency: 'none',
          saveAmount: '',
          targetDate: '',
        },
  })

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = form
  const watchedColor = watch('color')
  const watchedFreq = watch('saveFrequency')

  function handlePresetSelect(preset: typeof PRESET_TYPES[number]) {
    setSelectedPreset(preset)
    setValue('type', preset.type)
    setValue('emoji', preset.emoji)
    if (preset.type !== 'custom') {
      setValue('name', preset.label)
    }
  }

  async function onSubmit(values: FormValues) {
    try {
      const payload = {
        name: values.name,
        emoji: values.emoji,
        description: values.description || null,
        type: values.type,
        color: values.color,
        targetAmount: values.targetAmount,
        saveFrequency: values.saveFrequency === 'none' ? null : values.saveFrequency,
        saveAmount: values.saveAmount || null,
        targetDate: values.targetDate || null,
        currency: 'AUD',
        status: 'active',
      }

      const url = isEdit ? `/api/goals/${editGoal!.id}` : '/api/goals'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('Failed to save goal')

      const saved = await res.json()
      toast.success(isEdit ? 'Goal updated!' : 'Goal created! Let\'s start saving 🎉')
      onSaved({ ...saved, percentComplete: saved.percentComplete ?? 0 })
      onOpenChange(false)
      form.reset()
      setStep(1)
      setSelectedPreset(null)
    } catch {
      toast.error('Something went wrong. Please try again.')
    }
  }

  function handleClose(open: boolean) {
    if (!open) {
      form.reset()
      setStep(1)
      setSelectedPreset(null)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Goal' : step === 1 ? 'What are you saving for?' : 'Set your target'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update your saving goal details.'
              : step === 1
              ? 'Pick a preset or create your own custom goal.'
              : 'Define the amount, frequency, and optional deadline.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1 — Pick preset or custom (only for new goals) */}
        {!isEdit && step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {PRESET_TYPES.map((preset) => (
                <button
                  key={preset.type}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all',
                    'hover:border-primary hover:bg-accent',
                    selectedPreset?.type === preset.type
                      ? 'border-primary bg-accent ring-2 ring-primary/30'
                      : 'border-border'
                  )}
                >
                  <span className="text-2xl">{preset.emoji}</span>
                  <span className="text-xs font-medium leading-tight">{preset.label}</span>
                </button>
              ))}
            </div>

            {/* If custom, show name + emoji input inline */}
            {selectedPreset?.type === 'custom' && (
              <div className="space-y-2">
                <Label>Goal name</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. New MacBook"
                    {...register('name')}
                    className="flex-1"
                  />
                  <Input
                    placeholder="✨"
                    {...register('emoji')}
                    className="w-16 text-center text-xl"
                  />
                </div>
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
            )}

            <Button
              className="w-full"
              disabled={!selectedPreset}
              onClick={() => setStep(2)}
            >
              Continue →
            </Button>
          </div>
        )}

        {/* Step 2 (or edit form) — Details */}
        {(isEdit || step === 2) && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name (editable always) */}
            <div className="space-y-1.5">
              <Label>Goal name</Label>
              <div className="flex gap-2">
                <Input placeholder="Goal name" {...register('name')} className="flex-1" />
                <Input
                  placeholder="✨"
                  {...register('emoji')}
                  className="w-14 text-center text-xl"
                />
              </div>
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                placeholder="e.g. Summer trip to Japan with friends — July 2027"
                rows={2}
                className="resize-none"
                {...register('description')}
              />
            </div>

            {/* Target amount */}
            <div className="space-y-1.5">
              <Label>Target amount (AUD)</Label>
              <Input
                type="number"
                placeholder="0.00"
                step="0.01"
                min="0"
                {...register('targetAmount')}
              />
              {errors.targetAmount && (
                <p className="text-xs text-destructive">{errors.targetAmount.message}</p>
              )}
            </div>

            {/* Save frequency */}
            <div className="space-y-1.5">
              <Label>Save frequency (optional)</Label>
              <Select
                value={watchedFreq}
                onValueChange={(val) => setValue('saveFrequency', val as FormValues['saveFrequency'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No recurring target</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="fortnightly">Fortnightly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Save amount per period */}
            {watchedFreq && watchedFreq !== 'none' && (
              <div className="space-y-1.5">
                <Label>Amount per {watchedFreq === 'fortnightly' ? 'fortnight' : watchedFreq.replace('ly', '')} (AUD)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  {...register('saveAmount')}
                />
              </div>
            )}

            {/* Target date */}
            <div className="space-y-1.5">
              <Label>Target date (optional)</Label>
              <Input type="date" {...register('targetDate')} />
            </div>

            {/* Color picker */}
            <div className="space-y-1.5">
              <Label>Colour</Label>
              <div className="flex gap-2">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Select colour ${c}`}
                    onClick={() => setValue('color', c)}
                    className={cn(
                      'w-7 h-7 rounded-full border-2 transition-transform hover:scale-110',
                      watchedColor === c ? 'border-foreground scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              {!isEdit && (
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                  ← Back
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create goal 🚀'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
