import path from 'node:path'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { importSenders } from '@/db/schema'
import { isSupportedFile } from '@/lib/ingest/supported'
import type { IngestParams, IngestResult } from '@/lib/ingest/types'

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024

/** Resend `email.received` webhook (metadata only; content is fetched separately). */
export interface EmailReceivedEvent {
  type: string
  data: {
    email_id: string
    from: string
    subject?: string
    attachments?: Array<{ id: string; filename: string; content_type?: string }>
  }
}

export interface AttachmentInfo {
  id: string
  filename: string
  size: number
  content_type?: string
  download_url: string
}

export interface SenderRule {
  userId: string
  accountId: string
}

export interface InboundDeps {
  findSender(senderEmail: string): Promise<SenderRule | null>
  listAttachments(emailId: string): Promise<AttachmentInfo[]>
  download(url: string): Promise<ArrayBuffer>
  ingest(params: IngestParams): Promise<IngestResult>
}

export type AttachmentOutcome =
  | { filename: string; status: 'imported'; inserted: number; duplicates: number; needsReview: number }
  | { filename: string; status: 'skipped'; reason: string }
  | { filename: string; status: 'failed'; reason: string }

export interface InboundResult {
  status: 'ignored' | 'processed'
  reason?: string
  attachments: AttachmentOutcome[]
}

/** `Name <a@b.com>` or `a@b.com` -> `a@b.com` (lower-cased). */
export function normalizeSender(from: string): string {
  const match = /<([^>]+)>/.exec(from)
  return (match ? match[1] : from).trim().toLowerCase()
}

/** Safe base name: no directories, no control characters. */
export function sanitizeFilename(name: string): string {
  return path.basename(name.replace(/[\\/]/g, '_')).replace(/[^\w.\- ()]/g, '_') || 'attachment'
}

/**
 * Import the CSV/PDF attachments of a received email, for approved senders only.
 * Unknown senders are ignored (not an error), so Resend does not keep retrying.
 * Transient failures (listing or downloading) throw, so the webhook returns 500 and Resend retries.
 */
export async function processInboundEmail(event: EmailReceivedEvent, deps: InboundDeps): Promise<InboundResult> {
  if (event.type !== 'email.received') return { status: 'ignored', reason: 'not an email.received event', attachments: [] }

  const sender = normalizeSender(event.data.from)
  const rule = await deps.findSender(sender)
  if (!rule) return { status: 'ignored', reason: 'sender not approved', attachments: [] }

  if (!event.data.attachments?.length) return { status: 'processed', reason: 'no attachments', attachments: [] }

  const attachments = await deps.listAttachments(event.data.email_id)
  const outcomes: AttachmentOutcome[] = []

  for (const att of attachments) {
    const filename = sanitizeFilename(att.filename)
    if (!isSupportedFile(filename)) {
      outcomes.push({ filename, status: 'skipped', reason: 'only .csv and .pdf attachments are imported' })
      continue
    }
    if (att.size > MAX_ATTACHMENT_BYTES) {
      outcomes.push({ filename, status: 'skipped', reason: 'attachment is larger than 10 MB' })
      continue
    }

    const buffer = await deps.download(att.download_url)
    if (buffer.byteLength > MAX_ATTACHMENT_BYTES) {
      outcomes.push({ filename, status: 'skipped', reason: 'attachment is larger than 10 MB' })
      continue
    }

    try {
      const result = await deps.ingest({
        userId: rule.userId,
        accountId: rule.accountId,
        source: 'email',
        fileName: filename,
        mimeType: att.content_type,
        buffer,
      })
      outcomes.push({
        filename,
        status: 'imported',
        inserted: result.inserted,
        duplicates: result.duplicates,
        needsReview: result.needsReview,
      })
    } catch (error) {
      // A file we cannot parse will not parse on retry: record it and carry on with the others
      outcomes.push({ filename, status: 'failed', reason: error instanceof Error ? error.message : 'ingest failed' })
    }
  }

  return { status: 'processed', attachments: outcomes }
}

export const drizzleSenderLookup: InboundDeps['findSender'] = async senderEmail => {
  const rows = await db
    .select({ userId: importSenders.userId, accountId: importSenders.accountId })
    .from(importSenders)
    .where(and(eq(importSenders.senderEmail, senderEmail)))
    .limit(1)
  return rows[0] ?? null
}

/** Resend REST calls. The API key never leaves the server. */
export function resendClient(apiKey: string, fetchImpl: typeof fetch = fetch) {
  return {
    async listAttachments(emailId: string): Promise<AttachmentInfo[]> {
      const res = await fetchImpl(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}/attachments?limit=100`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (!res.ok) throw new Error(`Resend attachments request failed: ${res.status}`)
      return ((await res.json()) as { data: AttachmentInfo[] }).data
    },
    async download(url: string): Promise<ArrayBuffer> {
      // download_url is a signed URL; no API key is sent to it
      const res = await fetchImpl(url)
      if (!res.ok) throw new Error(`Attachment download failed: ${res.status}`)
      return res.arrayBuffer()
    },
  }
}
