'use client'

import { useEffect, useState } from 'react'
import { Loader2, Trash2, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface CategoryRule {
  id: string
  matchType: 'contains' | 'regex' | 'merchant'
  pattern: string
  categoryName: string
  priority: number
  createdFrom: 'manual' | 'learned'
}

const MATCH_LABEL: Record<CategoryRule['matchType'], string> = {
  contains: 'Description contains',
  merchant: 'Merchant is',
  regex: 'Description matches',
}

/** Settings → Categories: list the user's auto-categorisation rules, with delete. */
export function CategoryRulesSettings() {
  const [rules, setRules] = useState<CategoryRule[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/category-rules')
      .then(async response => {
        if (!response.ok) throw new Error('Failed to load rules')
        const data: { rules: CategoryRule[] } = await response.json()
        setRules(data.rules)
      })
      .catch(error => {
        console.error('Failed to load category rules:', error)
        toast.error('Failed to load category rules')
      })
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const response = await fetch(`/api/category-rules/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result.error || 'Failed to delete rule')
      }
      setRules(prev => prev.filter(r => r.id !== id))
      toast.success('Rule deleted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete rule')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Wand2 className="h-5 w-5" />
          <span>Auto-categorisation Rules</span>
        </CardTitle>
        <CardDescription>
          Applied to new imports before the built-in keyword matching. Create one by changing a
          transaction&apos;s category and choosing &quot;Always&quot;.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading rules…
          </div>
        ) : rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rules yet.</p>
        ) : (
          <ul className="space-y-2">
            {rules.map(rule => (
              <li key={rule.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0 text-sm">
                  <span className="text-muted-foreground">{MATCH_LABEL[rule.matchType]} </span>
                  <code className="break-all rounded bg-muted px-1 py-0.5">{rule.pattern}</code>
                  <span className="text-muted-foreground"> → </span>
                  <span className="font-medium">{rule.categoryName}</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {rule.createdFrom === 'learned' && <Badge variant="secondary" className="text-xs">Learned</Badge>}
                    {rule.priority !== 0 && <Badge variant="outline" className="text-xs">Priority {rule.priority}</Badge>}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Delete rule ${rule.pattern}`}
                  disabled={deletingId === rule.id}
                  onClick={() => handleDelete(rule.id)}
                >
                  {deletingId === rule.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
