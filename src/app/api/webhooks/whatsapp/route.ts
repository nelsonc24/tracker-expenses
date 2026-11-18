import { NextRequest, NextResponse } from 'next/server'
import { applyWhatsAppStatus } from '@/lib/notifications/whatsapp-notifications'
import { extractStatuses, verifyWebhookSubscription, verifyWhatsAppSignature } from '@/lib/notifications/whatsapp-webhook'

// Needs node:crypto and the raw request body
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/webhooks/whatsapp — Meta's verification handshake.
 * Echo `hub.challenge` when `hub.verify_token` matches WHATSAPP_VERIFY_TOKEN.
 */
export async function GET(request: NextRequest) {
  const challenge = verifyWebhookSubscription(request.nextUrl.searchParams, process.env.WHATSAPP_VERIFY_TOKEN)
  if (challenge === null) {
    return new NextResponse('Forbidden', { status: 403 })
  }
  return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
}

/**
 * POST /api/webhooks/whatsapp — event notifications from Meta.
 * Verifies X-Hub-Signature-256 over the raw body, then records delivery statuses
 * (sent / delivered / read / failed) against the matching `notifications` row.
 * Inbound user messages are ignored for now (out of scope, plan 5.5).
 */
export async function POST(request: NextRequest) {
  const appSecret = process.env.WHATSAPP_APP_SECRET
  if (!appSecret) {
    console.error('[whatsapp webhook] WHATSAPP_APP_SECRET is not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  // Read the body once as bytes: the signature is over the exact bytes Meta sent
  const rawBody = Buffer.from(await request.arrayBuffer())

  if (!verifyWhatsAppSignature(rawBody, request.headers.get('x-hub-signature-256'), appSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody.toString('utf8'))
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  for (const status of extractStatuses(payload)) {
    const reason = status.errors?.[0] ? ` (${status.errors[0].code ?? '?'}: ${status.errors[0].title ?? status.errors[0].message ?? ''})` : ''
    console.log(`[whatsapp webhook] message ${status.id} → ${status.status}${reason}`)

    try {
      const matched = await applyWhatsAppStatus(status)
      if (!matched) console.log(`[whatsapp webhook] no notification row for message ${status.id}`)
    } catch (error) {
      // Still acknowledge: Meta retries failed deliveries for days, and the status is only informational
      console.error(`[whatsapp webhook] failed to record status for ${status.id}:`, error)
    }
  }

  return NextResponse.json({ received: true })
}
