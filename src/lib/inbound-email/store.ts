import { and, eq, ne } from 'drizzle-orm'
import { isBefore, subMinutes } from 'date-fns'
import { db } from '@/db'
import { importSenders, inboundEmails } from '@/db/schema'
import type { InboundEmailStore, InboundEmailSummary } from './process'

/** A 'processing' claim older than this is assumed dead (e.g. the function timed out) and can be retaken. */
const STALE_CLAIM_MINUTES = 15

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

  async claim({ provider, emailId, messageId, userId }) {
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
        .values({ provider, providerEmailId: emailId, messageId, userId, status: 'processing', updatedAt: new Date() })
        .onConflictDoNothing()
        .returning({ id: inboundEmails.id })
      // Lost a race with a concurrent delivery of the same email
      return inserted.length > 0 ? { claimed: true, previous: null } : { claimed: false, reason: 'in_progress' }
    }

    if (existing.status === 'processed') return { claimed: false, reason: 'already_processed' }
    const stale = isBefore(existing.updatedAt, subMinutes(new Date(), STALE_CLAIM_MINUTES))
    if (existing.status === 'processing' && !stale) return { claimed: false, reason: 'in_progress' }

    // Retake a failed (or abandoned) attempt. The status + updatedAt guard keeps it atomic.
    const retaken = await db
      .update(inboundEmails)
      .set({ status: 'processing', updatedAt: new Date() })
      .where(
        and(
          eq(inboundEmails.id, existing.id),
          eq(inboundEmails.status, existing.status),
          eq(inboundEmails.updatedAt, existing.updatedAt)
        )
      )
      .returning({ id: inboundEmails.id })
    if (retaken.length === 0) return { claimed: false, reason: 'in_progress' }
    return { claimed: true, previous: (existing.summary as InboundEmailSummary | null) ?? null }
  },

  async finish(provider, emailId, status, summary) {
    await db
      .update(inboundEmails)
      .set({ status, summary: summary as unknown as Record<string, unknown>, updatedAt: new Date() })
      .where(and(eq(inboundEmails.provider, provider), eq(inboundEmails.providerEmailId, emailId)))
  },
}
