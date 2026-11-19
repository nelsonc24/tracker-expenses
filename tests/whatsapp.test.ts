import { createHmac } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { NotificationEvent } from '@/lib/notifications/notifier'
import { isE164, normalizePhoneInput } from '@/lib/notifications/phone'
import {
  buildTemplatePayload,
  describeDueDate,
  eventToWhatsAppTemplate,
  renderTemplatePreview,
  sendWhatsAppTemplate,
} from '@/lib/notifications/whatsapp-service'
import { extractStatuses, verifyWebhookSubscription, verifyWhatsAppSignature } from '@/lib/notifications/whatsapp-webhook'

const ENV_KEYS = ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_API_VERSION', 'WHATSAPP_TEMPLATE_LANGUAGE'] as const
const savedEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {}

beforeEach(() => {
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key]
    delete process.env[key]
  }
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key]
    else process.env[key] = savedEnv[key]
  }
  vi.restoreAllMocks()
})

// ─── Template mapping ────────────────────────────────────────────────────────

describe('eventToWhatsAppTemplate', () => {
  const cases: Array<{ event: NotificationEvent; name: string; params: string[]; text: string }> = [
    {
      event: { type: 'bill_due', billId: 'b1', billName: 'Netflix', amount: '$22.99', dueDate: 'Nov 24, 2026', daysUntilDue: 3, isAutoPay: false },
      name: 'bill_due',
      params: ['Netflix', 'on Tue 24 Nov'],
      text: 'Netflix is due on Tue 24 Nov.',
    },
    {
      event: {
        type: 'debt_due',
        debtId: 'd1',
        debtName: 'Car loan',
        creditorName: 'Big Bank',
        minimumPayment: '$450.00',
        currentBalance: '$12000.00',
        dueDate: 'Nov 20, 2026',
        daysUntilDue: 1,
      },
      name: 'debt_due',
      params: ['Car loan', 'tomorrow'],
      text: 'Payment for Car loan is due tomorrow.',
    },
    {
      event: { type: 'budget_alert', budgetName: 'Groceries', percentUsed: 82.6 },
      name: 'budget_alert',
      params: ['83', 'Groceries'],
      text: "You've used 83% of your Groceries budget.",
    },
    {
      event: { type: 'import_summary', accountName: 'Everyday', inserted: 14, needsReview: 2 },
      name: 'import_summary',
      params: ['14', '2'],
      text: '14 new transactions imported, 2 need review.',
    },
    {
      event: { type: 'statement_missing', accountName: 'Latitude card', daysSinceImport: 40 },
      name: 'statement_missing',
      params: ['Latitude card', '40'],
      text: 'No statement imported for Latitude card in 40 days.',
    },
  ]

  test.each(cases)('$event.type → $name', ({ event, name, params, text }) => {
    const template = eventToWhatsAppTemplate(event)
    expect(template).toEqual({ name, params })
    expect(renderTemplatePreview(template)).toBe(text)
  })

  test('never leaks amounts or balances', () => {
    const debt = cases[1].event
    const { params } = eventToWhatsAppTemplate(debt)
    expect(params.join(' ')).not.toMatch(/\$|12000|450|Big Bank/)
  })
})

describe('describeDueDate', () => {
  test('today / tomorrow / formatted date / fallbacks', () => {
    expect(describeDueDate('Nov 19, 2026', 0)).toBe('today')
    expect(describeDueDate('Nov 20, 2026', 1)).toBe('tomorrow')
    expect(describeDueDate('Dec 01, 2026', 12)).toBe('on Tue 1 Dec')
    expect(describeDueDate('soon-ish', 5)).toBe('on soon-ish')
    expect(describeDueDate('', 5)).toBe('in 5 days')
  })
})

// ─── Payload + sending ───────────────────────────────────────────────────────

describe('buildTemplatePayload', () => {
  test('matches the Cloud API template message shape', () => {
    expect(buildTemplatePayload('+61412345678', 'bill_due', ['Rent', 'today'], 'en')).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '+61412345678',
      type: 'template',
      template: {
        name: 'bill_due',
        language: { code: 'en' },
        components: [{ type: 'body', parameters: [{ type: 'text', text: 'Rent' }, { type: 'text', text: 'today' }] }],
      },
    })
  })

  test('omits components when there are no params and strips newlines from params', () => {
    expect(buildTemplatePayload('+61412345678', 'hello_world', [], 'en_US').template.components).toBeUndefined()
    const payload = buildTemplatePayload('+61412345678', 'bill_due', ['Line1\nLine2\t   x'], 'en')
    expect(payload.template.components?.[0].parameters[0].text).toBe('Line1 Line2 x')
  })
})

describe('sendWhatsAppTemplate', () => {
  test('dry-run when WHATSAPP_TOKEN is unset: logs, never calls fetch, reports success', async () => {
    const fetchImpl = vi.fn()
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})

    const result = await sendWhatsAppTemplate('+61412345678', 'bill_due', ['Rent', 'today'], { fetchImpl })

    expect(result).toEqual({ success: true, dryRun: true })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith(expect.stringContaining('DRY RUN'), expect.stringContaining('"name":"bill_due"'))
  })

  test('live mode posts to the Graph API with bearer token and returns the wamid', async () => {
    process.env.WHATSAPP_TOKEN = 'test-token'
    process.env.WHATSAPP_PHONE_NUMBER_ID = '1234567890'
    process.env.WHATSAPP_API_VERSION = 'v99.0'
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ messaging_product: 'whatsapp', messages: [{ id: 'wamid.ABC' }] }), { status: 200 })
    )

    const result = await sendWhatsAppTemplate('+61412345678', 'budget_alert', ['80', 'Food'], { fetchImpl })

    expect(result).toEqual({ success: true, messageId: 'wamid.ABC' })
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://graph.facebook.com/v99.0/1234567890/messages')
    expect(init.headers.Authorization).toBe('Bearer test-token')
    expect(JSON.parse(init.body).template.name).toBe('budget_alert')
  })

  test('returns Meta errors instead of throwing', async () => {
    process.env.WHATSAPP_TOKEN = 'test-token'
    process.env.WHATSAPP_PHONE_NUMBER_ID = '1234567890'
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'Template name does not exist', code: 132001 } }), { status: 404 })
    )

    const result = await sendWhatsAppTemplate('+61412345678', 'bill_due', ['a', 'b'], { fetchImpl })
    expect(result).toEqual({ success: false, error: 'Template name does not exist (code 132001)' })
  })

  test('live mode without a phone number ID fails clearly', async () => {
    process.env.WHATSAPP_TOKEN = 'test-token'
    const result = await sendWhatsAppTemplate('+61412345678', 'bill_due', [], { fetchImpl: vi.fn() })
    expect(result).toEqual({ success: false, error: 'WHATSAPP_PHONE_NUMBER_ID is not configured' })
  })
})

// ─── Phone validation ────────────────────────────────────────────────────────

describe('E.164 validation', () => {
  test.each(['+61412345678', '+14155552671', '+447911123456'])('accepts %s', n => expect(isE164(n)).toBe(true))
  test.each(['0412345678', '61412345678', '+0412345678', '+61 412 345 678', '+1234', '+1234567890123456', '', null])(
    'rejects %s',
    n => expect(isE164(n)).toBe(false)
  )
  test('normalises common separators', () => {
    expect(normalizePhoneInput('+61 (412) 345-678')).toBe('+61412345678')
  })
})

// ─── Webhook ─────────────────────────────────────────────────────────────────

describe('verifyWhatsAppSignature', () => {
  const secret = 'app-secret'
  const body = Buffer.from('{"object":"whatsapp_business_account","entry":[]}')
  const sign = (payload: Buffer | string, key = secret) => `sha256=${createHmac('sha256', key).update(payload).digest('hex')}`

  test('valid signature over the raw body', () => {
    expect(verifyWhatsAppSignature(body, sign(body), secret)).toBe(true)
  })

  test('invalid: wrong secret, tampered body, wrong scheme, malformed hex', () => {
    expect(verifyWhatsAppSignature(body, sign(body, 'other-secret'), secret)).toBe(false)
    expect(verifyWhatsAppSignature(Buffer.from(body.toString() + ' '), sign(body), secret)).toBe(false)
    expect(verifyWhatsAppSignature(body, sign(body).replace('sha256=', 'sha1='), secret)).toBe(false)
    expect(verifyWhatsAppSignature(body, 'sha256=not-hex', secret)).toBe(false)
  })

  test('missing header or secret', () => {
    expect(verifyWhatsAppSignature(body, null, secret)).toBe(false)
    expect(verifyWhatsAppSignature(body, '', secret)).toBe(false)
    expect(verifyWhatsAppSignature(body, sign(body), undefined)).toBe(false)
  })
})

describe('verifyWebhookSubscription', () => {
  const params = (p: Record<string, string>) => new URLSearchParams(p)

  test('echoes the challenge when the token matches', () => {
    expect(
      verifyWebhookSubscription(params({ 'hub.mode': 'subscribe', 'hub.verify_token': 'tok', 'hub.challenge': '1158201444' }), 'tok')
    ).toBe('1158201444')
  })

  test('rejects wrong token, wrong mode, or unset verify token', () => {
    const ok = { 'hub.mode': 'subscribe', 'hub.verify_token': 'tok', 'hub.challenge': '42' }
    expect(verifyWebhookSubscription(params({ ...ok, 'hub.verify_token': 'nope' }), 'tok')).toBeNull()
    expect(verifyWebhookSubscription(params({ ...ok, 'hub.mode': 'unsubscribe' }), 'tok')).toBeNull()
    expect(verifyWebhookSubscription(params(ok), undefined)).toBeNull()
  })
})

describe('extractStatuses', () => {
  test('pulls statuses from every entry/change and ignores other payloads', () => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            { field: 'messages', value: { statuses: [{ id: 'wamid.1', status: 'delivered', timestamp: '1763500000' }] } },
            { field: 'messages', value: { messages: [{ id: 'inbound' }] } },
          ],
        },
        { changes: [{ field: 'messages', value: { statuses: [{ id: 'wamid.2', status: 'failed', errors: [{ code: 131049 }] }] } }] },
      ],
    }
    expect(extractStatuses(payload).map(s => `${s.id}:${s.status}`)).toEqual(['wamid.1:delivered', 'wamid.2:failed'])
    expect(extractStatuses({ object: 'page', entry: [] })).toEqual([])
    expect(extractStatuses(null)).toEqual([])
  })
})
