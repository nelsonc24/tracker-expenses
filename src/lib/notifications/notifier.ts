import type { notificationPreferences } from '@/db/schema'

export type NotificationPrefs = typeof notificationPreferences.$inferSelect
export type ChannelId = 'email' | 'telegram' | 'whatsapp'

// ─── Events ──────────────────────────────────────────────────────────────────
// Payloads are already formatted for display (amounts as "$12.00", dates as strings)
// and deliberately generic: no account numbers, balances or transaction details.

export interface BillDueEvent {
  type: 'bill_due'
  billId: string
  billName: string
  amount: string
  dueDate: string
  daysUntilDue: number
  isAutoPay: boolean
}

export interface DebtDueEvent {
  type: 'debt_due'
  debtId: string
  debtName: string
  creditorName: string
  minimumPayment: string
  currentBalance: string
  dueDate: string
  daysUntilDue: number
}

export interface BudgetAlertEvent {
  type: 'budget_alert'
  budgetName: string
  percentUsed: number
}

export interface ImportSummaryEvent {
  type: 'import_summary'
  accountName: string
  inserted: number
  needsReview: number
}

export interface StatementMissingEvent {
  type: 'statement_missing'
  accountName: string
  daysSinceImport: number
}

export type NotificationEvent =
  | BillDueEvent
  | DebtDueEvent
  | BudgetAlertEvent
  | ImportSummaryEvent
  | StatementMissingEvent

export type NotificationEventType = NotificationEvent['type']

// ─── Channels ────────────────────────────────────────────────────────────────

export type ChannelSendResult =
  | { status: 'sent'; notificationId?: string }
  | { status: 'unsupported' } // this channel has no template for the event type yet
  | { status: 'failed'; error: string }

export interface NotificationChannel {
  id: ChannelId
  /** Is this channel switched on and fully configured for the user? */
  isEnabled(prefs: NotificationPrefs): boolean
  send(prefs: NotificationPrefs, event: NotificationEvent): Promise<ChannelSendResult>
}

export interface NotifyResult {
  /** Channels that delivered the message. */
  sent: ChannelId[]
  /** Channels not used, with why: 'disabled', 'unsupported', 'type_disabled' or 'quiet_hours'. */
  skipped: Array<{ channel: ChannelId; reason: string }>
  errors: Array<{ channel: ChannelId; error: string }>
}

export interface NotifyDeps {
  channels: NotificationChannel[]
  /** Preferences (defaults applied when the user has no row) and the user's IANA time zone. */
  loadContext(userId: string): Promise<{ prefs: NotificationPrefs; timeZone: string }>
  now?: () => Date
}

// ─── Per-type enable flags ───────────────────────────────────────────────────

/** Types without an entry have no user-facing switch yet and are always allowed. */
const TYPE_ENABLED: Partial<Record<NotificationEventType, (p: NotificationPrefs) => boolean>> = {
  bill_due: p => p.billRemindersEnabled,
  debt_due: p => p.debtRemindersEnabled,
  budget_alert: p => p.budgetAlertsEnabled,
}

// ─── Quiet hours ─────────────────────────────────────────────────────────────

const HHMM = /^(\d{1,2}):(\d{2})$/

function toMinutes(value: string | null | undefined): number | null {
  const match = value ? HHMM.exec(value.trim()) : null
  if (!match) return null
  const minutes = Number(match[1]) * 60 + Number(match[2])
  return Number(match[1]) < 24 && Number(match[2]) < 60 ? minutes : null
}

/** Minutes since local midnight in the given time zone. */
function localMinutes(now: Date, timeZone: string): number {
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).formatToParts(now)
  } catch {
    parts = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' }).formatToParts(now)
  }
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? 0)
  return get('hour') * 60 + get('minute')
}

/**
 * True when `now` falls inside [start, end) in the user's time zone. Handles ranges that
 * cross midnight (22:00 → 08:00). Missing or invalid settings mean no quiet hours.
 */
export function isWithinQuietHours(now: Date, start: string | null, end: string | null, timeZone: string): boolean {
  const from = toMinutes(start)
  const to = toMinutes(end)
  if (from === null || to === null || from === to) return false

  const current = localMinutes(now, timeZone)
  return from < to ? current >= from && current < to : current >= from || current < to
}

// ─── notify() ────────────────────────────────────────────────────────────────

/**
 * Send an event to every channel the user has enabled.
 * Honours the per-type switch and quiet hours. Never throws because one channel failed:
 * failures are collected in the result.
 */
export async function notify(userId: string, event: NotificationEvent, deps?: NotifyDeps): Promise<NotifyResult> {
  const { channels, loadContext, now = () => new Date() } = deps ?? (await import('./default-deps')).defaultDeps

  const result: NotifyResult = { sent: [], skipped: [], errors: [] }

  let context: Awaited<ReturnType<NotifyDeps['loadContext']>>
  try {
    context = await loadContext(userId)
  } catch (error) {
    // Without preferences we can't tell what the user wants; report against every channel
    const message = error instanceof Error ? error.message : 'Failed to load notification preferences'
    for (const channel of channels) result.errors.push({ channel: channel.id, error: message })
    return result
  }

  const { prefs, timeZone } = context

  const typeAllowed = TYPE_ENABLED[event.type]?.(prefs) ?? true
  const quiet = isWithinQuietHours(now(), prefs.quietHoursStart, prefs.quietHoursEnd, timeZone)

  for (const channel of channels) {
    try {
      if (!channel.isEnabled(prefs)) {
        result.skipped.push({ channel: channel.id, reason: 'disabled' })
      } else if (!typeAllowed) {
        result.skipped.push({ channel: channel.id, reason: 'type_disabled' })
      } else if (quiet) {
        result.skipped.push({ channel: channel.id, reason: 'quiet_hours' })
      } else {
        const outcome = await channel.send(prefs, event)
        if (outcome.status === 'sent') result.sent.push(channel.id)
        else if (outcome.status === 'unsupported') result.skipped.push({ channel: channel.id, reason: 'unsupported' })
        else result.errors.push({ channel: channel.id, error: outcome.error })
      }
    } catch (error) {
      result.errors.push({ channel: channel.id, error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  return result
}
