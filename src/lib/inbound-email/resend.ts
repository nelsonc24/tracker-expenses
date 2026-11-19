import { Webhook } from 'svix'
import {
  AttachmentTooLargeError,
  WebhookVerificationError,
  type InboundAttachment,
  type InboundEmailProvider,
} from './types'
import { extractEmailAddress } from './senders'

/**
 * Resend Inbound adapter. The only file that knows Resend's payload shape.
 *
 * Docs (checked 2026-11-19):
 * - Receiving overview:   https://resend.com/docs/dashboard/receiving/introduction
 * - `email.received` event: https://resend.com/docs/dashboard/receiving/create-receiving-webhook
 *   The webhook carries metadata only (no body, no attachment content).
 * - Attachments:          https://resend.com/docs/dashboard/receiving/attachments
 *   GET https://api.resend.com/emails/receiving/{email_id}/attachments
 *   -> { object: 'list', has_more, data: [{ id, filename, size, content_type, download_url, expires_at, ... }] }
 *   `download_url` is valid for 1 hour.
 * - Signatures:           https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests
 *   Svix headers (svix-id / svix-timestamp / svix-signature) over the raw body.
 *
 * The installed `resend` SDK (6.1.2) predates `emails.receiving`, so the
 * attachments endpoint is called with fetch rather than upgrading the SDK.
 */

const RESEND_API = 'https://api.resend.com'

interface ResendReceivedEvent {
  type: string
  created_at?: string
  data?: {
    email_id?: string
    from?: string
    message_id?: string
    to?: string[]
    subject?: string
    attachments?: Array<{ id: string; filename: string; content_type?: string }>
  }
}

interface ResendAttachmentList {
  object: 'list'
  has_more: boolean
  data: Array<{
    id: string
    filename: string
    size?: number
    content_type?: string
    download_url?: string
    expires_at?: string
  }>
}

export interface ResendProviderOptions {
  webhookSecret: string | undefined
  apiKey: string | undefined
  fetch?: typeof fetch
}

export function createResendProvider(options: ResendProviderOptions): InboundEmailProvider {
  const doFetch = options.fetch ?? fetch

  return {
    name: 'resend',

    verify(rawBody, headers) {
      if (!options.webhookSecret) {
        // Misconfiguration, not a bad request: surfaced as a 500 by the handler
        throw new Error('RESEND_WEBHOOK_SECRET is not set')
      }
      const svixId = headers.get('svix-id')
      const svixTimestamp = headers.get('svix-timestamp')
      const svixSignature = headers.get('svix-signature')
      if (!svixId || !svixTimestamp || !svixSignature) {
        throw new WebhookVerificationError('Missing Svix headers', 'missing_signature')
      }
      try {
        return new Webhook(options.webhookSecret).verify(rawBody, {
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': svixSignature,
        })
      } catch {
        throw new WebhookVerificationError('Invalid signature', 'invalid_signature')
      }
    },

    parseEvent(payload) {
      const event = payload as ResendReceivedEvent
      if (event?.type !== 'email.received' || !event.data?.email_id) return null
      const from = extractEmailAddress(event.data.from ?? '')
      if (!from) return null
      return {
        emailId: event.data.email_id,
        messageId: event.data.message_id ?? null,
        from,
      }
    },

    async listAttachments(emailId) {
      if (!options.apiKey) throw new Error('RESEND_API_KEY is not set')
      const out: InboundAttachment[] = []
      let after: string | undefined

      // Paginate (max 100 per page); statements rarely have more than a few
      for (let page = 0; page < 10; page++) {
        const url = new URL(`${RESEND_API}/emails/receiving/${encodeURIComponent(emailId)}/attachments`)
        url.searchParams.set('limit', '100')
        if (after) url.searchParams.set('after', after)

        const res = await doFetch(url, { headers: { Authorization: `Bearer ${options.apiKey}` } })
        if (!res.ok) throw new Error(`Resend attachments API returned ${res.status}`)
        const body = (await res.json()) as ResendAttachmentList

        for (const a of body.data ?? []) {
          out.push({
            id: a.id,
            filename: a.filename ?? '',
            contentType: a.content_type ?? null,
            size: typeof a.size === 'number' ? a.size : null,
            downloadUrl: a.download_url ?? null,
          })
        }
        if (!body.has_more || !body.data?.length) break
        after = body.data[body.data.length - 1].id
      }
      return out
    },

    async download(attachment, maxBytes) {
      if (!attachment.downloadUrl || !attachment.downloadUrl.startsWith('https://')) {
        throw new Error('Attachment has no usable download URL')
      }
      const res = await doFetch(attachment.downloadUrl)
      if (!res.ok) throw new Error(`Attachment download returned ${res.status}`)

      const declared = Number(res.headers.get('content-length'))
      if (Number.isFinite(declared) && declared > maxBytes) throw new AttachmentTooLargeError(declared)

      return readWithLimit(res, maxBytes)
    },
  }
}

/** Read a response body, stopping as soon as it passes `maxBytes`. */
async function readWithLimit(res: Response, maxBytes: number): Promise<Uint8Array> {
  if (!res.body) {
    const buf = new Uint8Array(await res.arrayBuffer())
    if (buf.byteLength > maxBytes) throw new AttachmentTooLargeError(buf.byteLength)
    return buf
  }

  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      throw new AttachmentTooLargeError(total)
    }
    chunks.push(value)
  }

  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.byteLength
  }
  return out
}

/** The provider used by the webhook route, configured from env. */
export function resendProviderFromEnv(): InboundEmailProvider {
  return createResendProvider({
    webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
    apiKey: process.env.RESEND_API_KEY,
  })
}
