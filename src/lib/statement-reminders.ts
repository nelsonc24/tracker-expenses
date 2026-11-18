/**
 * Missing-statement reminder (plan 3.3).
 *
 * For each active account that has been imported into before, if no import has happened for
 * the user's `statementReminderDays` (default 35), send a `statement_missing` notification.
 * At most one reminder per account per period: after a reminder, the next one waits another
 * full period, and a new import resets the clock.
 *
 * "Last import" = newest transaction on the account created by the import pipeline (only
 * `ingest()` sets `duplicate_check_hash`). Accounts never imported into are skipped, so
 * manual-only accounts (cash etc.) don't nag.
 */
import { and, eq, isNotNull, max } from 'drizzle-orm'
import { differenceInCalendarDays } from 'date-fns'
import { db } from '@/db'
import { accounts, notificationPreferences, notifications, transactions } from '@/db/schema'
import type { NotificationEvent, NotifyResult } from '@/lib/notifications/notifier'

export const DEFAULT_STATEMENT_REMINDER_DAYS = 35
const NOTIFICATION_TYPE = 'statement_missing'

export interface AccountImportStatus {
  userId: string
  accountId: string
  accountName: string
  lastImportAt: Date | null
  /** User setting; null when they have no preferences row. */
  thresholdDays: number | null
}

export interface ReminderDecision {
  due: boolean
  daysSinceImport: number | null
}

/** Pure decision: should a reminder go out for this account now? */
export function statementReminderDue(input: {
  lastImportAt: Date | null
  lastReminderAt: Date | null
  now: Date
  thresholdDays: number
}): ReminderDecision {
  const { lastImportAt, lastReminderAt, now, thresholdDays } = input
  if (!lastImportAt) return { due: false, daysSinceImport: null }

  const daysSinceImport = differenceInCalendarDays(now, lastImportAt)
  if (daysSinceImport < thresholdDays) return { due: false, daysSinceImport }

  // Already reminded during this gap, and less than a full period ago
  const remindedThisGap = lastReminderAt !== null && lastReminderAt > lastImportAt
  if (remindedThisGap && differenceInCalendarDays(now, lastReminderAt) < thresholdDays) {
    return { due: false, daysSinceImport }
  }

  return { due: true, daysSinceImport }
}

export interface StatementReminderDeps {
  listAccounts(): Promise<AccountImportStatus[]>
  lastReminderAt(userId: string, accountId: string): Promise<Date | null>
  /** Record a delivered reminder (one row per channel) so it isn't repeated. */
  recordReminder(args: {
    userId: string
    accountId: string
    channels: string[]
    message: string
    sentAt: Date
  }): Promise<void>
  notify(userId: string, event: NotificationEvent): Promise<NotifyResult>
  now?: () => Date
}

export interface StatementReminderSummary {
  accountsChecked: number
  remindersSent: number
  errors: string[]
}

export async function checkMissingStatements(deps: StatementReminderDeps): Promise<StatementReminderSummary> {
  const now = (deps.now ?? (() => new Date()))()
  const summary: StatementReminderSummary = { accountsChecked: 0, remindersSent: 0, errors: [] }

  for (const account of await deps.listAccounts()) {
    summary.accountsChecked++
    try {
      const thresholdDays = account.thresholdDays ?? DEFAULT_STATEMENT_REMINDER_DAYS
      const decision = statementReminderDue({
        lastImportAt: account.lastImportAt,
        lastReminderAt: await deps.lastReminderAt(account.userId, account.accountId),
        now,
        thresholdDays,
      })
      if (!decision.due || decision.daysSinceImport === null) continue

      const event: NotificationEvent = {
        type: 'statement_missing',
        accountName: account.accountName,
        daysSinceImport: decision.daysSinceImport,
      }
      const result = await deps.notify(account.userId, event)

      for (const { channel, error } of result.errors) {
        summary.errors.push(`${channel} statement reminder failed for account ${account.accountId}: ${error}`)
      }
      // Only a delivered reminder counts; otherwise (quiet hours, no channel) try again tomorrow
      if (result.sent.length > 0) {
        summary.remindersSent++
        await deps.recordReminder({
          userId: account.userId,
          accountId: account.accountId,
          channels: result.sent,
          message: `No statement imported for ${account.accountName} in ${decision.daysSinceImport} days.`,
          sentAt: now,
        })
      }
    } catch (error) {
      summary.errors.push(
        `Error checking statements for account ${account.accountId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  return summary
}

// ─── Drizzle implementation ──────────────────────────────────────────────────

export const drizzleStatementReminderDeps: Omit<StatementReminderDeps, 'notify'> = {
  async listAccounts() {
    const rows = await db
      .select({
        userId: accounts.userId,
        accountId: accounts.id,
        accountName: accounts.name,
        lastImportAt: max(transactions.createdAt),
        thresholdDays: notificationPreferences.statementReminderDays,
      })
      .from(accounts)
      .innerJoin(
        transactions,
        and(eq(transactions.accountId, accounts.id), isNotNull(transactions.duplicateCheckHash))
      )
      .leftJoin(notificationPreferences, eq(notificationPreferences.userId, accounts.userId))
      .where(eq(accounts.isActive, true))
      .groupBy(accounts.id, accounts.userId, accounts.name, notificationPreferences.statementReminderDays)

    return rows.map(r => ({ ...r, lastImportAt: r.lastImportAt ? new Date(r.lastImportAt) : null }))
  },

  async lastReminderAt(userId, accountId) {
    const [row] = await db
      .select({ sentAt: max(notifications.sentAt) })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.notificationType, NOTIFICATION_TYPE),
          eq(notifications.relatedEntityType, 'account'),
          eq(notifications.relatedEntityId, accountId),
          eq(notifications.status, 'sent')
        )
      )
    return row?.sentAt ? new Date(row.sentAt) : null
  },

  async recordReminder({ userId, accountId, channels, message, sentAt }) {
    await db.insert(notifications).values(
      channels.map(channel => ({
        userId,
        notificationType: NOTIFICATION_TYPE,
        title: 'Statement missing',
        message,
        channel,
        status: 'sent',
        sentAt,
        relatedEntityType: 'account',
        relatedEntityId: accountId,
      }))
    )
  },
}
