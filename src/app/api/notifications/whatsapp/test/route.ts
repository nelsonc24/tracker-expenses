import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { notificationPreferences } from '@/db/schema'
import { isE164, normalizePhoneInput } from '@/lib/phone'
import { sendWhatsAppTemplate } from '@/lib/notifications/whatsapp-service'

// POST /api/notifications/whatsapp/test - send a test WhatsApp message to the signed-in user.
// Body (optional): { phoneNumber } to test a number before saving it; otherwise the saved number is used.
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    let phone: string | null = typeof body?.phoneNumber === 'string' ? normalizePhoneInput(body.phoneNumber) : null

    if (!phone) {
      const [prefs] = await db
        .select({ whatsappPhoneNumber: notificationPreferences.whatsappPhoneNumber })
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId))
        .limit(1)
      phone = prefs?.whatsappPhoneNumber ?? null
    }

    if (!phone || !isE164(phone)) {
      return NextResponse.json(
        { error: 'Enter your WhatsApp number in international format, e.g. +614XXXXXXXX' },
        { status: 400 }
      )
    }

    // Uses the approved `bill_due` template: "Test reminder is due today."
    const result = await sendWhatsAppTemplate(phone, 'bill_due', ['Test reminder', 'today'])

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? 'Failed to send WhatsApp message' }, { status: 502 })
    }

    return NextResponse.json({
      success: true,
      dryRun: result.dryRun === true,
      message: result.dryRun
        ? 'WhatsApp is not configured on the server yet (dry run). Nothing was sent.'
        : 'Test message sent. Check WhatsApp.',
    })
  } catch (error) {
    console.error('WhatsApp test error:', error)
    return NextResponse.json({ error: 'Failed to send test message' }, { status: 500 })
  }
}
