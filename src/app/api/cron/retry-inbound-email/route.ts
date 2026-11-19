import { NextRequest, NextResponse } from 'next/server'
import { ingest } from '@/lib/ingest'
import { notify } from '@/lib/notifications/notifier'
import { retryInboundEmails } from '@/lib/inbound-email/process'
import { resendProviderFromEnv } from '@/lib/inbound-email/resend'
import { drizzleInboundEmailStore } from '@/lib/inbound-email/store'

export const runtime = 'nodejs'
// A few emails per run (see listRetryable's limit); if a run is cut off, those claims go stale and are retried next run
export const maxDuration = 60

/**
 * GET /api/cron/retry-inbound-email — retries email imports that failed or timed out
 * (see docs/EMAIL_INGESTION.md). After the last attempt the user gets an `import_failed` alert.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[Inbound Email Retry] CRON_SECRET not configured')
    return NextResponse.json({ error: 'Cron job not configured' }, { status: 500 })
  }
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const summary = await retryInboundEmails({
      provider: resendProviderFromEnv(),
      store: drizzleInboundEmailStore,
      ingest: params => ingest(params),
      notify: (userId, event) => notify(userId, event),
    })
    console.log('[Inbound Email Retry] done', summary)
    return NextResponse.json({ success: true, ...summary })
  } catch (error) {
    console.error('[Inbound Email Retry] failed', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Retry failed' }, { status: 500 })
  }
}
