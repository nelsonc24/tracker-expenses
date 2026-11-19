import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { ingest } from '@/lib/ingest'
import {
  drizzleSenderLookup,
  processInboundEmail,
  resendClient,
  type EmailReceivedEvent,
} from '@/lib/inbound-email'

// Resend Inbound `email.received` webhook: imports CSV/PDF attachments from approved senders.
export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_INBOUND_WEBHOOK_SECRET
  const apiKey = process.env.RESEND_API_KEY
  if (!secret || !apiKey) {
    return NextResponse.json({ error: 'Missing RESEND_INBOUND_WEBHOOK_SECRET or RESEND_API_KEY' }, { status: 500 })
  }

  const id = request.headers.get('svix-id')
  const timestamp = request.headers.get('svix-timestamp')
  const signature = request.headers.get('svix-signature')
  if (!id || !timestamp || !signature) {
    return NextResponse.json({ error: 'Missing Svix headers' }, { status: 400 })
  }

  // Signature is over the raw body
  const rawBody = await request.text()
  let event: EmailReceivedEvent
  try {
    event = new Webhook(secret).verify(rawBody, {
      'svix-id': id,
      'svix-timestamp': timestamp,
      'svix-signature': signature,
    }) as EmailReceivedEvent
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  try {
    const result = await processInboundEmail(event, {
      findSender: drizzleSenderLookup,
      ingest,
      ...resendClient(apiKey),
    })
    // Log outcomes without sender or file contents
    console.log('Inbound email processed:', result.status, result.reason ?? '', result.attachments.map(a => a.status).join(','))
    return NextResponse.json(result)
  } catch (error) {
    console.error('Inbound email failed:', error)
    // 500 so Resend retries transient failures
    return NextResponse.json({ error: 'Failed to process email' }, { status: 500 })
  }
}
