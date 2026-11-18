import { beforeEach, describe, expect, test, vi } from 'vitest'
import { Webhook } from 'svix'
import type { IngestParams, IngestResult } from '@/lib/ingest'
import {
  handleInboundEmailWebhook,
  type ClaimResult,
  type InboundEmailDeps,
  type InboundEmailStore,
  type InboundEmailSummary,
} from '@/lib/inbound-email/process'
import { createResendProvider } from '@/lib/inbound-email/resend'
import {
  extractEmailAddress,
  matchesFilenamePattern,
  pickSenderRule,
  supportedExtension,
  type SenderRule,
} from '@/lib/inbound-email/senders'

const SECRET = 'whsec_' + Buffer.from('test-signing-secret-0123456789').toString('base64')
const MB = 1024 * 1024
const USER = 'user_1'
const CARD = '11111111-1111-4111-8111-111111111111'
const BANK = '22222222-2222-4222-8222-222222222222'

// ─── fixtures ────────────────────────────────────────────────────────────────

type Att = { id: string; filename: string; size?: number; content_type?: string }

function receivedEvent(overrides: { emailId?: string; from?: string; messageId?: string } = {}) {
  return {
    type: 'email.received',
    created_at: '2026-11-19T00:00:00.000Z',
    data: {
      email_id: overrides.emailId ?? 'email_1',
      created_at: '2026-11-19T00:00:00.000Z',
      from: overrides.from ?? 'Latitude Statements <Statements@Latitude.com.au>',
      to: ['import@inbound.example.com'],
      bcc: [],
      cc: [],
      message_id: overrides.messageId ?? '<msg-1@latitude.com.au>',
      subject: 'Your statement',
      attachments: [],
    },
  }
}

function signedRequest(payload: unknown, secret = SECRET) {
  const rawBody = JSON.stringify(payload)
  const id = `msg_${Math.random().toString(36).slice(2)}`
  const timestamp = new Date()
  const signature = new Webhook(secret).sign(id, timestamp, rawBody)
  const headers = new Headers({
    'svix-id': id,
    'svix-timestamp': Math.floor(timestamp.getTime() / 1000).toString(),
    'svix-signature': signature,
  })
  return { rawBody, headers }
}

/** Fake Resend API: attachment list + downloads. */
function fakeResendFetch(attachments: Att[], contents: Record<string, Uint8Array> = {}) {
  return vi.fn(async (input: string | URL | Request) => {
    const url = input.toString()
    const list = url.match(/\/emails\/receiving\/([^/]+)\/attachments/)
    if (list) {
      return Response.json({
        object: 'list',
        has_more: false,
        data: attachments.map(a => ({
          id: a.id,
          filename: a.filename,
          size: a.size,
          content_type: a.content_type ?? 'application/octet-stream',
          content_disposition: 'attachment',
          download_url: `https://inbound-cdn.resend.com/x/attachments/${a.id}?signature=sig`,
          expires_at: '2026-11-19T01:00:00.000Z',
        })),
      })
    }
    const dl = url.match(/\/attachments\/([^/?]+)\?/)
    if (dl) {
      const bytes = contents[dl[1]] ?? new TextEncoder().encode('date,amount\n')
      return new Response(new Uint8Array(bytes))
    }
    return new Response('not found', { status: 404 })
  })
}

/** In-memory version of the drizzle store, with the same claim semantics. */
class MemoryStore implements InboundEmailStore {
  rules: SenderRule[] = []
  emails = new Map<string, { status: string; messageId: string | null; userId: string; summary: InboundEmailSummary | null }>()
  claims = 0

  async findSenderRules(senderEmail: string) {
    return this.rules.filter(r => r.senderEmail === senderEmail)
  }

  async claim({ emailId, messageId, userId }: { provider: string; emailId: string; messageId: string | null; userId: string }): Promise<ClaimResult> {
    this.claims++
    const existing = this.emails.get(emailId)
    if (!existing) {
      const sameMessage = [...this.emails.values()].some(
        e => messageId && e.messageId === messageId && e.userId === userId && e.status !== 'failed'
      )
      if (sameMessage) return { claimed: false, reason: 'duplicate_message' }
      this.emails.set(emailId, { status: 'processing', messageId, userId, summary: null })
      return { claimed: true, previous: null }
    }
    if (existing.status === 'processed') return { claimed: false, reason: 'already_processed' }
    if (existing.status === 'processing') return { claimed: false, reason: 'in_progress' }
    existing.status = 'processing'
    return { claimed: true, previous: existing.summary }
  }

  async finish(_provider: string, emailId: string, status: 'processed' | 'failed', summary: InboundEmailSummary) {
    const e = this.emails.get(emailId)!
    e.status = status
    e.summary = summary
  }
}

const okResult = (inserted = 3): IngestResult => ({
  sessionId: 'session_1',
  inserted,
  duplicates: 0,
  needsReview: 0,
  errors: [],
  totalProcessed: inserted,
  skipped: [],
  insertedRows: [],
})

let store: MemoryStore
let ingest: ReturnType<typeof vi.fn<(p: IngestParams) => Promise<IngestResult>>>
let tasks: Array<() => Promise<void>>

function deps(fetchImpl: typeof fetch, overrides: Partial<InboundEmailDeps> = {}): InboundEmailDeps {
  return {
    provider: createResendProvider({ webhookSecret: SECRET, apiKey: 're_test', fetch: fetchImpl }),
    store,
    ingest,
    schedule: task => { tasks.push(task) },
    ...overrides,
  }
}

async function runScheduled() {
  for (const t of tasks.splice(0)) await t()
}

beforeEach(() => {
  store = new MemoryStore()
  store.rules = [{ id: 'r1', userId: USER, senderEmail: 'statements@latitude.com.au', accountId: CARD, filenamePattern: null }]
  ingest = vi.fn(async () => okResult())
  tasks = []
})

// ─── signature ───────────────────────────────────────────────────────────────

describe('signature verification', () => {
  test('a validly signed request is accepted', async () => {
    const fetchImpl = fakeResendFetch([{ id: 'a1', filename: 'statement.pdf', size: 1000 }])
    const res = await handleInboundEmailWebhook(signedRequest(receivedEvent()), deps(fetchImpl as unknown as typeof fetch))
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('accepted')
  })

  test('a request signed with another secret is rejected before anything else runs', async () => {
    const fetchImpl = fakeResendFetch([])
    const otherSecret = 'whsec_' + Buffer.from('some-other-secret-abcdefghij').toString('base64')
    const res = await handleInboundEmailWebhook(signedRequest(receivedEvent(), otherSecret), deps(fetchImpl as unknown as typeof fetch))
    expect(res.status).toBe(401)
    expect(store.claims).toBe(0)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  test('a tampered body is rejected', async () => {
    const req = signedRequest(receivedEvent())
    req.rawBody = req.rawBody.replace('email_1', 'email_2')
    const res = await handleInboundEmailWebhook(req, deps(fakeResendFetch([]) as unknown as typeof fetch))
    expect(res.status).toBe(401)
  })

  test('an unsigned request is rejected', async () => {
    const res = await handleInboundEmailWebhook(
      { rawBody: JSON.stringify(receivedEvent()), headers: new Headers() },
      deps(fakeResendFetch([]) as unknown as typeof fetch)
    )
    expect(res.status).toBe(400)
    expect(ingest).not.toHaveBeenCalled()
  })

  test('a missing webhook secret is a server error, not an accepted request', async () => {
    const res = await handleInboundEmailWebhook(signedRequest(receivedEvent()), {
      ...deps(fakeResendFetch([]) as unknown as typeof fetch),
      provider: createResendProvider({ webhookSecret: undefined, apiKey: 're_test' }),
    })
    expect(res.status).toBe(500)
  })
})

// ─── senders ─────────────────────────────────────────────────────────────────

describe('sender check', () => {
  test('an unknown sender is rejected without claiming or downloading', async () => {
    const fetchImpl = fakeResendFetch([{ id: 'a1', filename: 'statement.pdf', size: 1000 }])
    const res = await handleInboundEmailWebhook(
      signedRequest(receivedEvent({ from: 'attacker@evil.example' })),
      deps(fetchImpl as unknown as typeof fetch)
    )
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ status: 'rejected', reason: 'unknown_sender' })
    expect(store.claims).toBe(0)
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(ingest).not.toHaveBeenCalled()
  })

  test('a sender approved by two different users is rejected as ambiguous', async () => {
    store.rules.push({ id: 'r2', userId: 'user_2', senderEmail: 'statements@latitude.com.au', accountId: BANK, filenamePattern: null })
    const res = await handleInboundEmailWebhook(signedRequest(receivedEvent()), deps(fakeResendFetch([]) as unknown as typeof fetch))
    expect(res.body).toMatchObject({ status: 'rejected', reason: 'ambiguous_sender' })
  })

  test('non email.received events are ignored', async () => {
    const res = await handleInboundEmailWebhook(
      signedRequest({ type: 'email.delivered', data: { email_id: 'x' } }),
      deps(fakeResendFetch([]) as unknown as typeof fetch)
    )
    expect(res.body.status).toBe('ignored')
  })
})

// ─── attachments ─────────────────────────────────────────────────────────────

describe('attachments', () => {
  test('only .csv/.pdf attachments up to 10 MB are ingested', async () => {
    const fetchImpl = fakeResendFetch([
      { id: 'a1', filename: 'Statement Nov.PDF', size: 2 * MB, content_type: 'application/pdf' },
      { id: 'a2', filename: 'transactions.csv', size: 500, content_type: 'text/csv' },
      { id: 'a3', filename: 'logo.png', size: 100 },
      { id: 'a4', filename: 'huge.pdf', size: 11 * MB },
      { id: 'a5', filename: 'statement.pdf.exe', size: 100 },
      { id: 'a6', filename: 'csv', size: 100 },
    ])
    const res = await handleInboundEmailWebhook(signedRequest(receivedEvent()), deps(fetchImpl as unknown as typeof fetch))
    await runScheduled()

    expect(res.body.attachments).toEqual([
      expect.objectContaining({ id: 'a1', outcome: 'queued' }),
      expect.objectContaining({ id: 'a2', outcome: 'queued' }),
      expect.objectContaining({ id: 'a3', outcome: 'ignored', reason: 'unsupported_type' }),
      expect.objectContaining({ id: 'a4', outcome: 'ignored', reason: 'too_large' }),
      expect.objectContaining({ id: 'a5', outcome: 'ignored', reason: 'unsupported_type' }),
      expect.objectContaining({ id: 'a6', outcome: 'ignored', reason: 'unsupported_type' }),
    ])
    expect(ingest).toHaveBeenCalledTimes(2)
    expect(ingest.mock.calls.map(c => c[0].fileName)).toEqual(['Statement Nov.PDF', 'transactions.csv'])
    // The too-large one was never downloaded
    expect(fetchImpl.mock.calls.some(c => c[0].toString().includes('/attachments/a4?'))).toBe(false)
    expect(store.emails.get('email_1')?.status).toBe('processed')
  })

  test('an attachment that turns out bigger than 10 MB on download is not ingested', async () => {
    const fetchImpl = fakeResendFetch([{ id: 'a1', filename: 'statement.pdf' /* size unknown */ }], {
      a1: new Uint8Array(10 * MB + 1),
    })
    await handleInboundEmailWebhook(signedRequest(receivedEvent()), deps(fetchImpl as unknown as typeof fetch))
    await runScheduled()

    expect(ingest).not.toHaveBeenCalled()
    expect(store.emails.get('email_1')?.summary?.attachments[0]).toMatchObject({ outcome: 'ignored', reason: 'too_large' })
  })

  test('ingest() is called with the mapped account, the user and source "email"', async () => {
    const bytes = new TextEncoder().encode('01/11/2026,-4.50,COFFEE\n')
    const fetchImpl = fakeResendFetch([{ id: 'a1', filename: 'statement.csv', size: bytes.byteLength, content_type: 'text/csv' }], { a1: bytes })
    await handleInboundEmailWebhook(signedRequest(receivedEvent()), deps(fetchImpl as unknown as typeof fetch))
    await runScheduled()

    expect(ingest).toHaveBeenCalledWith({
      userId: USER,
      accountId: CARD,
      source: 'email',
      fileName: 'statement.csv',
      mimeType: 'text/csv',
      buffer: bytes,
    })
    expect(store.emails.get('email_1')?.summary?.attachments[0]).toMatchObject({
      outcome: 'imported',
      sessionId: 'session_1',
      inserted: 3,
    })
  })

  test('filename patterns route one sender to different accounts', async () => {
    store.rules = [
      { id: 'r1', userId: USER, senderEmail: 'statements@latitude.com.au', accountId: BANK, filenamePattern: null },
      { id: 'r2', userId: USER, senderEmail: 'statements@latitude.com.au', accountId: CARD, filenamePattern: 'Latitude*.pdf' },
    ]
    const fetchImpl = fakeResendFetch([
      { id: 'a1', filename: 'latitude_2026-11.pdf', size: 100 },
      { id: 'a2', filename: 'everyday.csv', size: 100 },
    ])
    await handleInboundEmailWebhook(signedRequest(receivedEvent()), deps(fetchImpl as unknown as typeof fetch))
    await runScheduled()

    expect(ingest.mock.calls.map(c => [c[0].fileName, c[0].accountId])).toEqual([
      ['latitude_2026-11.pdf', CARD],
      ['everyday.csv', BANK],
    ])
  })

  test('with only patterned rules, a non-matching attachment is ignored', async () => {
    store.rules = [{ id: 'r1', userId: USER, senderEmail: 'statements@latitude.com.au', accountId: CARD, filenamePattern: 'Latitude*.pdf' }]
    const fetchImpl = fakeResendFetch([{ id: 'a1', filename: 'other.pdf', size: 100 }])
    const res = await handleInboundEmailWebhook(signedRequest(receivedEvent()), deps(fetchImpl as unknown as typeof fetch))
    expect(res.body.attachments).toEqual([expect.objectContaining({ outcome: 'ignored', reason: 'no_matching_rule' })])
    expect(tasks).toHaveLength(0)
  })
})

// ─── idempotency ─────────────────────────────────────────────────────────────

describe('idempotency', () => {
  test('a re-delivered webhook for the same email does not import again', async () => {
    const fetchImpl = fakeResendFetch([{ id: 'a1', filename: 'statement.pdf', size: 100 }])
    const payload = receivedEvent()

    await handleInboundEmailWebhook(signedRequest(payload), deps(fetchImpl as unknown as typeof fetch))
    await runScheduled()
    const second = await handleInboundEmailWebhook(signedRequest(payload), deps(fetchImpl as unknown as typeof fetch))
    await runScheduled()

    expect(second.body).toMatchObject({ status: 'duplicate', reason: 'already_processed' })
    expect(ingest).toHaveBeenCalledTimes(1)
  })

  test('a delivery that arrives while the first is still running is a duplicate', async () => {
    const fetchImpl = fakeResendFetch([{ id: 'a1', filename: 'statement.pdf', size: 100 }])
    await handleInboundEmailWebhook(signedRequest(receivedEvent()), deps(fetchImpl as unknown as typeof fetch))
    const second = await handleInboundEmailWebhook(signedRequest(receivedEvent()), deps(fetchImpl as unknown as typeof fetch))
    await runScheduled()

    expect(second.body).toMatchObject({ status: 'duplicate', reason: 'in_progress' })
    expect(ingest).toHaveBeenCalledTimes(1)
  })

  test('the same Message-ID under a new email id is a duplicate', async () => {
    const fetchImpl = fakeResendFetch([{ id: 'a1', filename: 'statement.pdf', size: 100 }])
    await handleInboundEmailWebhook(signedRequest(receivedEvent({ emailId: 'email_1' })), deps(fetchImpl as unknown as typeof fetch))
    await runScheduled()
    const second = await handleInboundEmailWebhook(signedRequest(receivedEvent({ emailId: 'email_2' })), deps(fetchImpl as unknown as typeof fetch))

    expect(second.body).toMatchObject({ status: 'duplicate', reason: 'duplicate_message' })
    expect(ingest).toHaveBeenCalledTimes(1)
  })

  test('after a partial failure, a retry only imports the attachments that failed', async () => {
    const fetchImpl = fakeResendFetch([
      { id: 'a1', filename: 'one.pdf', size: 100 },
      { id: 'a2', filename: 'two.pdf', size: 100 },
    ])
    ingest.mockImplementationOnce(async () => okResult()).mockImplementationOnce(async () => {
      throw new Error('db down')
    })

    await handleInboundEmailWebhook(signedRequest(receivedEvent()), deps(fetchImpl as unknown as typeof fetch))
    await runScheduled()
    expect(store.emails.get('email_1')?.status).toBe('failed')

    await handleInboundEmailWebhook(signedRequest(receivedEvent()), deps(fetchImpl as unknown as typeof fetch))
    await runScheduled()

    expect(ingest.mock.calls.map(c => c[0].fileName)).toEqual(['one.pdf', 'two.pdf', 'two.pdf'])
    expect(store.emails.get('email_1')?.status).toBe('processed')
  })

  test('if listing attachments fails, the provider is asked to retry (5xx)', async () => {
    const fetchImpl = vi.fn(async () => new Response('boom', { status: 500 }))
    const res = await handleInboundEmailWebhook(signedRequest(receivedEvent()), deps(fetchImpl as unknown as typeof fetch))
    expect(res.status).toBe(502)
    expect(store.emails.get('email_1')?.status).toBe('failed')
  })
})

// ─── helpers ─────────────────────────────────────────────────────────────────

describe('sender helpers', () => {
  test('extractEmailAddress handles display names and case', () => {
    expect(extractEmailAddress('"Bank, Statements" <Statements@Bank.COM.au>')).toBe('statements@bank.com.au')
    expect(extractEmailAddress('me@example.com')).toBe('me@example.com')
    expect(extractEmailAddress('not an email')).toBeNull()
  })

  test('supportedExtension', () => {
    expect(supportedExtension('a.CSV')).toBe('csv')
    expect(supportedExtension('a.pdf')).toBe('pdf')
    expect(supportedExtension('a.pdf.zip')).toBeNull()
    expect(supportedExtension('pdf')).toBeNull()
  })

  test('matchesFilenamePattern is a case-insensitive glob, not a regex', () => {
    expect(matchesFilenamePattern('Latitude*.pdf', 'LATITUDE_nov.PDF')).toBe(true)
    expect(matchesFilenamePattern('Latitude*.pdf', 'xLatitude.pdf')).toBe(false)
    expect(matchesFilenamePattern('stmt-????.csv', 'stmt-2026.csv')).toBe(true)
    expect(matchesFilenamePattern('a.c(s|x)v', 'a.csv')).toBe(false) // regex syntax is literal
  })

  test('pickSenderRule prefers a matching pattern over the catch-all', () => {
    const rules: SenderRule[] = [
      { id: 'all', userId: USER, senderEmail: 's@x.com', accountId: BANK, filenamePattern: null },
      { id: 'card', userId: USER, senderEmail: 's@x.com', accountId: CARD, filenamePattern: '*card*' },
    ]
    expect(pickSenderRule(rules, 'my-card.pdf')?.id).toBe('card')
    expect(pickSenderRule(rules, 'savings.csv')?.id).toBe('all')
  })
})
