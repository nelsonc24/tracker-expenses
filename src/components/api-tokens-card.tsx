'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Check, Copy, KeyRound, Loader2, Trash2 } from 'lucide-react'

interface ApiTokenRow {
  id: string
  name: string
  tokenPrefix: string
  lastUsedAt: string | null
  createdAt: string
  revokedAt: string | null
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : 'never'
}

export function ApiTokensCard() {
  const [tokens, setTokens] = useState<ApiTokenRow[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [newToken, setNewToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/tokens')
      if (!res.ok) throw new Error()
      setTokens((await res.json()).tokens)
    } catch {
      toast.error('Could not load API tokens')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function create() {
    if (!name.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setNewToken(data.token)
      setCopied(false)
      setName('')
      await load()
    } catch {
      toast.error('Could not create the token')
    } finally {
      setCreating(false)
    }
  }

  async function revoke(id: string) {
    try {
      const res = await fetch(`/api/tokens/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Token revoked')
      await load()
    } catch {
      toast.error('Could not revoke the token')
    }
  }

  async function copy() {
    if (!newToken) return
    try {
      await navigator.clipboard.writeText(newToken)
      setCopied(true)
    } catch {
      toast.error('Copy failed. Select the token and copy it manually.')
    }
  }

  const active = tokens.filter(t => !t.revokedAt)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
          <KeyRound className="h-4 w-4 sm:h-5 sm:w-5" />
          <span>API tokens</span>
        </CardTitle>
        <CardDescription className="text-sm">
          Let a script or the folder watcher upload statements to <code>/api/ingest</code> without a browser session.
          A token can only upload files to your own accounts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {newToken && (
          <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/30">
            <p className="text-sm font-medium">Copy your new token now. It will not be shown again.</p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 break-all rounded bg-background px-2 py-1 text-xs">{newToken}</code>
              <Button type="button" size="sm" variant="outline" onClick={copy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={() => setNewToken(null)}>
              Done
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="Token name, e.g. MacBook folder watcher"
            value={name}
            maxLength={60}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && create()}
          />
          <Button type="button" onClick={create} disabled={creating || !name.trim()}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : active.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active tokens.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {active.map(t => (
              <li key={t.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <Badge variant="outline" className="mr-2 font-mono">{t.tokenPrefix}…</Badge>
                    Created {formatDate(t.createdAt)} · Last used {formatDate(t.lastUsedAt)}
                  </p>
                </div>
                <Button type="button" size="sm" variant="ghost" onClick={() => revoke(t.id)} aria-label={`Revoke ${t.name}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
