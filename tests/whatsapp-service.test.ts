import { describe, expect, test, vi } from 'vitest'
import { buildWhatsAppTemplate, isDryRun, sendWhatsAppTemplate } from '@/lib/notifications/whatsapp-service'
import type { NotificationEvent } from '@/lib/notifications/notifier'

const env = { WHATSAPP_TOKEN: 'tok', WHATSAPP_PHONE_NUMBER_ID: '1234567890', WHATSAPP_API_VERSION: 'v99.0' }

function okFetch(json: unknown = { messages: [{ id: 'wamid.ABC' }] }, status = 200) {
  return vi.fn(async () => new Response(JSON.stringify(json), { status })) as unknown as typeof fetch & ReturnType<typeof vi.fn>
}

describe('buildWhatsAppTemplate', () => {
  const bill = (daysUntilDue: number): NotificationEvent => ({
    type: 'bill_due', billId: 'b', billName: 'Rent', amount: '$100.00', dueDate: 'Dec 01, 2026', daysUntilDue, isAutoPay: false,
  })

  test('bill_due phrases the due date relative to today', () => {
    expect(buildWhatsAppTemplate(bill(0))).toEqual({ name: 'bill_due', params: ['Rent', 'today'] })
    expect(buildWhatsAppTemplate(bill(1)).params[1]).toBe('tomorrow')
    expect(buildWhatsAppTemplate(bill(5)).params[1]).toBe('on Dec 01, 2026')
  })

  test('debt_due uses the debt name only (no creditor, balance or amounts)', () => {
    const t = buildWhatsAppTemplate({
      type: 'debt_due', debtId: 'd', debtName: 'Car loan', creditorName: 'Bank', minimumPayment: '$1', currentBalance: '$9,999', dueDate: 'x', daysUntilDue: 1,
    })
    expect(t).toEqual({ name: 'debt_due', params: ['Car loan', 'tomorrow'] })
  })

  test('bill_due never leaks the amount', () => {
    expect(JSON.stringify(buildWhatsAppTemplate(bill(2)))).not.toContain('100')
  })

  test('budget_alert, import_summary and statement_missing', () => {
    expect(buildWhatsAppTemplate({ type: 'budget_alert', budgetName: 'Groceries', percentUsed: 82.6 })).toEqual({
      name: 'budget_alert', params: ['83', 'Groceries'],
    })
    expect(buildWhatsAppTemplate({ type: 'import_summary', accountName: 'Everyday', inserted: 12, needsReview: 3 })).toEqual({
      name: 'import_summary', params: ['12', '3'],
    })
    expect(buildWhatsAppTemplate({ type: 'statement_missing', accountName: 'Everyday', daysSinceImport: 40 })).toEqual({
      name: 'statement_missing', params: ['Everyday', '40'],
    })
  })
})

describe('sendWhatsAppTemplate', () => {
  test('posts the documented template payload', async () => {
    const fetchImpl = okFetch()
    const result = await sendWhatsAppTemplate('+61412345678', 'bill_due', ['Rent', 'today'], { env, fetchImpl })

    expect(result).toEqual({ success: true, messageId: 'wamid.ABC' })
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://graph.facebook.com/v99.0/1234567890/messages')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
    expect(JSON.parse(init.body as string)).toEqual({
      messaging_product: 'whatsapp',
      to: '61412345678',
      type: 'template',
      template: {
        name: 'bill_due',
        language: { code: 'en' },
        components: [{ type: 'body', parameters: [{ type: 'text', text: 'Rent' }, { type: 'text', text: 'today' }] }],
      },
    })
  })

  test('language can be overridden (en_AU)', async () => {
    const fetchImpl = okFetch()
    await sendWhatsAppTemplate('+61412345678', 'bill_due', ['a', 'b'], { env: { ...env, WHATSAPP_TEMPLATE_LANGUAGE: 'en_AU' }, fetchImpl })
    const body = JSON.parse(((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit).body as string)
    expect(body.template.language.code).toBe('en_AU')
  })

  test('parameters are cleaned: no newlines/tabs/long space runs, never empty', async () => {
    const fetchImpl = okFetch()
    await sendWhatsAppTemplate('+61412345678', 'bill_due', ['Line1\nLine2\t  x    y', '   '], { env, fetchImpl })
    const body = JSON.parse(((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit).body as string)
    expect(body.template.components[0].parameters.map((p: { text: string }) => p.text)).toEqual(['Line1 Line2 x y', '-'])
  })

  test('dry-run without a token: nothing is sent, payload is logged with the number masked', async () => {
    const fetchImpl = okFetch()
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const result = await sendWhatsAppTemplate('+61412345678', 'bill_due', ['Rent', 'today'], { env: {}, fetchImpl })

    expect(result).toEqual({ success: true, dryRun: true })
    expect(fetchImpl).not.toHaveBeenCalled()
    const logged = String(log.mock.calls[0].join(' '))
    expect(logged).toContain('bill_due')
    expect(logged).not.toContain('61412345678')
    expect(logged).toContain('678')
    log.mockRestore()
  })

  test('isDryRun follows the token', () => {
    expect(isDryRun({})).toBe(true)
    expect(isDryRun({ WHATSAPP_TOKEN: 'x' })).toBe(false)
  })

  test('missing phone number id is a clear error', async () => {
    const result = await sendWhatsAppTemplate('+61412345678', 'bill_due', ['a', 'b'], { env: { WHATSAPP_TOKEN: 'tok' }, fetchImpl: okFetch() })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/PHONE_NUMBER_ID/)
  })

  test('API errors surface Meta’s message', async () => {
    const fetchImpl = okFetch({ error: { message: 'Invalid parameter', code: 100, error_data: { details: 'Template name does not exist' } } }, 400)
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await sendWhatsAppTemplate('+61412345678', 'nope', ['a'], { env, fetchImpl })
    expect(result).toEqual({ success: false, error: 'Template name does not exist' })
    err.mockRestore()
  })

  test('network failures are returned, not thrown', async () => {
    const fetchImpl = vi.fn(() => Promise.reject(new Error('socket hang up'))) as unknown as typeof fetch
    const result = await sendWhatsAppTemplate('+61412345678', 'bill_due', ['a', 'b'], { env, fetchImpl })
    expect(result).toEqual({ success: false, error: 'socket hang up' })
  })
})
