import { createHmac, timingSafeEqual } from 'crypto'

// ─── Verification handshake (GET) ────────────────────────────────────────────

/**
 * Meta calls GET with hub.mode=subscribe, hub.verify_token and hub.challenge when the webhook is set up.
 * Returns the challenge to echo back, or null if the request should be rejected (403).
 */
export function verifyHandshake(params: URLSearchParams, verifyToken: string | undefined): string | null {
  if (!verifyToken) return null
  const mode = params.get('hub.mode')
  const token = params.get('hub.verify_token')
  const challenge = params.get('hub.challenge')
  if (mode !== 'subscribe' || !token || challenge === null) return null

  const a = Buffer.from(token)
  const b = Buffer.from(verifyToken)
  return a.length === b.length && timingSafeEqual(a, b) ? challenge : null
}

// ─── Signature (POST) ────────────────────────────────────────────────────────

/**
 * Check `X-Hub-Signature-256: sha256=<hex>`: HMAC-SHA256 of the RAW request body, keyed with the app secret.
 * Must be given the exact bytes Meta sent, not re-serialised JSON.
 */
export function verifySignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header?.startsWith('sha256=')) return false
  const received = Buffer.from(header.slice('sha256='.length), 'hex')
  const expected = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest()
  return received.length === expected.length && timingSafeEqual(received, expected)
}

// ─── Status payloads ─────────────────────────────────────────────────────────

export type WhatsAppDeliveryStatus = 'sent' | 'delivered' | 'read' | 'failed'

export interface ParsedStatus {
  messageId: string
  status: WhatsAppDeliveryStatus
  /** When Meta says it happened (seconds → Date). Falls back to now. */
  at: Date
  error?: string
}

const KNOWN: WhatsAppDeliveryStatus[] = ['sent', 'delivered', 'read', 'failed']

/** Pull delivery statuses out of a webhook payload. Ignores everything else (inbound messages etc.). */
export function parseStatuses(payload: unknown, now: Date = new Date()): ParsedStatus[] {
  const out: ParsedStatus[] = []
  const entries = (payload as { entry?: unknown[] } | null)?.entry
  if (!Array.isArray(entries)) return out

  for (const entry of entries) {
    const changes = (entry as { changes?: unknown[] } | null)?.changes
    if (!Array.isArray(changes)) continue
    for (const change of changes) {
      const statuses = (change as { value?: { statuses?: unknown[] } } | null)?.value?.statuses
      if (!Array.isArray(statuses)) continue

      for (const raw of statuses) {
        const s = raw as {
          id?: string
          status?: string
          timestamp?: string | number
          errors?: Array<{ code?: number; title?: string; message?: string; error_data?: { details?: string } }>
        }
        if (!s?.id || !s.status || !KNOWN.includes(s.status as WhatsAppDeliveryStatus)) continue

        const seconds = Number(s.timestamp)
        const err = s.errors?.[0]
        out.push({
          messageId: s.id,
          status: s.status as WhatsAppDeliveryStatus,
          at: Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000) : now,
          error: err ? (err.error_data?.details ?? err.message ?? err.title ?? (err.code ? `Error ${err.code}` : 'Delivery failed')) : undefined,
        })
      }
    }
  }
  return out
}

// ─── Applying a status to a notification row ─────────────────────────────────

export interface NotificationState {
  status: string
  deliveredAt: Date | null
  readAt: Date | null
}

export interface NotificationPatch {
  status?: string
  deliveredAt?: Date
  readAt?: Date
  errorCount?: number
  lastErrorMessage?: string
  lastErrorAt?: Date
}

/**
 * Work out what to change on the stored notification for an incoming status, or null for "nothing".
 *
 * `status` stays 'sent' for delivered/read (the reminder dedupe only counts 'sent' rows); delivery and
 * read are recorded in `deliveredAt` / `readAt`. Webhooks can arrive out of order, so older states never
 * overwrite newer ones.
 */
export function planStatusUpdate(current: NotificationState, update: ParsedStatus): NotificationPatch | null {
  switch (update.status) {
    case 'sent':
      return null // already recorded when the API call succeeded
    case 'delivered':
      return current.deliveredAt || current.readAt ? null : { deliveredAt: update.at }
    case 'read': {
      if (current.readAt) return null
      return current.deliveredAt ? { readAt: update.at } : { readAt: update.at, deliveredAt: update.at }
    }
    case 'failed':
      if (current.readAt || current.deliveredAt) return null // a late "failed" can't undo a delivery
      return { status: 'failed', errorCount: 1, lastErrorMessage: update.error ?? 'Delivery failed', lastErrorAt: update.at }
  }
}
