import type { IngestParams, IngestResult } from '@/lib/ingest'
import { IngestError } from '@/lib/ingest/types'
import { MAX_ATTACHMENT_BYTES, pickSenderRule, supportedExtension, type SenderRule } from './senders'
import {
  AttachmentTooLargeError,
  WebhookVerificationError,
  type InboundAttachment,
  type InboundEmailProvider,
} from './types'

export type AttachmentOutcome = {
  id: string
  filename: string
  outcome: 'queued' | 'imported' | 'ignored' | 'failed'
  reason?: 'unsupported_type' | 'too_large' | 'no_matching_rule' | 'error'
  accountId?: string
  sessionId?: string | null
  inserted?: number
  duplicates?: number
  needsReview?: number
  /** Short error message; never file contents. */
  error?: string
}

export interface InboundEmailSummary {
  attachments: AttachmentOutcome[]
}

export type ClaimResult =
  | { claimed: true; previous: InboundEmailSummary | null }
  | { claimed: false; reason: 'already_processed' | 'in_progress' | 'duplicate_message' }

export interface InboundEmailStore {
  /** Approved-sender rules for this (lower-cased) address, across all users. */
  findSenderRules(senderEmail: string): Promise<SenderRule[]>
  /**
   * Atomically take ownership of an email. Succeeds for a new email, or one whose
   * earlier attempt failed (returning that attempt's summary so finished
   * attachments are skipped). Fails for emails already done or in progress.
   */
  claim(input: { provider: string; emailId: string; messageId: string | null; userId: string }): Promise<ClaimResult>
  finish(provider: string, emailId: string, status: 'processed' | 'failed', summary: InboundEmailSummary): Promise<void>
}

export interface InboundEmailDeps {
  provider: InboundEmailProvider
  store: InboundEmailStore
  ingest: (params: IngestParams) => Promise<IngestResult>
  /** Runs work after the response is sent (Next's `after()` in the route). */
  schedule: (task: () => Promise<void>) => void
  maxBytes?: number
}

export interface WebhookResponse {
  status: number
  body: Record<string, unknown>
}

const log = (message: string, meta: Record<string, unknown>) => console.log(`[inbound-email] ${message}`, meta)
const logError = (message: string, meta: Record<string, unknown>) => console.error(`[inbound-email] ${message}`, meta)

const errorMessage = (error: unknown) =>
  error instanceof IngestError || error instanceof Error ? error.message.slice(0, 200) : 'Unknown error'

/**
 * Handle one inbound-email webhook call. Signature check, sender check and
 * attachment filtering happen inline; downloading and `ingest()` run after the
 * response via `deps.schedule`, so the provider gets a 200 quickly.
 *
 * Non-signature rejections (unknown sender, non-email events) answer 200 on
 * purpose: a 4xx makes the provider retry, and a stream of spam to the inbound
 * address would eventually get the endpoint disabled.
 */
export async function handleInboundEmailWebhook(
  request: { rawBody: string; headers: Headers },
  deps: InboundEmailDeps
): Promise<WebhookResponse> {
  const { provider, store } = deps
  const maxBytes = deps.maxBytes ?? MAX_ATTACHMENT_BYTES

  // 1. Signature on the raw body
  let payload: unknown
  try {
    payload = provider.verify(request.rawBody, request.headers)
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      log('rejected webhook', { reason: error.reason })
      return { status: error.reason === 'missing_signature' ? 400 : 401, body: { error: error.message } }
    }
    logError('webhook verification misconfigured', { error: errorMessage(error) })
    return { status: 500, body: { error: 'Webhook not configured' } }
  }

  // 2. Only "email received" events
  const email = provider.parseEvent(payload)
  if (!email) return { status: 200, body: { status: 'ignored', reason: 'not_an_email_event' } }

  // 3. Approved sender -> user (+ account rules)
  const rules = await store.findSenderRules(email.from)
  if (rules.length === 0) {
    log('rejected unknown sender', { emailId: email.emailId })
    return { status: 200, body: { status: 'rejected', reason: 'unknown_sender', emailId: email.emailId } }
  }
  const userIds = new Set(rules.map(r => r.userId))
  if (userIds.size > 1) {
    log('rejected sender approved by several users', { emailId: email.emailId })
    return { status: 200, body: { status: 'rejected', reason: 'ambiguous_sender', emailId: email.emailId } }
  }
  const userId = rules[0].userId

  // 4. Idempotency: one import per email
  const claim = await store.claim({ provider: provider.name, emailId: email.emailId, messageId: email.messageId, userId })
  if (!claim.claimed) {
    return { status: 200, body: { status: 'duplicate', reason: claim.reason, emailId: email.emailId } }
  }
  const alreadyImported = new Map(
    (claim.previous?.attachments ?? []).filter(a => a.outcome === 'imported').map(a => [a.id, a])
  )

  // 5. Attachment metadata (no content yet)
  let attachments: InboundAttachment[]
  try {
    attachments = await provider.listAttachments(email.emailId)
  } catch (error) {
    logError('could not list attachments', { emailId: email.emailId, error: errorMessage(error) })
    await store.finish(provider.name, email.emailId, 'failed', { attachments: claim.previous?.attachments ?? [] })
    // 5xx so the provider re-delivers; the failed claim can be taken again
    return { status: 502, body: { error: 'Could not fetch attachments' } }
  }

  const outcomes: AttachmentOutcome[] = []
  const work: Array<{ attachment: InboundAttachment; rule: SenderRule; index: number }> = []

  for (const attachment of attachments) {
    const base = { id: attachment.id, filename: attachment.filename }
    const done = alreadyImported.get(attachment.id)
    if (done) {
      outcomes.push(done)
    } else if (!supportedExtension(attachment.filename)) {
      outcomes.push({ ...base, outcome: 'ignored', reason: 'unsupported_type' })
    } else if (attachment.size !== null && attachment.size > maxBytes) {
      outcomes.push({ ...base, outcome: 'ignored', reason: 'too_large' })
    } else {
      const rule = pickSenderRule(rules, attachment.filename)
      if (!rule) {
        outcomes.push({ ...base, outcome: 'ignored', reason: 'no_matching_rule' })
      } else {
        work.push({ attachment, rule, index: outcomes.length })
        outcomes.push({ ...base, outcome: 'queued', accountId: rule.accountId })
      }
    }
  }

  if (work.length === 0) {
    await store.finish(provider.name, email.emailId, 'processed', { attachments: outcomes })
    return { status: 200, body: { status: 'processed', emailId: email.emailId, attachments: outcomes } }
  }

  // 6. Download + ingest after responding
  const responseOutcomes = outcomes.map(o => ({ ...o }))
  deps.schedule(async () => {
    for (const { attachment, rule, index } of work) {
      const base = { id: attachment.id, filename: attachment.filename, accountId: rule.accountId }
      try {
        const buffer = await provider.download(attachment, maxBytes)
        const result = await deps.ingest({
          userId,
          accountId: rule.accountId,
          source: 'email',
          fileName: attachment.filename,
          mimeType: attachment.contentType ?? undefined,
          buffer,
        })
        outcomes[index] = {
          ...base,
          outcome: 'imported',
          sessionId: result.sessionId,
          inserted: result.inserted,
          duplicates: result.duplicates,
          needsReview: result.needsReview,
        }
      } catch (error) {
        if (error instanceof AttachmentTooLargeError) {
          outcomes[index] = { ...base, outcome: 'ignored', reason: 'too_large' }
        } else {
          logError('attachment import failed', { emailId: email.emailId, attachmentId: attachment.id, error: errorMessage(error) })
          outcomes[index] = { ...base, outcome: 'failed', reason: 'error', error: errorMessage(error) }
        }
      }
    }

    const failed = outcomes.some(o => o.outcome === 'failed')
    try {
      await store.finish(provider.name, email.emailId, failed ? 'failed' : 'processed', { attachments: outcomes })
    } catch (error) {
      logError('could not record result', { emailId: email.emailId, error: errorMessage(error) })
    }
    log('processed email', {
      emailId: email.emailId,
      imported: outcomes.filter(o => o.outcome === 'imported').length,
      failed: outcomes.filter(o => o.outcome === 'failed').length,
    })
  })

  return { status: 200, body: { status: 'accepted', emailId: email.emailId, attachments: responseOutcomes } }
}
