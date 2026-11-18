/**
 * WhatsApp Notification Service (Meta WhatsApp Cloud API, official API only)
 *
 * Sends pre-approved **Utility** template messages from a dedicated business number.
 * See docs/WHATSAPP_NOTIFICATIONS.md for the manual Meta setup.
 *
 * Environment variables:
 *   WHATSAPP_TOKEN              – permanent System User token. When unset the service runs in
 *                                 DRY-RUN mode: it logs the payload and reports success.
 *   WHATSAPP_PHONE_NUMBER_ID    – the business phone number ID (not the phone number itself)
 *   WHATSAPP_API_VERSION        – Graph API version, e.g. "v24.0" (defaults to DEFAULT_API_VERSION)
 *   WHATSAPP_TEMPLATE_LANGUAGE  – language code the templates were approved in (default "en")
 *
 * This module has no database imports so it can be unit tested in isolation.
 */

import { format, isValid, parse } from 'date-fns'
import type { NotificationEvent } from './notifier'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WhatsAppSendResult {
  success: boolean
  /** The WhatsApp message ID ("wamid.…"); used to match delivery status webhooks. */
  messageId?: string
  /** True when WHATSAPP_TOKEN is unset and nothing was actually sent. */
  dryRun?: boolean
  error?: string
}

/** Template names that must exist (approved, Utility category) in WhatsApp Manager. */
export type WhatsAppTemplateName = 'bill_due' | 'debt_due' | 'budget_alert' | 'import_summary' | 'statement_missing'

export interface WhatsAppTemplate {
  name: WhatsAppTemplateName
  /** Positional body parameters: params[0] fills {{1}}, params[1] fills {{2}}, … */
  params: string[]
}

export interface WhatsAppTemplatePayload {
  messaging_product: 'whatsapp'
  recipient_type: 'individual'
  to: string
  type: 'template'
  template: {
    name: string
    language: { code: string }
    components?: Array<{ type: 'body'; parameters: Array<{ type: 'text'; text: string }> }>
  }
}

export interface SendOptions {
  /** Overrides WHATSAPP_TEMPLATE_LANGUAGE (e.g. Meta's sample `hello_world` is `en_US`). */
  languageCode?: string
  /** Injected in tests. */
  fetchImpl?: typeof fetch
}

export const DEFAULT_API_VERSION = 'v24.0'
const DEFAULT_LANGUAGE = 'en'
/** Meta rejects template parameters longer than this. */
const MAX_PARAM_LENGTH = 1024

// ─── Payload ─────────────────────────────────────────────────────────────────

/** Meta rejects parameters containing newlines, tabs or more than 4 consecutive spaces. */
function sanitizeParam(value: string): string {
  return value.replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim().slice(0, MAX_PARAM_LENGTH)
}

/**
 * Request body for POST /{version}/{phone-number-id}/messages (template message,
 * positional body parameters). Shape checked against Meta's Cloud API docs (2026-11).
 */
export function buildTemplatePayload(
  to: string,
  templateName: string,
  params: string[],
  languageCode: string,
): WhatsAppTemplatePayload {
  const payload: WhatsAppTemplatePayload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
    },
  }

  if (params.length > 0) {
    payload.template.components = [
      { type: 'body', parameters: params.map(text => ({ type: 'text', text: sanitizeParam(text) })) },
    ]
  }

  return payload
}

// ─── Send ────────────────────────────────────────────────────────────────────

/**
 * Send an approved template message to `to` (E.164, e.g. +61412345678).
 * Never throws: failures are returned as `{ success: false, error }`.
 */
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  params: string[] = [],
  options: SendOptions = {},
): Promise<WhatsAppSendResult> {
  const token = process.env.WHATSAPP_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const apiVersion = process.env.WHATSAPP_API_VERSION || DEFAULT_API_VERSION
  const languageCode = options.languageCode || process.env.WHATSAPP_TEMPLATE_LANGUAGE || DEFAULT_LANGUAGE

  const payload = buildTemplatePayload(to, templateName, params, languageCode)

  if (!token) {
    // Lets the feature ship before the Meta setup is finished
    console.log('[whatsapp] DRY RUN (WHATSAPP_TOKEN not set). Would send:', JSON.stringify(payload))
    return { success: true, dryRun: true }
  }

  if (!phoneNumberId) {
    return { success: false, error: 'WHATSAPP_PHONE_NUMBER_ID is not configured' }
  }

  const url = `https://graph.facebook.com/${apiVersion}/${encodeURIComponent(phoneNumberId)}/messages`

  try {
    const response = await (options.fetchImpl ?? fetch)(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const json = (await response.json().catch(() => ({}))) as {
      messages?: Array<{ id: string; message_status?: string }>
      error?: { message?: string; code?: number }
    }

    if (!response.ok || json.error) {
      const message = json.error?.message ?? `HTTP ${response.status}`
      const error = json.error?.code ? `${message} (code ${json.error.code})` : message
      console.error('[whatsapp] send error:', error)
      return { success: false, error }
    }

    return { success: true, messageId: json.messages?.[0]?.id }
  } catch (error) {
    console.error('[whatsapp] send error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// ─── Event → template mapping ────────────────────────────────────────────────

/** Format used by the reminders cron for `dueDate` (see check-reminders/route.ts). */
const EVENT_DATE_FORMAT = 'MMM dd, yyyy'

/** "today", "tomorrow", "on Mon 24 Nov" (falls back to "in N days" / the raw string). */
export function describeDueDate(dueDate: string, daysUntilDue: number): string {
  if (daysUntilDue <= 0) return 'today'
  if (daysUntilDue === 1) return 'tomorrow'

  const parsed = parse(dueDate, EVENT_DATE_FORMAT, new Date())
  if (isValid(parsed)) return `on ${format(parsed, 'EEE d MMM')}`

  return dueDate ? `on ${dueDate}` : `in ${daysUntilDue} days`
}

/**
 * Map an event to its WhatsApp template and positional parameters.
 * Wording is fixed by the approved templates (plan 5.0) and is deliberately generic:
 * no account numbers, balances or amounts.
 *
 *   bill_due          "{{1}} is due {{2}}."
 *   debt_due          "Payment for {{1}} is due {{2}}."
 *   budget_alert      "You've used {{1}}% of your {{2}} budget."
 *   import_summary    "{{1}} new transactions imported, {{2}} need review."
 *   statement_missing "No statement imported for {{1}} in {{2}} days."
 */
export function eventToWhatsAppTemplate(event: NotificationEvent): WhatsAppTemplate {
  switch (event.type) {
    case 'bill_due':
      return { name: 'bill_due', params: [event.billName, describeDueDate(event.dueDate, event.daysUntilDue)] }
    case 'debt_due':
      return { name: 'debt_due', params: [event.debtName, describeDueDate(event.dueDate, event.daysUntilDue)] }
    case 'budget_alert':
      return { name: 'budget_alert', params: [String(Math.round(event.percentUsed)), event.budgetName] }
    case 'import_summary':
      return { name: 'import_summary', params: [String(event.inserted), String(event.needsReview)] }
    case 'statement_missing':
      return { name: 'statement_missing', params: [event.accountName, String(event.daysSinceImport)] }
    default: {
      const unhandled: never = event
      throw new Error(`No WhatsApp template for event ${JSON.stringify(unhandled)}`)
    }
  }
}

/** Render the template text locally, for the notifications log (what the user will read). */
export function renderTemplatePreview(template: WhatsAppTemplate): string {
  const bodies: Record<WhatsAppTemplateName, string> = {
    bill_due: '{{1}} is due {{2}}.',
    debt_due: 'Payment for {{1}} is due {{2}}.',
    budget_alert: "You've used {{1}}% of your {{2}} budget.",
    import_summary: '{{1}} new transactions imported, {{2}} need review.',
    statement_missing: 'No statement imported for {{1}} in {{2}} days.',
  }
  return bodies[template.name].replace(/\{\{(\d+)\}\}/g, (_, n: string) => template.params[Number(n) - 1] ?? '')
}
