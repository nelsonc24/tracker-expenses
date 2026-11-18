import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { notificationPreferences } from '@/db/schema'
import { isE164 } from '@/lib/notifications/phone'
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

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? 'Failed to send test message' }, { status: 502 })
    }

    return NextResponse.json({ success: true, dryRun: result.dryRun ?? false, messageId: result.messageId })
  } catch (error) {
    console.error('Error sending WhatsApp test message:', error)
    return NextResponse.json({ error: 'Failed to send test message' }, { status: 500 })
  }
}
