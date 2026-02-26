'use client'

import { useState } from 'react'
import confetti from 'canvas-confetti'
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
import { Progress } from '@/components/ui/progress'
import type { GoalWithStats } from './goal-card'

const MILESTONE_MESSAGES: Record<number, string> = {
  25:  '25% reached! 🎯 You\'re on your way!',
  50:  'Halfway there! 🔥 Keep it up!',
  75:  '75% done! ⚡ Almost there!',
  100: 'Goal complete! 🏆 Amazing job!',
}

const formSchema = z.object({
  amount: z.string().regex(/^\d+\.?\d{0,2}$/, 'Enter a valid amount greater than 0'),
  note: z.string().max(200).optional().or(z.literal('')),
})
type FormValues = z.infer<typeof formSchema>

interface ContributeGoalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: GoalWithStats | null
  onContributed: (updatedGoal: Partial<GoalWithStats> & { id: string }) => void
}

function fireConfetti(full = false) {
  const defaults = { spread: 70, ticks: 100, gravity: 1.2, startVelocity: 35, scalar: 1 }
  if (full) {
    confetti({ ...defaults, particleCount: 120, origin: { x: 0.25, y: 0.55 } })
    confetti({ ...defaults, particleCount: 120, origin: { x: 0.75, y: 0.55 } })
    confetti({ ...defaults, particleCount: 80, origin: { x: 0.5, y: 0.3 }, colors: ['#ffd700', '#ff6b6b', '#4ecdc4'] })
  } else {
    confetti({ ...defaults, particleCount: 60, origin: { x: 0.5, y: 0.6 } })
  }
}

export function ContributeGoalDialog({
  open,
  onOpenChange,
  goal,
  onContributed,
}: ContributeGoalDialogProps) {
  const [result, setResult] = useState<{
    newAmount: string
    percentComplete: number
    milestoneReached: number | null
    isComplete: boolean
  } | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { amount: '', note: '' },
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = form

  async function onSubmit(values: FormValues) {
    if (!goal) return
    try {
      const res = await fetch(`/api/goals/${goal.id}/contribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: values.amount, note: values.note || null }),
      })
      if (!res.ok) throw new Error('Failed to add contribution')

      const data = await res.json()
      setResult(data)

      if (data.milestoneReached) {
        fireConfetti(data.milestoneReached === 100)
        toast.success(MILESTONE_MESSAGES[data.milestoneReached], { duration: 5000 })
      } else {
        toast.success(`Added ${new Intl.NumberFormat('en-AU', { style: 'currency', currency: goal.currency }).format(parseFloat(values.amount))} to ${goal.name}!`)
      }

      onContributed({ id: goal.id, currentAmount: data.newAmount, percentComplete: data.percentComplete, status: data.isComplete ? 'completed' : goal.status })
    } catch {
      toast.error('Failed to add contribution. Please try again.')
    }
  }

  function handleClose(o: boolean) {
    if (!o) {
      reset()
      setResult(null)
    }
    onOpenChange(o)
  }

  if (!goal) return null

  const current = parseFloat(goal.currentAmount)
  const target = parseFloat(goal.targetAmount)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{goal.emoji}</span>
            <span>{goal.name}</span>
          </DialogTitle>
          <DialogDescription>
            Add money towards your goal. Every contribution counts!
          </DialogDescription>
        </DialogHeader>

        {/* Current progress */}
        <div className="space-y-2 rounded-xl bg-muted/50 p-3">
          <div className="flex justify-between text-sm">
            <span className="font-medium">
              {new Intl.NumberFormat('en-AU', { style: 'currency', currency: goal.currency }).format(
                result ? parseFloat(result.newAmount) : current
              )}
            </span>
            <span className="text-muted-foreground">
              {new Intl.NumberFormat('en-AU', { style: 'currency', currency: goal.currency }).format(target)}
            </span>
          </div>
          <Progress
            value={result ? result.percentComplete : goal.percentComplete}
            className="h-2.5"
          />
          <p className="text-xs text-muted-foreground text-right">
            {result ? result.percentComplete : goal.percentComplete}% saved
          </p>
        </div>

        {/* Success state */}
        {result?.milestoneReached && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-3 text-center">
            <p className="font-semibold text-amber-700 dark:text-amber-400">
              {MILESTONE_MESSAGES[result.milestoneReached]}
            </p>
          </div>
        )}

        {/* Form */}
        {!result?.isComplete && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Amount (AUD)</Label>
              <Input
                type="number"
                placeholder="0.00"
                step="0.01"
                min="0.01"
                autoFocus
                {...register('amount')}
              />
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Note (optional)</Label>
              <Input placeholder="e.g. Birthday money" {...register('note')} />
            </div>

            {/* Quick amount chips */}
            <div className="flex gap-2 flex-wrap">
              {[50, 100, 200, 500].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => form.setValue('amount', String(amt))}
                  className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-accent hover:border-primary transition-colors"
                >
                  ${amt}
                </button>
              ))}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full"
              style={{ backgroundColor: goal.color, borderColor: goal.color }}
            >
              {isSubmitting ? 'Adding…' : 'Add to Goal 💰'}
            </Button>
          </form>
        )}

        {result?.isComplete && (
          <Button onClick={() => handleClose(false)} className="w-full bg-green-500 hover:bg-green-600">
            🏆 Amazing! Close
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
