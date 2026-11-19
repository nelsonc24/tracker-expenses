import { NextRequest, NextResponse, after } from 'next/server'
import { ingest } from '@/lib/ingest'
import { notify } from '@/lib/notifications/notifier'
import { handleInboundEmailWebhook } from '@/lib/inbound-email/process'
import { resendProviderFromEnv } from '@/lib/inbound-email/resend'
import { drizzleInboundEmailStore } from '@/lib/inbound-email/store'

export const runtime = 'nodejs'
// Attachment download + PDF parsing (possibly via Gemini) run in after()
export const maxDuration = 60

// POST /api/webhooks/inbound-email — Resend `email.received` webhook (see docs/EMAIL_INGESTION.md).
// Public route: authenticated by the Svix signature, not Clerk.
export async function POST(request: NextRequest) {
  // Raw body: the signature is computed over the exact bytes
  const rawBody = await request.text()

  const result = await handleInboundEmailWebhook(
    { rawBody, headers: request.headers },
    {
      provider: resendProviderFromEnv(),
      store: drizzleInboundEmailStore,
      ingest: params => ingest(params),
      schedule: task => after(task),
      notify: (userId, event) => notify(userId, event),
    }
  )

  return NextResponse.json(result.body, { status: result.status })
}
