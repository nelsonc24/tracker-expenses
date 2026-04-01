'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, Home } from 'lucide-react'
import { WfhLogDialog } from '@/components/wfh-log-dialog'
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
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

interface WfhLog {
  id: string
  logDate: string
  hours: string
  notes: string | null
}

interface WfhTrackerCardProps {
  logs: WfhLog[]
  onRefresh: () => void
}

export function WfhTrackerCard({ logs, onRefresh }: WfhTrackerCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const totalHours = logs.reduce((s, l) => s + parseFloat(l.hours), 0)
  const totalDeduction = totalHours * 0.70

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/tax/wfh-logs/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Entry deleted')
      onRefresh()
    } catch {
      toast.error('Failed to delete entry')
    } finally {
      setDeleteId(null)
    }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Home className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-base">Work from Home</CardTitle>
            </div>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Add Entry
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-purple-50 dark:bg-purple-950 p-3">
            <div>
              <p className="text-sm text-muted-foreground">Total FY hours</p>
              <p className="text-2xl font-bold">{totalHours.toFixed(1)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Deduction (70¢/hr)</p>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalDeduction)}</p>
            </div>
          </div>

          {logs.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No entries yet. Add your first WFH day.
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-1">
              {[...logs].reverse().map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{formatDate(log.logDate)}</p>
                    {log.notes && (
                      <p className="truncate text-xs text-muted-foreground">{log.notes}</p>
                    )}
                  </div>
                  <div className="ml-3 flex items-center gap-2">
                    <Badge variant="secondary">{parseFloat(log.hours).toFixed(1)} hrs</Badge>
                    <span className="text-xs font-medium text-green-600">
                      {formatCurrency(parseFloat(log.hours) * 0.70)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteId(log.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <WfhLogDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={onRefresh}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete WFH entry?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the log entry. Are you sure?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
