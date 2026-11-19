import { describe, expect, it, vi } from 'vitest'

vi.mock('@/db', () => ({ db: {} }))

import {
  MAX_ATTACHMENT_BYTES,
  normalizeSender,
  processInboundEmail,
  resendClient,
  sanitizeFilename,
  type AttachmentInfo,
  type EmailReceivedEvent,
  type InboundDeps,
} from '@/lib/inbound-email'
import type { IngestResult } from '@/lib/ingest/types'

const result: IngestResult = {
  sessionId: 's', inserted: 5, duplicates: 1, needsReview: 2, errors: [], totalProcessed: 6, skipped: [], insertedRows: [],
}

const event = (over: Partial<EmailReceivedEvent['data']> = {}): EmailReceivedEvent => ({
  type: 'email.received',
  data: { email_id: 'e1', from: 'Latitude <Statements@Latitude.com.au>', attachments: [{ id: 'a1', filename: 'x.pdf' }], ...over },
})

const att = (over: Partial<AttachmentInfo> = {}): AttachmentInfo => ({
  id: 'a1', filename: 'statement.pdf', size: 1000, content_type: 'application/pdf', download_url: 'https://dl/a1', ...over,
})

function deps(over: Partial<InboundDeps> = {}): InboundDeps & { ingest: ReturnType<typeof vi.fn> } {
  return {
    findSender: vi.fn().mockResolvedValue({ userId: 'u1', accountId: 'acc1' }),
    listAttachments: vi.fn().mockResolvedValue([att()]),
    download: vi.fn().mockResolvedValue(new ArrayBuffer(10)),
    ingest: vi.fn().mockResolvedValue(result),
    ...over,
  } as never
}

describe('helpers', () => {
  it('normalises senders and filenames', () => {
    expect(normalizeSender('Latitude <Statements@Latitude.com.au>')).toBe('statements@latitude.com.au')
    expect(normalizeSender(' A@B.com ')).toBe('a@b.com')
    expect(sanitizeFilename('dir/pass wd.csv')).toBe('dir_pass wd.csv')
    expect(sanitizeFilename('../../evil.csv')).not.toContain('/')
    expect(sanitizeFilename('')).toBe('attachment')
  })
})

describe('processInboundEmail', () => {
  it('imports an approved sender attachment with source "email"', async () => {
    const d = deps()
    const out = await processInboundEmail(event(), d)
    expect(d.findSender).toHaveBeenCalledWith('statements@latitude.com.au')
    expect(d.ingest).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', accountId: 'acc1', source: 'email', fileName: 'statement.pdf' })
    )
    expect(out.attachments).toEqual([{ filename: 'statement.pdf', status: 'imported', inserted: 5, duplicates: 1, needsReview: 2 }])
  })

  it('ignores unknown senders and other event types without fetching anything', async () => {
    const d = deps({ findSender: vi.fn().mockResolvedValue(null) })
    expect((await processInboundEmail(event(), d)).status).toBe('ignored')
    expect(d.listAttachments).not.toHaveBeenCalled()
    expect((await processInboundEmail({ ...event(), type: 'email.sent' }, d)).status).toBe('ignored')
  })

  it('skips unsupported and oversized attachments, and records parse failures', async () => {
    const d = deps({
      listAttachments: vi.fn().mockResolvedValue([
        att({ filename: 'photo.png' }),
        att({ filename: 'run.csv.exe' }),
        att({ filename: 'big.pdf', size: MAX_ATTACHMENT_BYTES + 1 }),
        att({ filename: 'bad.csv' }),
      ]),
    })
    d.ingest.mockRejectedValueOnce(new Error('cannot parse'))
    const out = await processInboundEmail(event(), d)
    expect(out.attachments.map(a => a.status)).toEqual(['skipped', 'skipped', 'skipped', 'failed'])
    expect(d.download).toHaveBeenCalledTimes(1)
  })

  it('rejects a download larger than the limit even if the listing said otherwise', async () => {
    const d = deps({ download: vi.fn().mockResolvedValue(new ArrayBuffer(MAX_ATTACHMENT_BYTES + 1)) })
    const out = await processInboundEmail(event(), d)
    expect(out.attachments[0].status).toBe('skipped')
    expect(d.ingest).not.toHaveBeenCalled()
  })

  it('lets transient failures throw so the webhook can ask for a retry', async () => {
    const d = deps({ listAttachments: vi.fn().mockRejectedValue(new Error('resend down')) })
    await expect(processInboundEmail(event(), d)).rejects.toThrow('resend down')
  })
})

describe('resendClient', () => {
  it('lists attachments with the API key, and downloads without it', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(Response.json({ data: [att()] }))
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3])))
    const client = resendClient('re_key', fetchImpl as unknown as typeof fetch)
    expect(await client.listAttachments('e 1')).toHaveLength(1)
    expect(fetchImpl.mock.calls[0][0]).toBe('https://api.resend.com/emails/receiving/e%201/attachments?limit=100')
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe('Bearer re_key')
    expect((await client.download('https://dl/a1')).byteLength).toBe(3)
    expect(fetchImpl.mock.calls[1][1]).toBeUndefined()
  })
})
