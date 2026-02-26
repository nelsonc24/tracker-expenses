'use client'

import { useState, useEffect } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import {
  MoreHorizontal,
  PlusCircle,
  Pause,
  Play,
  Pencil,
  Trash2,
  Clock,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export interface GoalWithStats {
  id: string
  name: string
  emoji: string
  description: string | null
  type: string
  color: string
  targetAmount: string
  currentAmount: string
  currency: string
  saveFrequency: string | null
  saveAmount: string | null
  targetDate: string | null
  status: string
  completedAt: string | null
  createdAt: string
  percentComplete: number
}

interface GoalCardProps {
  goal: GoalWithStats
  onContribute: (goal: GoalWithStats) => void
  onEdit: (goal: GoalWithStats) => void
  onHistory: (goal: GoalWithStats) => void
  onTogglePause: (goal: GoalWithStats) => void
  onDelete: (goal: GoalWithStats) => void
}

const MILESTONE_BADGES = [
  { threshold: 25, emoji: '🎯', label: '25%' },
  { threshold: 50, emoji: '🔥', label: '50%' },
  { threshold: 75, emoji: '⚡', label: '75%' },
  { threshold: 100, emoji: '🏆', label: '100%' },
]

function formatAmount(amount: string, currency: string) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parseFloat(amount))
}

function getProjectedDate(goal: GoalWithStats): string | null {
  if (!goal.saveFrequency || !goal.saveAmount) return null
  const remaining = parseFloat(goal.targetAmount) - parseFloat(goal.currentAmount)
  if (remaining <= 0) return null

  const savePerMonth = {
    weekly: parseFloat(goal.saveAmount) * (52 / 12),
    fortnightly: parseFloat(goal.saveAmount) * (26 / 12),
    monthly: parseFloat(goal.saveAmount),
  }[goal.saveFrequency as 'weekly' | 'fortnightly' | 'monthly']

  if (!savePerMonth || savePerMonth <= 0) return null

  const monthsLeft = remaining / savePerMonth
  const projected = new Date()
  projected.setMonth(projected.getMonth() + Math.ceil(monthsLeft))
  return format(projected, 'MMM yyyy')
}

export function GoalCard({
  goal,
  onContribute,
  onEdit,
  onHistory,
  onTogglePause,
  onDelete,
}: GoalCardProps) {
  const [progressWidth, setProgressWidth] = useState(0)

  // Animate progress bar on mount
  useEffect(() => {
    const t = setTimeout(() => setProgressWidth(goal.percentComplete), 120)
    return () => clearTimeout(t)
  }, [goal.percentComplete])

  const isCompleted = goal.status === 'completed'
  const isPaused = goal.status === 'paused'
  const projectedDate = getProjectedDate(goal)

  const progressColor =
    goal.percentComplete >= 100
      ? 'bg-green-500'
      : goal.percentComplete >= 75
      ? 'bg-blue-500'
      : goal.percentComplete >= 50
      ? 'bg-amber-500'
      : goal.percentComplete >= 25
      ? 'bg-orange-400'
      : 'bg-rose-400'

  const earnedMilestones = MILESTONE_BADGES.filter(
    (m) => goal.percentComplete >= m.threshold
  )

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-300 hover:shadow-md',
        isCompleted && 'animate-goal-complete-pulse',
        isPaused && 'opacity-70'
      )}
      style={{ borderLeftColor: goal.color, borderLeftWidth: 4 }}
    >
      {/* Completed shimmer overlay */}
      {isCompleted && (
        <div className="absolute inset-0 pointer-events-none animate-shimmer-gold rounded-xl" />
      )}

      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-3xl leading-none select-none">{goal.emoji}</span>
            <div className="min-w-0">
              <h3 className="font-semibold text-base leading-tight truncate">{goal.name}</h3>
              {goal.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{goal.description}</p>
              )}
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {isCompleted && (
                  <Badge variant="default" className="text-xs bg-green-500 hover:bg-green-600 px-1.5">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Done
                  </Badge>
                )}
                {isPaused && (
                  <Badge variant="secondary" className="text-xs px-1.5">
                    <Pause className="w-3 h-3 mr-1" /> Paused
                  </Badge>
                )}
                {goal.saveFrequency && (
                  <Badge variant="outline" className="text-xs px-1.5 capitalize">
                    {goal.saveFrequency}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onContribute(goal)}>
                <PlusCircle className="w-4 h-4 mr-2" /> Add Money
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onHistory(goal)}>
                <Clock className="w-4 h-4 mr-2" /> History
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(goal)}>
                <Pencil className="w-4 h-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onTogglePause(goal)}>
                {isPaused ? (
                  <><Play className="w-4 h-4 mr-2" /> Resume</>
                ) : (
                  <><Pause className="w-4 h-4 mr-2" /> Pause</>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(goal)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="font-medium">
              {formatAmount(goal.currentAmount, goal.currency)}
            </span>
            <span className="text-muted-foreground">
              {formatAmount(goal.targetAmount, goal.currency)}
            </span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-1000 ease-out', progressColor)}
              style={{ width: `${progressWidth}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-muted-foreground font-medium">
              {goal.percentComplete}% saved
            </span>
            {goal.saveAmount && goal.saveFrequency && (
              <span className="text-xs text-muted-foreground">
                {formatAmount(goal.saveAmount, goal.currency)}/{goal.saveFrequency === 'fortnightly' ? 'fn' : goal.saveFrequency.slice(0, 2)}
              </span>
            )}
          </div>
        </div>

        {/* Milestone badges */}
        {earnedMilestones.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {earnedMilestones.map((m) => (
              <span
                key={m.threshold}
                title={`${m.label} milestone reached!`}
                className="animate-milestone-pop text-lg leading-none cursor-default select-none"
              >
                {m.emoji}
              </span>
            ))}
          </div>
        )}

        {/* Footer: projection / target date */}
        {!isCompleted && (projectedDate || goal.targetDate) && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t">
            <TrendingUp className="w-3 h-3" />
            {projectedDate ? (
              <span>Projected: <span className="font-medium text-foreground">{projectedDate}</span></span>
            ) : goal.targetDate ? (
              <span>
                Target: <span className="font-medium text-foreground">{format(new Date(goal.targetDate), 'dd MMM yyyy')}</span>
                {' '}({formatDistanceToNow(new Date(goal.targetDate), { addSuffix: true })})
              </span>
            ) : null}
          </div>
        )}

        {isCompleted && goal.completedAt && (
          <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 pt-1 border-t">
            <CheckCircle2 className="w-3 h-3" />
            <span>Completed {formatDistanceToNow(new Date(goal.completedAt), { addSuffix: true })}</span>
          </div>
        )}

        {/* Quick add money button */}
        {!isCompleted && (
          <Button
            size="sm"
            className="w-full"
            style={{ backgroundColor: goal.color, borderColor: goal.color }}
            onClick={() => onContribute(goal)}
          >
            <PlusCircle className="w-4 h-4 mr-1.5" /> Add Money
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
