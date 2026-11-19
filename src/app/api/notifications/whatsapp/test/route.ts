import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { and, eq, gt, sql } from 'drizzle-orm'
import { subDays, subHours } from 'date-fns'
import { db } from '@/db'
import { notificationPreferences, notifications } from '@/db/schema'
import { isE164 } from '@/lib/notifications/phone'
import {
  isWhatsAppAllowedUser,
  testRateLimitExceeded,
  WHATSAPP_TEST_NOTIFICATION_TYPE,
} from '@/lib/notifications/whatsapp-access'
import { sendWhatsAppTemplate } from '@/lib/notifications/whatsapp-service'

/**
 * Meta's sample template, pre-approved on every WhatsApp Business Account, so the test works
 * before the custom templates are approved. It only exists in en_US.
 */
const TEST_TEMPLATE = { name: 'hello_world', languageCode: 'en_US' }

/**
 * POST /api/notifications/whatsapp/test — send a test message to the user's SAVED number.
 * The number is never taken from the request body, so this can't be used to message
 * arbitrary numbers on the owner's Meta account.
 */
export async function POST() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isWhatsAppAllowedUser(userId)) {
      return NextResponse.json({ error: 'WhatsApp notifications are not enabled for this account' }, { status: 403 })
    }

    // Rate limit: each test is a billed message once WhatsApp is live
    const now = new Date()
    const [counts] = await db
      .select({
        lastHour: sql<number>`count(*) filter (where ${notifications.createdAt} > ${subHours(now, 1)})`.mapWith(Number),
        lastDay: sql<number>`count(*)`.mapWith(Number),
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.notificationType, WHATSAPP_TEST_NOTIFICATION_TYPE),
          gt(notifications.createdAt, subDays(now, 1))
        )
      )
    const limited = testRateLimitExceeded(counts?.lastHour ?? 0, counts?.lastDay ?? 0)
    if (limited) {
      return NextResponse.json({ error: limited }, { status: 429 })
    }

    const [prefs] = await db
      .select({ whatsappPhoneNumber: notificationPreferences.whatsappPhoneNumber })
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1)

    const phone = prefs?.whatsappPhoneNumber
    if (!isE164(phone)) {
      return NextResponse.json(
        { error: 'Save a WhatsApp number in E.164 format (e.g. +61412345678) first' },
        { status: 400 }
      )
    }

    const result = await sendWhatsAppTemplate(phone, TEST_TEMPLATE.name, [], { languageCode: TEST_TEMPLATE.languageCode })

    // Every attempt counts towards the limit, including failed ones
    await db.insert(notifications).values({
      userId,
      notificationType: WHATSAPP_TEST_NOTIFICATION_TYPE,
      title: 'WhatsApp test message',
      message: 'Test message from settings',
      channel: 'whatsapp',
      status: result.success ? 'sent' : 'failed',
      sentAt: result.success ? now : null,
      metadata: {
        ...(result.messageId ? { whatsappMessageId: result.messageId } : {}),
        ...(result.dryRun ? { dryRun: true } : {}),
        ...(result.success ? {} : { errorMessage: result.error }),
      },
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? 'Failed to send test message' }, { status: 502 })
    }

    return NextResponse.json({ success: true, dryRun: result.dryRun ?? false, messageId: result.messageId })
  } catch (error) {
    console.error('Error sending WhatsApp test message:', error)
    return NextResponse.json({ error: 'Failed to send test message' }, { status: 500 })
  }
}
