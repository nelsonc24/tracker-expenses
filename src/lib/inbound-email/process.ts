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
  | { claimed: true; previous: InboundEmailSummary | null; /** Attempts including this one. */ attempts: number }
  | { claimed: false; reason: 'already_processed' | 'in_progress' | 'duplicate_message' }

export interface InboundEmailStore {
  /** Approved-sender rules for this (lower-cased) address, across all users. */
  findSenderRules(senderEmail: string): Promise<SenderRule[]>
  /**
   * Atomically take ownership of an email. Succeeds for a new email, or one whose
   * earlier attempt failed (returning that attempt's summary so finished
   * attachments are skipped). Fails for emails already done or in progress.
   */
  claim(input: {
    provider: string
    emailId: string
    messageId: string | null
    userId: string
    senderEmail: string
  }): Promise<ClaimResult>
  finish(provider: string, emailId: string, status: FinishStatus, summary: InboundEmailSummary): Promise<void>
  /** Emails the retry cron should try again: failed, or stuck in 'processing' (see RETRY). */
  listRetryable(input: { now: Date }): Promise<RetryableEmail[]>
}

export type FinishStatus = 'processed' | 'failed' | 'abandoned'

export interface RetryableEmail {
  provider: string
  emailId: string
  messageId: string | null
  userId: string
  senderEmail: string
}

/**
 * Retry policy. The webhook is attempt 1; the retry cron takes the rest. After maxAttempts the
 * email is marked 'abandoned' and the user gets an `import_failed` notification.
 */
export const RETRY = {
  maxAttempts: 3,
  /** A 'processing' claim older than this is assumed dead (e.g. the function timed out). */
  staleMinutes: 15,
  /** Don't retry older emails; the provider may no longer have the attachments. */
  maxAgeDays: 3,
} as const

export interface InboundEmailDeps {
  provider: InboundEmailProvider
  store: InboundEmailStore
  ingest: (params: IngestParams) => Promise<IngestResult>
  /** Runs work after the response is sent (Next's `after()` in the route). */
  schedule: (task: () => Promise<void>) => void
  /** Tells the user when an email is given up on. Optional so tests can leave it out. */
  notify?: (userId: string, event: { type: 'import_failed'; source: 'email'; fileCount: number }) => Promise<unknown>
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
  const claim = await store.claim({
    provider: provider.name,
    emailId: email.emailId,
    messageId: email.messageId,
    userId,
    senderEmail: email.from.toLowerCase(),
  })
  if (!claim.claimed) {
    return { status: 200, body: { status: 'duplicate', reason: claim.reason, emailId: email.emailId } }
  }

  // 5. Attachment metadata (no content yet)
  let attachments: InboundAttachment[]
  try {
    attachments = await provider.listAttachments(email.emailId)
  } catch (error) {
    logError('could not list attachments', { emailId: email.emailId, error: errorMessage(error) })
    const previousOutcomes = claim.previous?.attachments ?? []
    await finishEmail(deps, { emailId: email.emailId, userId, attempts: claim.attempts }, previousOutcomes, { listFailed: true })
    // 5xx so the provider re-delivers; the failed claim can be taken again (and the retry cron will too)
    return { status: 502, body: { error: 'Could not fetch attachments' } }
  }

  const { outcomes, work } = planAttachments(attachments, rules, claim.previous, maxBytes)

  if (work.length === 0) {
    await finishEmail(deps, { emailId: email.emailId, userId, attempts: claim.attempts }, outcomes)
    return { status: 200, body: { status: 'processed', emailId: email.emailId, attachments: outcomes } }
  }

  // 6. Download + ingest after responding
  const responseOutcomes = outcomes.map(o => ({ ...o }))
  deps.schedule(async () => {
    await runWork(deps, { emailId: email.emailId, userId }, outcomes, work, maxBytes)
    await finishEmail(deps, { emailId: email.emailId, userId, attempts: claim.attempts }, outcomes)
  })

  return { status: 200, body: { status: 'accepted', emailId: email.emailId, attachments: responseOutcomes } }
}

// ─── Shared steps (webhook + retry cron) ─────────────────────────────────────

type WorkItem = { attachment: InboundAttachment; rule: SenderRule; index: number }

/** Decide what to do with each attachment. Attachments imported by an earlier attempt are kept as-is. */
function planAttachments(
  attachments: InboundAttachment[],
  rules: SenderRule[],
  previous: InboundEmailSummary | null,
  maxBytes: number
): { outcomes: AttachmentOutcome[]; work: WorkItem[] } {
  const alreadyImported = new Map(
    (previous?.attachments ?? []).filter(a => a.outcome === 'imported').map(a => [a.id, a])
  )
  const outcomes: AttachmentOutcome[] = []
  const work: WorkItem[] = []

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
  return { outcomes, work }
}

/** Download and ingest each queued attachment, updating `outcomes` in place. */
async function runWork(
  deps: Pick<InboundEmailDeps, 'provider' | 'ingest'>,
  email: { emailId: string; userId: string },
  outcomes: AttachmentOutcome[],
  work: WorkItem[],
  maxBytes: number
): Promise<void> {
  for (const { attachment, rule, index } of work) {
    const base = { id: attachment.id, filename: attachment.filename, accountId: rule.accountId }
    try {
      const buffer = await deps.provider.download(attachment, maxBytes)
      const result = await deps.ingest({
        userId: email.userId,
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
}

/**
 * Record the result. A failure on the last allowed attempt becomes 'abandoned' and the user is
 * told, so a statement never silently disappears.
 */
async function finishEmail(
  deps: Pick<InboundEmailDeps, 'provider' | 'store' | 'notify'>,
  email: { emailId: string; userId: string; attempts: number },
  outcomes: AttachmentOutcome[],
  opts: { listFailed?: boolean } = {}
): Promise<FinishStatus> {
  const failedCount = outcomes.filter(o => o.outcome === 'failed').length
  const failed = opts.listFailed || failedCount > 0
  const giveUp = failed && email.attempts >= RETRY.maxAttempts
  const status: FinishStatus = !failed ? 'processed' : giveUp ? 'abandoned' : 'failed'

  try {
    await deps.store.finish(deps.provider.name, email.emailId, status, { attachments: outcomes })
  } catch (error) {
    logError('could not record result', { emailId: email.emailId, error: errorMessage(error) })
  }

  if (giveUp && deps.notify) {
    try {
      await deps.notify(email.userId, { type: 'import_failed', source: 'email', fileCount: Math.max(failedCount, 1) })
    } catch (error) {
      logError('could not send import_failed notification', { emailId: email.emailId, error: errorMessage(error) })
    }
  }

  log('processed email', {
    emailId: email.emailId,
    status,
    attempt: email.attempts,
    imported: outcomes.filter(o => o.outcome === 'imported').length,
    failed: failedCount,
  })
  return status
}

// ─── Retry cron ──────────────────────────────────────────────────────────────

export interface RetrySummary {
  checked: number
  processed: number
  failed: number
  abandoned: number
  skipped: number
}

/**
 * Retry emails whose import failed or timed out. Runs synchronously (called from a cron route),
 * one email at a time, reusing the webhook's claim so a concurrent webhook delivery can't double-import.
 */
export async function retryInboundEmails(
  deps: Omit<InboundEmailDeps, 'schedule'>,
  now: Date = new Date()
): Promise<RetrySummary> {
  const { provider, store } = deps
  const maxBytes = deps.maxBytes ?? MAX_ATTACHMENT_BYTES
  const summary: RetrySummary = { checked: 0, processed: 0, failed: 0, abandoned: 0, skipped: 0 }

  for (const row of await store.listRetryable({ now })) {
    summary.checked++
    if (row.provider !== provider.name) {
      summary.skipped++
      continue
    }

    const claim = await store.claim({
      provider: row.provider,
      emailId: row.emailId,
      messageId: row.messageId,
      userId: row.userId,
      senderEmail: row.senderEmail,
    })
    if (!claim.claimed) {
      summary.skipped++
      continue
    }

    // Re-resolve rules; only this user's (the sender may since have been removed)
    const rules = (await store.findSenderRules(row.senderEmail)).filter(r => r.userId === row.userId)
    const ctx = { emailId: row.emailId, userId: row.userId, attempts: claim.attempts }
    let status: FinishStatus

    if (rules.length === 0) {
      // Sender no longer approved: stop retrying without alerting
      await store.finish(provider.name, row.emailId, 'abandoned', claim.previous ?? { attachments: [] })
      status = 'abandoned'
    } else {
      let attachments: InboundAttachment[] | null = null
      try {
        attachments = await provider.listAttachments(row.emailId)
      } catch (error) {
        logError('retry: could not list attachments', { emailId: row.emailId, error: errorMessage(error) })
      }
      if (attachments === null) {
        status = await finishEmail(deps, ctx, claim.previous?.attachments ?? [], { listFailed: true })
      } else {
        const { outcomes, work } = planAttachments(attachments, rules, claim.previous, maxBytes)
        await runWork(deps, ctx, outcomes, work, maxBytes)
        status = await finishEmail(deps, ctx, outcomes)
      }
    }
    summary[status]++
  }
  return summary
}
