'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Copy, Loader2, Mail, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface ImportSender {
  id: string
  senderEmail: string
  accountId: string
  accountName: string
  filenamePattern: string | null
}

interface AccountOption {
  id: string
  name: string
  institution: string
}

/** Settings > Data: approved senders whose emailed statements are imported automatically. */
export function ImportSendersSettings() {
  const [loading, setLoading] = useState(true)
  const [senders, setSenders] = useState<ImportSender[]>([])
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [inboundAddress, setInboundAddress] = useState<string | null>(null)

  const [senderEmail, setSenderEmail] = useState('')
  const [accountId, setAccountId] = useState('')
  const [filenamePattern, setFilenamePattern] = useState('')
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/import-senders')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load')
        return res.json()
      })
      .then((data: { senders: ImportSender[]; accounts: AccountOption[]; inboundAddress: string | null }) => {
        setSenders(data.senders)
        setAccounts(data.accounts)
        setInboundAddress(data.inboundAddress)
      })
      .catch(() => toast.error('Failed to load email import settings'))
      .finally(() => setLoading(false))
  }, [])

  const handleAdd = async () => {
    if (!senderEmail.trim() || !accountId) return
    setAdding(true)
    try {
      const res = await fetch('/api/import-senders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderEmail: senderEmail.trim(),
          accountId,
          filenamePattern: filenamePattern.trim() || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to add sender')
      setSenders(prev => [...prev, data as ImportSender])
      setSenderEmail('')
      setFilenamePattern('')
      toast.success('Sender approved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add sender')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/import-senders/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setSenders(prev => prev.filter(s => s.id !== id))
      toast.success('Sender removed')
    } catch {
      toast.error('Failed to remove sender')
    } finally {
      setDeletingId(null)
    }
  }

  const copyAddress = async () => {
    if (!inboundAddress) return
    try {
      await navigator.clipboard.writeText(inboundAddress)
      toast.success('Address copied')
    } catch {
      toast.error('Could not copy address')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
          <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
          <span>Email Import</span>
        </CardTitle>
        <CardDescription className="text-sm">
          Forward bank statement emails to your import address. CSV and PDF attachments (up to 10 MB) from
          approved senders are imported into the mapped account automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Inbound address */}
        <div className="space-y-2">
          <Label className="text-sm">Forward statements to</Label>
          {inboundAddress ? (
            <div className="flex gap-2">
              <Input value={inboundAddress} readOnly className="font-mono text-sm" />
              <Button variant="outline" size="icon" onClick={copyAddress} aria-label="Copy import address" className="shrink-0">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No import address configured yet (set <code className="bg-muted px-1 rounded font-mono">INBOUND_EMAIL_ADDRESS</code>).
            </p>
          )}
        </div>

        {/* Approved senders */}
        <div className="space-y-3">
          <Label className="text-sm">Approved senders</Label>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : senders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No approved senders. Emails from unknown addresses are ignored.
            </p>
          ) : (
            <ul className="space-y-2">
              {senders.map(sender => (
                <li key={sender.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{sender.senderEmail}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">→ {sender.accountName}</span>
                      {sender.filenamePattern && (
                        <Badge variant="secondary" className="text-xs font-mono">{sender.filenamePattern}</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive shrink-0"
                    onClick={() => handleDelete(sender.id)}
                    disabled={deletingId === sender.id}
                    aria-label={`Remove ${sender.senderEmail}`}
                  >
                    {deletingId === sender.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Add sender */}
        <div className="space-y-3 rounded-lg border p-3 sm:p-4">
          <p className="text-sm font-medium">Approve a sender</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="importSenderEmail" className="text-xs">Sender email</Label>
              <Input
                id="importSenderEmail"
                type="email"
                placeholder="statements@bank.com.au"
                value={senderEmail}
                onChange={e => setSenderEmail(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Import into account</Label>
              <Select value={accountId} onValueChange={setAccountId} disabled={accounts.length === 0}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={accounts.length === 0 ? 'Add an account first' : 'Choose an account'} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} <span className="text-muted-foreground">· {a.institution}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="importFilenamePattern" className="text-xs">Filename pattern (optional)</Label>
            <Input
              id="importFilenamePattern"
              placeholder="e.g. Latitude*.pdf"
              value={filenamePattern}
              onChange={e => setFilenamePattern(e.target.value)}
              className="font-mono text-sm"
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              Use <code className="font-mono">*</code> as a wildcard. Lets one sender feed different accounts by filename;
              a sender with no pattern catches the rest.
            </p>
          </div>
          <Button onClick={handleAdd} disabled={adding || !senderEmail.trim() || !accountId} className="w-full sm:w-auto">
            {adding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Approve sender
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
