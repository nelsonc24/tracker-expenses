'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Sparkles,
  Target,
  TrendingUp,
  CheckCircle2,
  Flame,
  PlusCircle,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { GoalCard, type GoalWithStats } from '@/components/goal-card'
import { AddGoalDialog } from '@/components/add-goal-dialog'
import { ContributeGoalDialog } from '@/components/contribute-goal-dialog'
import { GoalHistorySheet } from '@/components/goal-history-sheet'
import { getDailyQuote } from '@/lib/motivational-quotes'

interface GoalStats {
  totalSaved: number
  activeGoals: number
  completedGoals: number
  pausedGoals: number
  contributionStreakMonths: number
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  }).format(amount)
}

function getProjectionText(goal: GoalWithStats): string | null {
  if (!goal.saveFrequency || !goal.saveAmount) return null
  const remaining = parseFloat(goal.targetAmount) - parseFloat(goal.currentAmount)
  if (remaining <= 0) return null

  const savePerMonth: Record<string, number> = {
    weekly: parseFloat(goal.saveAmount) * (52 / 12),
    fortnightly: parseFloat(goal.saveAmount) * (26 / 12),
    monthly: parseFloat(goal.saveAmount),
  }

  const rate = savePerMonth[goal.saveFrequency]
  if (!rate || rate <= 0) return null
  const months = Math.ceil(remaining / rate)
  if (months <= 1) return 'less than a month away'
  if (months < 12) return `~${months} months away`
  const yrs = Math.floor(months / 12)
  const rem = months % 12
  return rem ? `~${yrs}y ${rem}m away` : `~${yrs} year${yrs > 1 ? 's' : ''} away`
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalWithStats[]>([])
  const [stats, setStats] = useState<GoalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [quote] = useState(() => getDailyQuote())

  // Dialog state
  const [addOpen, setAddOpen] = useState(false)
  const [editGoal, setEditGoal] = useState<GoalWithStats | null>(null)
  const [contributeGoal, setContributeGoal] = useState<GoalWithStats | null>(null)
  const [historyGoal, setHistoryGoal] = useState<GoalWithStats | null>(null)
  const [deleteGoal, setDeleteGoal] = useState<GoalWithStats | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchAll = useCallback(async () => {
    try {
      const [goalsRes, statsRes] = await Promise.all([
        fetch('/api/goals'),
        fetch('/api/goals/stats'),
      ])
      const [goalsData, statsData] = await Promise.all([
        goalsRes.json(),
        statsRes.json(),
      ])
      setGoals(Array.isArray(goalsData) ? goalsData : [])
      setStats(statsData)
    } catch {
      toast.error('Failed to load goals')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function handleTogglePause(goal: GoalWithStats) {
    const newStatus = goal.status === 'paused' ? 'active' : 'paused'
    try {
      const res = await fetch(`/api/goals/${goal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error()
      setGoals((prev) => prev.map((g) => g.id === goal.id ? { ...g, status: newStatus } : g))
      toast.success(newStatus === 'paused' ? 'Goal paused.' : 'Goal resumed!')
    } catch {
      toast.error('Failed to update goal status.')
    }
  }

  async function handleDelete() {
    if (!deleteGoal) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/goals/${deleteGoal.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setGoals((prev) => prev.filter((g) => g.id !== deleteGoal.id))
      toast.success('Goal deleted.')
      setDeleteGoal(null)
    } catch {
      toast.error('Failed to delete goal.')
    } finally {
      setDeleting(false)
    }
  }

  const activeGoals = goals.filter((g) => g.status === 'active')
  const pausedGoals = goals.filter((g) => g.status === 'paused')
  const completedGoals = goals.filter((g) => g.status === 'completed')

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Goals
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Track what you&apos;re saving towards and celebrate every milestone.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <PlusCircle className="w-4 h-4 mr-1.5" /> New Goal
        </Button>
      </div>

      {/* Daily motivational quote */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-violet-500/5 dark:from-primary/10 dark:to-violet-500/10">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0 mt-0.5">💡</span>
            <div>
              <p className="text-sm font-medium italic leading-relaxed">&ldquo;{quote.text}&rdquo;</p>
              <p className="text-xs text-muted-foreground mt-1">— {quote.author}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats bar */}
      {!loading && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Total Saved
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold">{formatCurrency(stats.totalSaved)}</p>
              <p className="text-xs text-muted-foreground">across all goals</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" /> Active Goals
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold">{stats.activeGoals}</p>
              <p className="text-xs text-muted-foreground">{stats.pausedGoals} paused</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Completed
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold">{stats.completedGoals}</p>
              <p className="text-xs text-muted-foreground">goals achieved 🏆</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" /> Streak
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex items-center gap-1.5">
                <p className="text-2xl font-bold">{stats.contributionStreakMonths}</p>
                {stats.contributionStreakMonths >= 2 && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500" />
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                month{stats.contributionStreakMonths !== 1 ? 's' : ''} in a row
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!loading && goals.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <Sparkles className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-1">No goals yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Create your first saving goal and start turning your dreams into a plan.
            </p>
            <Button className="mt-5" onClick={() => setAddOpen(true)}>
              <PlusCircle className="w-4 h-4 mr-1.5" /> Create First Goal
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Active goals */}
      {activeGoals.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
              <span className="relative rounded-full h-2 w-2 bg-green-500" />
            </span>
            Active ({activeGoals.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onContribute={(g) => setContributeGoal(g)}
                onEdit={(g) => setEditGoal(g)}
                onHistory={(g) => setHistoryGoal(g)}
                onTogglePause={handleTogglePause}
                onDelete={(g) => setDeleteGoal(g)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Projections insight panel */}
      {activeGoals.some((g) => g.saveFrequency && g.saveAmount) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> At your current pace…
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeGoals
              .filter((g) => g.saveFrequency && g.saveAmount)
              .map((g) => {
                const projection = getProjectionText(g)
                if (!projection) return null
                return (
                  <div key={g.id} className="flex items-center justify-between text-sm gap-3">
                    <span className="flex items-center gap-2 min-w-0">
                      <span>{g.emoji}</span>
                      <span className="truncate">{g.name}</span>
                    </span>
                    <span className="font-medium text-primary shrink-0">{projection}</span>
                  </div>
                )
              })}
          </CardContent>
        </Card>
      )}

      {/* Paused goals */}
      {pausedGoals.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Paused ({pausedGoals.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {pausedGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onContribute={(g) => setContributeGoal(g)}
                onEdit={(g) => setEditGoal(g)}
                onHistory={(g) => setHistoryGoal(g)}
                onTogglePause={handleTogglePause}
                onDelete={(g) => setDeleteGoal(g)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Completed goals */}
      {completedGoals.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            🏆 Completed ({completedGoals.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {completedGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onContribute={(g) => setContributeGoal(g)}
                onEdit={(g) => setEditGoal(g)}
                onHistory={(g) => setHistoryGoal(g)}
                onTogglePause={handleTogglePause}
                onDelete={(g) => setDeleteGoal(g)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Dialogs ────────────────────────────────────────────────── */}

      {/* Add / Edit goal */}
      <AddGoalDialog
        open={addOpen || Boolean(editGoal)}
        onOpenChange={(o) => {
          if (!o) { setAddOpen(false); setEditGoal(null) }
        }}
        editGoal={editGoal}
        onSaved={(saved) => {
          if (editGoal) {
            setGoals((prev) => prev.map((g) => g.id === saved.id ? { ...g, ...saved } : g))
          } else {
            setGoals((prev) => [saved, ...prev])
            // Refresh stats
            fetch('/api/goals/stats').then((r) => r.json()).then(setStats)
          }
          setAddOpen(false)
          setEditGoal(null)
        }}
      />

      {/* Contribute */}
      <ContributeGoalDialog
        open={Boolean(contributeGoal)}
        onOpenChange={(o) => { if (!o) setContributeGoal(null) }}
        goal={contributeGoal}
        onContributed={(update) => {
          setGoals((prev) =>
            prev.map((g) => g.id === update.id ? { ...g, ...update } : g)
          )
          // Refresh stats after contribution
          fetch('/api/goals/stats').then((r) => r.json()).then(setStats)
        }}
      />

      {/* History */}
      <GoalHistorySheet
        open={Boolean(historyGoal)}
        onOpenChange={(o) => { if (!o) setHistoryGoal(null) }}
        goal={historyGoal}
      />

      {/* Delete confirmation */}
      <AlertDialog open={Boolean(deleteGoal)} onOpenChange={(o) => { if (!o) setDeleteGoal(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{deleteGoal?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the goal and all its contribution history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete Goal'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
