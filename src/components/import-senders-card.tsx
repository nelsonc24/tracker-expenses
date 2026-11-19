'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Mail, Trash2 } from 'lucide-react'

interface Sender {
  id: string
  senderEmail: string
  accountName: string
}
interface AccountOption {
  id: string
  name: string
}

export function ImportSendersCard() {
  const [senders, setSenders] = useState<Sender[]>([])
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [email, setEmail] = useState('')
  const [accountId, setAccountId] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([fetch('/api/import-senders'), fetch('/api/accounts')])
      if (!s.ok || !a.ok) throw new Error()
      setSenders((await s.json()).senders)
      setAccounts(await a.json())
    } catch {
      toast.error('Could not load approved senders')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function add() {
    setSaving(true)
    try {
      const res = await fetch('/api/import-senders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderEmail: email, accountId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setEmail('')
      await load()
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : 'Could not add the sender')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/import-senders/${id}`, { method: 'DELETE' })
    if (!res.ok) return toast.error('Could not remove the sender')
    await load()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
          <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
          <span>Email import senders</span>
        </CardTitle>
        <CardDescription className="text-sm">
          CSV and PDF attachments forwarded to your inbound address are imported only when they come from one of these
          senders, into the account you choose.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input type="email" placeholder="statements@bank.com.au" value={email} onChange={e => setEmail(e.target.value)} />
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="sm:w-56">
              <SelectValue placeholder="Account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map(a => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" onClick={add} disabled={saving || !email || !accountId}>
            Add
          </Button>
        </div>
        {senders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No approved senders yet.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {senders.map(s => (
              <li key={s.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <span className="min-w-0 truncate">
                  {s.senderEmail} <span className="text-muted-foreground">→ {s.accountName}</span>
                </span>
                <Button type="button" size="sm" variant="ghost" onClick={() => remove(s.id)} aria-label={`Remove ${s.senderEmail}`}>
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
