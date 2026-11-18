import { describe, expect, test, vi } from 'vitest'
import {
  isWithinQuietHours,
  notify,
  type NotificationChannel,
  type NotificationEvent,
  type NotificationPrefs,
  type NotifyDeps,
} from '@/lib/notifications/notifier'

const prefs = (overrides: Partial<NotificationPrefs> = {}): NotificationPrefs => ({
  id: 'p1',
  userId: 'user_1',
  emailNotificationsEnabled: true,
  pushNotificationsEnabled: false,
  billRemindersEnabled: true,
  billReminderDaysBefore: 3,
  billReminderChannel: 'email',
  debtRemindersEnabled: true,
  debtReminderDaysBefore: 3,
  debtReminderChannel: 'email',
  budgetAlertsEnabled: true,
  budgetAlertThreshold: 80,
  budgetAlertChannel: 'email',
  digestFrequency: 'daily',
  quietHoursStart: null,
  quietHoursEnd: null,
  preferredEmail: null,
  transactionAlertsEnabled: false,
  unusualSpendingEnabled: true,
  telegramNotificationsEnabled: true,
  telegramChatId: '123',
  statementReminderDays: 35,
  whatsappNotificationsEnabled: false,
  whatsappPhoneNumber: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const bill: NotificationEvent = {
  type: 'bill_due',
  billId: 'b1',
  billName: 'Rent',
  amount: '$100.00',
  dueDate: 'Dec 01, 2026',
  daysUntilDue: 2,
  isAutoPay: false,
}

function channel(id: 'email' | 'telegram', send: NotificationChannel['send'], enabled = true): NotificationChannel {
  return { id, isEnabled: () => enabled, send: vi.fn(send) }
}

function deps(channels: NotificationChannel[], p = prefs(), now = new Date('2026-12-01T00:00:00Z')): NotifyDeps {
  return { channels, loadContext: async () => ({ prefs: p, timeZone: 'Australia/Sydney' }), now: () => now }
}

describe('isWithinQuietHours', () => {
  // 2026-12-01 is AEDT (UTC+11)
  const at = (utc: string) => new Date(utc)

  test('overnight range crosses midnight', () => {
    expect(isWithinQuietHours(at('2026-12-01T12:00:00Z'), '22:00', '08:00', 'Australia/Sydney')).toBe(true) // 23:00 local
    expect(isWithinQuietHours(at('2026-11-30T20:00:00Z'), '22:00', '08:00', 'Australia/Sydney')).toBe(true) // 07:00 local
    expect(isWithinQuietHours(at('2026-12-01T00:00:00Z'), '22:00', '08:00', 'Australia/Sydney')).toBe(false) // 11:00 local
  })

  test('end is exclusive, start is inclusive', () => {
    expect(isWithinQuietHours(at('2026-11-30T21:00:00Z'), '22:00', '08:00', 'Australia/Sydney')).toBe(false) // 08:00 local
    expect(isWithinQuietHours(at('2026-12-01T11:00:00Z'), '22:00', '08:00', 'Australia/Sydney')).toBe(true) // 22:00 local
  })

  test('same-day range', () => {
    expect(isWithinQuietHours(at('2026-12-01T02:00:00Z'), '12:00', '14:00', 'Australia/Sydney')).toBe(true) // 13:00 local
    expect(isWithinQuietHours(at('2026-12-01T05:00:00Z'), '12:00', '14:00', 'Australia/Sydney')).toBe(false) // 16:00 local
  })

  test('uses the given time zone, not the server zone', () => {
    const t = at('2026-12-01T12:00:00Z') // 23:00 Sydney, 12:00 UTC
    expect(isWithinQuietHours(t, '22:00', '08:00', 'Australia/Sydney')).toBe(true)
    expect(isWithinQuietHours(t, '22:00', '08:00', 'UTC')).toBe(false)
  })

  test.each([[null, null], ['22:00', null], ['bad', '08:00'], ['25:00', '08:00'], ['08:00', '08:00']])(
    'missing or invalid settings (%s, %s) mean no quiet hours',
    (start, end) => {
      expect(isWithinQuietHours(at('2026-12-01T12:00:00Z'), start, end, 'Australia/Sydney')).toBe(false)
    }
  )

  test('an unknown time zone falls back instead of throwing', () => {
    expect(() => isWithinQuietHours(new Date(), '22:00', '08:00', 'Not/AZone')).not.toThrow()
  })
})

describe('notify()', () => {
  test('sends to every enabled channel', async () => {
    const email = channel('email', async () => ({ status: 'sent' }))
    const telegram = channel('telegram', async () => ({ status: 'sent' }))
    const result = await notify('user_1', bill, deps([email, telegram]))
    expect(result).toEqual({ sent: ['email', 'telegram'], skipped: [], errors: [] })
  })

  test('skips disabled channels without calling them', async () => {
    const email = channel('email', async () => ({ status: 'sent' }))
    const telegram = channel('telegram', async () => ({ status: 'sent' }), false)
    const result = await notify('user_1', bill, deps([email, telegram]))
    expect(result.sent).toEqual(['email'])
    expect(result.skipped).toEqual([{ channel: 'telegram', reason: 'disabled' }])
    expect(telegram.send).not.toHaveBeenCalled()
  })

  test('one failing channel does not stop the others or throw', async () => {
    const email = channel('email', async () => ({ status: 'failed', error: 'resend down' }))
    const telegram = channel('telegram', async () => ({ status: 'sent' }))
    const result = await notify('user_1', bill, deps([email, telegram]))
    expect(result.sent).toEqual(['telegram'])
    expect(result.errors).toEqual([{ channel: 'email', error: 'resend down' }])
  })

  test('a channel that throws is collected as an error', async () => {
    const email = channel('email', async () => {
      throw new Error('boom')
    })
    const telegram = channel('telegram', async () => ({ status: 'sent' }))
    const result = await notify('user_1', bill, deps([email, telegram]))
    expect(result.errors).toEqual([{ channel: 'email', error: 'boom' }])
    expect(result.sent).toEqual(['telegram'])
  })

  test('unsupported event types are skipped, not errors', async () => {
    const email = channel('email', async () => ({ status: 'unsupported' }))
    const result = await notify(
      'user_1',
      { type: 'import_summary', accountName: 'Everyday', inserted: 3, needsReview: 1 },
      deps([email])
    )
    expect(result.skipped).toEqual([{ channel: 'email', reason: 'unsupported' }])
    expect(result.errors).toEqual([])
  })

  test('honours the per-type enable flag', async () => {
    const email = channel('email', async () => ({ status: 'sent' }))
    const off = await notify('user_1', bill, deps([email], prefs({ billRemindersEnabled: false })))
    expect(off.skipped).toEqual([{ channel: 'email', reason: 'type_disabled' }])
    expect(email.send).not.toHaveBeenCalled()

    // other types are unaffected by the bill switch
    const debt: NotificationEvent = {
      type: 'debt_due', debtId: 'd1', debtName: 'Car', creditorName: 'Bank',
      minimumPayment: '$1.00', currentBalance: '$2.00', dueDate: 'x', daysUntilDue: 1,
    }
    const on = await notify('user_1', debt, deps([email], prefs({ billRemindersEnabled: false })))
    expect(on.sent).toEqual(['email'])
  })

  test('honours quiet hours', async () => {
    const email = channel('email', async () => ({ status: 'sent' }))
    const quiet = prefs({ quietHoursStart: '22:00', quietHoursEnd: '08:00' })
    const result = await notify('user_1', bill, deps([email], quiet, new Date('2026-12-01T12:00:00Z'))) // 23:00 Sydney
    expect(result.skipped).toEqual([{ channel: 'email', reason: 'quiet_hours' }])
    expect(email.send).not.toHaveBeenCalled()
  })

  test('failing to load preferences is reported, not thrown', async () => {
    const email = channel('email', async () => ({ status: 'sent' }))
    const result = await notify('user_1', bill, {
      channels: [email],
      loadContext: async () => {
        throw new Error('db down')
      },
    })
    expect(result.errors).toEqual([{ channel: 'email', error: 'db down' }])
    expect(email.send).not.toHaveBeenCalled()
  })
})
