/**
 * WhatsApp notifications via the official Meta WhatsApp Cloud API.
 *
 * Messages are sent as pre-approved *Utility templates* (see docs/WHATSAPP_NOTIFICATIONS.md for the
 * template texts the owner has to create). No account numbers, balances or transaction details are
 * ever put into a message.
 *
 * Environment variables:
 *   WHATSAPP_TOKEN            permanent system-user token. When missing the service runs in DRY-RUN mode.
 *   WHATSAPP_PHONE_NUMBER_ID  id of the business phone number
 *   WHATSAPP_API_VERSION      Graph API version, e.g. v23.0 (defaults to DEFAULT_API_VERSION)
 *   WHATSAPP_TEMPLATE_LANGUAGE  template language code, default "en" (use "en_AU" if the templates were created in that locale)
 *   WHATSAPP_APP_SECRET / WHATSAPP_VERIFY_TOKEN  used by the webhook (src/app/api/webhooks/whatsapp)
 */

import type { NotificationEvent } from './notifier'

export const DEFAULT_API_VERSION = 'v23.0'
export const DEFAULT_TEMPLATE_LANGUAGE = 'en'

export type WhatsAppTemplateName = 'bill_due' | 'debt_due' | 'budget_alert' | 'import_summary' | 'statement_missing'

export interface WhatsAppTemplate {
  name: WhatsAppTemplateName
  params: string[]
}

export interface WhatsAppSendResult {
  success: boolean
  /** True when no token is configured: the payload was logged, nothing was sent. */
  dryRun?: boolean
  messageId?: string
  error?: string
}

type Env = Record<string, string | undefined>

// ─── Event → template ────────────────────────────────────────────────────────

/** "today" / "tomorrow" / "on Dec 01, 2026" — reads naturally after "is due". */
function duePhrase(daysUntilDue: number, dueDate: string): string {
  if (daysUntilDue <= 0) return 'today'
  if (daysUntilDue === 1) return 'tomorrow'
  return `on ${dueDate}`
}

/** Map a notification event to its approved template and ordered parameters. */
export function buildWhatsAppTemplate(event: NotificationEvent): WhatsAppTemplate {
  switch (event.type) {
    case 'bill_due':
      return { name: 'bill_due', params: [event.billName, duePhrase(event.daysUntilDue, event.dueDate)] }
    case 'debt_due':
      return { name: 'debt_due', params: [event.debtName, duePhrase(event.daysUntilDue, event.dueDate)] }
    case 'budget_alert':
      return { name: 'budget_alert', params: [String(Math.round(event.percentUsed)), event.budgetName] }
    case 'import_summary':
      return { name: 'import_summary', params: [String(event.inserted), String(event.needsReview)] }
    case 'statement_missing':
      return { name: 'statement_missing', params: [event.accountName, String(event.daysSinceImport)] }
  }
}

/** Template parameters can't contain newlines, tabs or runs of 4+ spaces, and can't be empty. */
function cleanParam(value: string): string {
  const cleaned = value.replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim()
  return cleaned || '-'
}

// ─── Sending ─────────────────────────────────────────────────────────────────

export function isDryRun(env: Env = process.env): boolean {
  return !env.WHATSAPP_TOKEN
}

/** Show only the last 3 digits of a phone number in logs. */
function maskNumber(to: string): string {
  return to.length <= 3 ? '***' : `${'*'.repeat(to.length - 3)}${to.slice(-3)}`
}

export interface SendOptions {
  env?: Env
  fetchImpl?: typeof fetch
}

/**
 * Send a template message. `to` is an E.164 number (with or without "+").
 * POST https://graph.facebook.com/{version}/{phone-number-id}/messages
 */
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  params: string[],
  options: SendOptions = {}
): Promise<WhatsAppSendResult> {
  const env = options.env ?? process.env
  const doFetch = options.fetchImpl ?? fetch

  const body = {
    messaging_product: 'whatsapp',
    to: to.replace(/^\+/, ''), // the API takes the number with country code, "+" optional
    type: 'template',
    template: {
      name: templateName,
      language: { code: env.WHATSAPP_TEMPLATE_LANGUAGE || DEFAULT_TEMPLATE_LANGUAGE },
      components: [
        {
          type: 'body',
          parameters: params.map(text => ({ type: 'text', text: cleanParam(text) })),
        },
      ],
    },
  }

  if (isDryRun(env)) {
    console.log('[WhatsApp dry-run] WHATSAPP_TOKEN not set; would send:', JSON.stringify({ ...body, to: maskNumber(body.to) }))
    return { success: true, dryRun: true }
  }

  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID
  if (!phoneNumberId) {
    return { success: false, error: 'WHATSAPP_PHONE_NUMBER_ID is not configured' }
  }

  const version = env.WHATSAPP_API_VERSION || DEFAULT_API_VERSION
  const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`

  try {
    const response = await doFetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const json = (await response.json().catch(() => ({}))) as {
      messages?: Array<{ id: string }>
      error?: { message?: string; code?: number; error_data?: { details?: string } }
    }

    if (!response.ok || json.error) {
      const detail = json.error?.error_data?.details ?? json.error?.message ?? `HTTP ${response.status}`
      console.error('WhatsApp send error:', detail)
      return { success: false, error: detail }
    }

    return { success: true, messageId: json.messages?.[0]?.id }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Network error' }
  }
}
