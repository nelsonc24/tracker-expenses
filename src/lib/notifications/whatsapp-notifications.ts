/**
 * WhatsApp ↔ `notifications` table glue: logs each send, and applies delivery statuses
 * reported by the WhatsApp webhook. The API client itself lives in whatsapp-service.ts.
 */

import { and, eq, sql } from 'drizzle-orm'
import { fromUnixTime } from 'date-fns'
import { db } from '@/db'
import { notifications } from '@/db/schema'
import type { NotificationEvent } from './notifier'
import { eventToWhatsAppTemplate, renderTemplatePreview, sendWhatsAppTemplate, type WhatsAppSendResult } from './whatsapp-service'

/** Same notificationType / relatedEntity values the email and Telegram services use. */
function relatedEntity(event: NotificationEvent): {
  notificationType: string
  relatedEntityType: string | null
  relatedEntityId: string | null
} {
  switch (event.type) {
    case 'bill_due':
      return { notificationType: 'bill_reminder', relatedEntityType: 'bill', relatedEntityId: event.billId }
    case 'debt_due':
      return { notificationType: 'debt_reminder', relatedEntityType: 'debt', relatedEntityId: event.debtId }
    case 'budget_alert':
      return { notificationType: 'budget_alert', relatedEntityType: 'budget', relatedEntityId: null }
    default:
      return { notificationType: event.type, relatedEntityType: null, relatedEntityId: null }
  }
}

/** Send `event` as a WhatsApp template to `to` and record it in `notifications`. */
export async function sendWhatsAppEvent(
  userId: string,
  to: string,
  event: NotificationEvent,
): Promise<WhatsAppSendResult & { notificationId?: string }> {
  const template = eventToWhatsAppTemplate(event)
  const message = renderTemplatePreview(template)
  const { notificationType, relatedEntityType, relatedEntityId } = relatedEntity(event)

  const [notification] = await db
    .insert(notifications)
    .values({
      userId,
      notificationType,
      title: `WhatsApp: ${template.name}`,
      message,
      channel: 'whatsapp',
      status: 'pending',
      relatedEntityType,
      relatedEntityId,
      metadata: { whatsappTemplate: template.name },
    })
    .returning()

  const result = await sendWhatsAppTemplate(to, template.name, template.params)

  if (!result.success) {
    await db
      .update(notifications)
      .set({
        status: 'failed',
        errorCount: 1,
        lastErrorMessage: result.error ?? 'Unknown error',
        lastErrorAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(notifications.id, notification.id))
    return { ...result, notificationId: notification.id }
  }

  await db
    .update(notifications)
    .set({
      status: 'sent',
      sentAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        whatsappTemplate: template.name,
        whatsappMessageId: result.messageId,
        ...(result.dryRun ? { dryRun: true } : {}),
      },
    })
    .where(eq(notifications.id, notification.id))

  return { ...result, notificationId: notification.id }
}

export interface WhatsAppStatusUpdate {
  id: string
  status: string
  timestamp?: string
  errors?: Array<{ code?: number; title?: string; message?: string }>
}

/**
 * Apply a delivery status from the webhook to the matching notification row (if any).
 *
 * `status` stays 'sent' for delivered/read so the cron's once-a-day dedupe
 * (`wasNotificationSentRecently`, which looks for status 'sent') keeps working; the raw
 * WhatsApp status goes in metadata.whatsappStatus and the delivered/read timestamps are set.
 * Only 'failed' changes `status`.
 */
export async function applyWhatsAppStatus(update: WhatsAppStatusUpdate): Promise<boolean> {
  const [row] = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.channel, 'whatsapp'), sql`${notifications.metadata}->>'whatsappMessageId' = ${update.id}`))
    .limit(1)

  if (!row) return false

  const seconds = Number(update.timestamp)
  const at = Number.isFinite(seconds) && seconds > 0 ? fromUnixTime(seconds) : new Date()
  const metadata = { ...(row.metadata ?? {}), whatsappStatus: update.status }

  const changes: Partial<typeof notifications.$inferInsert> = { metadata, updatedAt: new Date() }
  if (update.status === 'delivered') changes.deliveredAt = row.deliveredAt ?? at
  if (update.status === 'read') {
    changes.readAt = row.readAt ?? at
    changes.deliveredAt = row.deliveredAt ?? at
  }
  if (update.status === 'failed') {
    const error = update.errors?.[0]
    changes.status = 'failed'
    changes.errorCount = row.errorCount + 1
    changes.lastErrorMessage = error ? `${error.title ?? error.message ?? 'Failed'} (code ${error.code ?? '?'})` : 'Failed'
    changes.lastErrorAt = at
  }

  await db.update(notifications).set(changes).where(eq(notifications.id, row.id))
  return true
}
