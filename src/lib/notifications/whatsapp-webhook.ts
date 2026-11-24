/**
 * Pure helpers for the WhatsApp webhook (src/app/api/webhooks/whatsapp/route.ts).
 * No database imports, so they can be unit tested directly.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'
import type { WhatsAppStatusUpdate } from './whatsapp-notifications'

/**
 * Verify Meta's `X-Hub-Signature-256` header: "sha256=" + hex HMAC-SHA256 of the
 * **raw** request body, keyed with the app secret. Uses a timing-safe comparison.
 */
export function verifyWhatsAppSignature(
  rawBody: Buffer | string,
  signatureHeader: string | null | undefined,
  appSecret: string | undefined,
): boolean {
  if (!appSecret || !signatureHeader) return false

  const [scheme, received] = signatureHeader.trim().split('=', 2)
  if (scheme !== 'sha256' || !received || !/^[0-9a-f]{64}$/i.test(received)) return false

  const expected = createHmac('sha256', appSecret).update(rawBody).digest()
  const actual = Buffer.from(received, 'hex')

  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

/** GET handshake: returns the challenge to echo back, or null if it must be rejected. */
export function verifyWebhookSubscription(params: URLSearchParams, verifyToken: string | undefined): string | null {
  const mode = params.get('hub.mode')
  const token = params.get('hub.verify_token')
  const challenge = params.get('hub.challenge')

  if (!verifyToken || mode !== 'subscribe' || !token || challenge === null) return null

  const a = Buffer.from(token)
  const b = Buffer.from(verifyToken)
  return a.length === b.length && timingSafeEqual(a, b) ? challenge : null
}

interface WebhookPayload {
  object?: string
  entry?: Array<{
    changes?: Array<{
      field?: string
      value?: { statuses?: WhatsAppStatusUpdate[] }
    }>
  }>
}

/** Pull every delivery status out of a (possibly batched) webhook payload. */
export function extractStatuses(payload: unknown): WhatsAppStatusUpdate[] {
  const body = payload as WebhookPayload
  if (!body || body.object !== 'whatsapp_business_account' || !Array.isArray(body.entry)) return []

  const statuses: WhatsAppStatusUpdate[] = []
  for (const entry of body.entry) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue
      for (const status of change.value?.statuses ?? []) {
        if (typeof status?.id === 'string' && typeof status?.status === 'string') statuses.push(status)
      }
    }
  }
  return statuses
}
