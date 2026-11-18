"use client"

import { useCallback, useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { Check, Copy, KeyRound, Loader2, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ApiTokenRow {
  id: string
  name: string
  createdAt: string
  lastUsedAt: string | null
}

function relative(date: string | null): string {
  return date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : 'Never'
}

/** Settings section: create / list / revoke personal API tokens for automated imports. */
export function ApiTokenSettings() {
  const [tokens, setTokens] = useState<ApiTokenRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [confirmRevoke, setConfirmRevoke] = useState<ApiTokenRow | null>(null)
  // The plaintext token: kept in memory only until the dialog is closed
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const loadTokens = useCallback(async () => {
    try {
      const res = await fetch('/api/api-tokens')
      if (!res.ok) throw new Error('Failed to load tokens')
      const data = await res.json()
      setTokens(data.tokens ?? [])
    } catch {
      toast.error('Could not load API tokens')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTokens()
  }, [loadTokens])

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('Give the token a name, e.g. "MacBook folder watcher"')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/api-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create token')
      setTokens(prev => [data.token, ...prev])
      setNewSecret(data.secret)
      setCopied(false)
      setName('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create token')
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (token: ApiTokenRow) => {
    setRevokingId(token.id)
    try {
      const res = await fetch(`/api/api-tokens/${token.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to revoke token')
      }
      setTokens(prev => prev.filter(t => t.id !== token.id))
      toast.success(`Revoked "${token.name}"`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to revoke token')
    } finally {
      setRevokingId(null)
      setConfirmRevoke(null)
    }
  }

  const handleCopy = async () => {
    if (!newSecret) return
    try {
      await navigator.clipboard.writeText(newSecret)
      setCopied(true)
    } catch {
      toast.error('Copy failed. Select the token and copy it manually.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <KeyRound className="h-5 w-5" />
          <span>API Tokens</span>
        </CardTitle>
        <CardDescription>
          Personal tokens for automated imports (folder watcher, scripts). Send them as{' '}
          <code className="text-xs">Authorization: Bearer &lt;token&gt;</code> to <code className="text-xs">/api/ingest</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="api-token-name">Token name</Label>
            <Input
              id="api-token-name"
              placeholder="e.g. MacBook folder watcher"
              value={name}
              maxLength={100}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreate()
              }}
            />
          </div>
          <Button onClick={handleCreate} disabled={creating} className="sm:w-auto">
            {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Create token
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading tokens…
          </div>
        ) : tokens.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active tokens.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {tokens.map(token => (
              <li key={token.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{token.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Created {relative(token.createdAt)} · Last used {relative(token.lastUsedAt).toLowerCase()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmRevoke(token)}
                  disabled={revokingId === token.id}
                  aria-label={`Revoke ${token.name}`}
                >
                  {revokingId === token.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 sm:mr-2" />
                  )}
                  <span className="hidden sm:inline">Revoke</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {/* Shown once, right after creation */}
      <Dialog
        open={newSecret !== null}
        onOpenChange={open => {
          if (!open) setNewSecret(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy your new token</DialogTitle>
            <DialogDescription>
              This is the only time the token is shown. Store it somewhere safe (e.g. your watcher config). If you lose
              it, revoke it and create a new one.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input readOnly value={newSecret ?? ''} className="font-mono text-xs" onFocus={e => e.target.select()} />
            <Button variant="outline" size="icon" onClick={handleCopy} aria-label="Copy token">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewSecret(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmRevoke !== null}
        onOpenChange={open => {
          if (!open) setConfirmRevoke(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke token?</DialogTitle>
            <DialogDescription>
              Anything using &quot;{confirmRevoke?.name}&quot; will stop working immediately. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRevoke(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmRevoke && handleRevoke(confirmRevoke)}
              disabled={revokingId !== null}
            >
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
