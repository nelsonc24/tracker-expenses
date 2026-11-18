import { addDays, subDays } from 'date-fns'
import { describe, expect, test, vi } from 'vitest'

vi.mock('@/db', () => ({ db: {} }))

import {
  checkMissingStatements,
  statementReminderDue,
  type AccountImportStatus,
  type StatementReminderDeps,
} from '@/lib/statement-reminders'

const NOW = new Date('2026-11-19T08:00:00Z')

describe('statementReminderDue()', () => {
  const base = { lastReminderAt: null, now: NOW, thresholdDays: 35 }

  test('not due before the threshold, due on and after it', () => {
    expect(statementReminderDue({ ...base, lastImportAt: subDays(NOW, 34) })).toEqual({ due: false, daysSinceImport: 34 })
    expect(statementReminderDue({ ...base, lastImportAt: subDays(NOW, 35) })).toEqual({ due: true, daysSinceImport: 35 })
    expect(statementReminderDue({ ...base, lastImportAt: subDays(NOW, 90) }).due).toBe(true)
  })

  test('honours a custom threshold', () => {
    expect(statementReminderDue({ ...base, thresholdDays: 10, lastImportAt: subDays(NOW, 10) }).due).toBe(true)
    expect(statementReminderDue({ ...base, thresholdDays: 60, lastImportAt: subDays(NOW, 59) }).due).toBe(false)
  })

  test('accounts never imported into are skipped', () => {
    expect(statementReminderDue({ ...base, lastImportAt: null })).toEqual({ due: false, daysSinceImport: null })
  })

  test('only once per period: no repeat until another full period has passed', () => {
    const lastImportAt = subDays(NOW, 50)
    expect(statementReminderDue({ ...base, lastImportAt, lastReminderAt: subDays(NOW, 15) }).due).toBe(false)
    expect(statementReminderDue({ ...base, lastImportAt, lastReminderAt: subDays(NOW, 34) }).due).toBe(false)
    expect(statementReminderDue({ ...base, lastImportAt: subDays(NOW, 80), lastReminderAt: subDays(NOW, 35) }).due).toBe(true)
  })

  test('a new import resets the clock: an old reminder from before it does not block', () => {
    const lastImportAt = subDays(NOW, 40)
    const reminderBeforeImport = subDays(lastImportAt, 1)
    expect(statementReminderDue({ ...base, lastImportAt, lastReminderAt: reminderBeforeImport }).due).toBe(true)
  })
})

describe('checkMissingStatements()', () => {
  function setup(accounts: AccountImportStatus[], sentChannels: Array<'email' | 'telegram' | 'whatsapp'> = ['telegram']) {
    // In-memory "notifications table"
    const reminders: Array<{ userId: string; accountId: string; sentAt: Date; channels: string[] }> = []
    const deps: StatementReminderDeps = {
      listAccounts: async () => accounts,
      lastReminderAt: async (userId, accountId) => {
        const mine = reminders.filter(r => r.userId === userId && r.accountId === accountId)
        return mine.length ? mine[mine.length - 1].sentAt : null
      },
      recordReminder: vi.fn(async ({ userId, accountId, sentAt, channels }) => {
        reminders.push({ userId, accountId, sentAt, channels })
      }),
      notify: vi.fn(async () => ({ sent: sentChannels, skipped: [], errors: [] })),
      now: () => NOW,
    }
    return { deps, reminders }
  }

  const account = (overrides: Partial<AccountImportStatus> = {}): AccountImportStatus => ({
    userId: 'user_1',
    accountId: 'acc_1',
    accountName: 'Everyday',
    lastImportAt: subDays(NOW, 40),
    thresholdDays: null,
    ...overrides,
  })

  test('sends statement_missing for stale accounts only, using the default 35 days', async () => {
    const { deps } = setup([
      account({ accountId: 'stale', accountName: 'Card', lastImportAt: subDays(NOW, 36) }),
      account({ accountId: 'fresh', lastImportAt: subDays(NOW, 3) }),
      account({ accountId: 'never', lastImportAt: null }),
    ])
    const summary = await checkMissingStatements(deps)

    expect(summary).toEqual({ accountsChecked: 3, remindersSent: 1, errors: [] })
    expect(deps.notify).toHaveBeenCalledOnce()
    expect(deps.notify).toHaveBeenCalledWith('user_1', { type: 'statement_missing', accountName: 'Card', daysSinceImport: 36 })
  })

  test('uses the user threshold from notification preferences', async () => {
    const { deps } = setup([account({ lastImportAt: subDays(NOW, 40), thresholdDays: 60 })])
    expect((await checkMissingStatements(deps)).remindersSent).toBe(0)
  })

  test('de-dup: running the cron again the next days does not resend', async () => {
    const { deps, reminders } = setup([account()])
    await checkMissingStatements(deps)
    await checkMissingStatements({ ...deps, now: () => addDays(NOW, 1) })
    await checkMissingStatements({ ...deps, now: () => addDays(NOW, 20) })

    expect(deps.notify).toHaveBeenCalledOnce()
    expect(reminders).toHaveLength(1)
    expect(reminders[0].channels).toEqual(['telegram'])

    // A full period later it reminds again
    await checkMissingStatements({ ...deps, now: () => addDays(NOW, 35) })
    expect(deps.notify).toHaveBeenCalledTimes(2)
  })

  test('nothing delivered (quiet hours / no channel supports it): not recorded, retried next run', async () => {
    const { deps, reminders } = setup([account()], [])
    await checkMissingStatements(deps)
    await checkMissingStatements(deps)
    expect(deps.notify).toHaveBeenCalledTimes(2)
    expect(reminders).toHaveLength(0)
  })

  test('one failing account does not stop the others; channel errors are reported', async () => {
    const { deps } = setup([account({ accountId: 'a' }), account({ accountId: 'b' })])
    deps.lastReminderAt = vi.fn().mockRejectedValueOnce(new Error('db hiccup')).mockResolvedValue(null)
    deps.notify = vi.fn(async () => ({ sent: ['email' as const], skipped: [], errors: [{ channel: 'telegram' as const, error: 'boom' }] }))

    const summary = await checkMissingStatements(deps)
    expect(summary.remindersSent).toBe(1)
    expect(summary.errors).toEqual([
      'Error checking statements for account a: db hiccup',
      'telegram statement reminder failed for account b: boom',
    ])
  })
})
