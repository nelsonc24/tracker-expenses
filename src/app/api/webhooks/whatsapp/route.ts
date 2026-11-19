import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { notifications } from '@/db/schema'
import { parseStatuses, planStatusUpdate, verifyHandshake, verifySignature } from '@/lib/notifications/whatsapp-webhook'

// GET: Meta's one-off verification handshake when the webhook URL is saved in the app dashboard.
export async function GET(request: NextRequest) {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN
  if (!verifyToken) {
    return NextResponse.json({ error: 'Missing WHATSAPP_VERIFY_TOKEN' }, { status: 500 })
  }

  const challenge = verifyHandshake(new URL(request.url).searchParams, verifyToken)
  if (challenge === null) {
    return new NextResponse('Forbidden', { status: 403 })
  }
  return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
}

// POST: delivery-status callbacks (sent / delivered / read / failed). The signature is checked on the raw body.
export async function POST(request: NextRequest) {
  const appSecret = process.env.WHATSAPP_APP_SECRET
  if (!appSecret) {
    return NextResponse.json({ error: 'Missing WHATSAPP_APP_SECRET' }, { status: 500 })
  }

  const rawBody = await request.text()
  if (!verifySignature(rawBody, request.headers.get('x-hub-signature-256'), appSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    let updated = 0
    for (const update of parseStatuses(payload)) {
      const [row] = await db
        .select({ id: notifications.id, status: notifications.status, deliveredAt: notifications.deliveredAt, readAt: notifications.readAt })
        .from(notifications)
        .where(eq(notifications.whatsappMessageId, update.messageId))
        .limit(1)
      if (!row) continue // not one of ours (or a test send)

      const patch = planStatusUpdate(row, update)
      if (!patch) continue

      await db
        .update(notifications)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(notifications.id, row.id))
      updated++
    }
    return NextResponse.json({ success: true, updated })
  } catch (error) {
    console.error('WhatsApp webhook error:', error)
    // 500 makes Meta retry, which is what we want for a transient DB failure
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 })
  }
}
