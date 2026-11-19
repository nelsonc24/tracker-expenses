import { and, eq, gt, isNotNull, lt, ne, or } from 'drizzle-orm'
import { isBefore, subDays, subMinutes } from 'date-fns'
import { db } from '@/db'
import { importSenders, inboundEmails } from '@/db/schema'
import { RETRY, type InboundEmailStore, type InboundEmailSummary } from './process'

const STALE_CLAIM_MINUTES = RETRY.staleMinutes

export const drizzleInboundEmailStore: InboundEmailStore = {
  async findSenderRules(senderEmail) {
    return db
      .select({
        id: importSenders.id,
        userId: importSenders.userId,
        senderEmail: importSenders.senderEmail,
        accountId: importSenders.accountId,
        filenamePattern: importSenders.filenamePattern,
      })
      .from(importSenders)
      .where(eq(importSenders.senderEmail, senderEmail.toLowerCase()))
      .orderBy(importSenders.createdAt)
  },

  async claim({ provider, emailId, messageId, userId, senderEmail }) {
    const [existing] = await db
      .select()
      .from(inboundEmails)
      .where(and(eq(inboundEmails.provider, provider), eq(inboundEmails.providerEmailId, emailId)))
      .limit(1)

    if (!existing) {
      // Same message delivered under a different provider id (e.g. forwarded twice)
      if (messageId) {
        const [sameMessage] = await db
          .select({ id: inboundEmails.id })
          .from(inboundEmails)
          .where(
            and(
              eq(inboundEmails.userId, userId),
              eq(inboundEmails.messageId, messageId),
              ne(inboundEmails.status, 'failed')
            )
          )
          .limit(1)
        if (sameMessage) return { claimed: false, reason: 'duplicate_message' }
      }

      const inserted = await db
        .insert(inboundEmails)
        // updatedAt set from JS (ms precision) so the retake guard below can compare it exactly
        .values({
          provider,
          providerEmailId: emailId,
          messageId,
          userId,
          senderEmail,
          status: 'processing',
          attempts: 1,
          updatedAt: new Date(),
        })
        .onConflictDoNothing()
        .returning({ id: inboundEmails.id })
      // Lost a race with a concurrent delivery of the same email
      return inserted.length > 0 ? { claimed: true, previous: null, attempts: 1 } : { claimed: false, reason: 'in_progress' }
    }

    // 'abandoned' is final: the user was already told to upload it manually
    if (existing.status === 'processed' || existing.status === 'abandoned') {
      return { claimed: false, reason: 'already_processed' }
    }
    const stale = isBefore(existing.updatedAt, subMinutes(new Date(), STALE_CLAIM_MINUTES))
    if (existing.status === 'processing' && !stale) return { claimed: false, reason: 'in_progress' }

    // Retake a failed (or abandoned) attempt. The status + updatedAt guard keeps it atomic.
    const retaken = await db
      .update(inboundEmails)
      .set({ status: 'processing', attempts: existing.attempts + 1, senderEmail: existing.senderEmail ?? senderEmail, updatedAt: new Date() })
      .where(
        and(
          eq(inboundEmails.id, existing.id),
          eq(inboundEmails.status, existing.status),
          eq(inboundEmails.updatedAt, existing.updatedAt)
        )
      )
      .returning({ id: inboundEmails.id })
    if (retaken.length === 0) return { claimed: false, reason: 'in_progress' }
    return {
      claimed: true,
      previous: (existing.summary as InboundEmailSummary | null) ?? null,
      attempts: existing.attempts + 1,
    }
  },

  async finish(provider, emailId, status, summary) {
    await db
      .update(inboundEmails)
      .set({ status, summary: summary as unknown as Record<string, unknown>, updatedAt: new Date() })
      .where(and(eq(inboundEmails.provider, provider), eq(inboundEmails.providerEmailId, emailId)))
  },

  async listRetryable({ now }) {
    const rows = await db
      .select({
        provider: inboundEmails.provider,
        emailId: inboundEmails.providerEmailId,
        messageId: inboundEmails.messageId,
        userId: inboundEmails.userId,
        senderEmail: inboundEmails.senderEmail,
      })
      .from(inboundEmails)
      .where(
        and(
          isNotNull(inboundEmails.senderEmail),
          lt(inboundEmails.attempts, RETRY.maxAttempts),
          gt(inboundEmails.createdAt, subDays(now, RETRY.maxAgeDays)),
          or(
            eq(inboundEmails.status, 'failed'),
            and(eq(inboundEmails.status, 'processing'), lt(inboundEmails.updatedAt, subMinutes(now, STALE_CLAIM_MINUTES)))
          )
        )
      )
      .orderBy(inboundEmails.createdAt)
      // Small batches: each email may run a PDF through Gemini within the cron's 60 s
      .limit(5)
    return rows.map(r => ({ ...r, senderEmail: r.senderEmail! }))
  },
}
