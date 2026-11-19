import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { notificationPreferences, users } from '@/db/schema'
import { emailChannel, telegramChannel } from './channels'
import type { NotificationPrefs, NotifyDeps } from './notifier'

const DEFAULT_TIME_ZONE = 'Australia/Sydney'

/** Preferences for a user who has never saved any (column defaults). */
function defaultPrefs(userId: string): NotificationPrefs {
  const now = new Date()
  return {
    id: '',
    userId,
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
    telegramNotificationsEnabled: false,
    telegramChatId: null,
    whatsappNotificationsEnabled: false,
    whatsappPhoneNumber: null,
    createdAt: now,
    updatedAt: now,
  }
}

export const defaultDeps: NotifyDeps = {
  // Add further channels here (e.g. WhatsApp) — notify() treats them all the same
  channels: [emailChannel, telegramChannel],

  async loadContext(userId) {
    const [prefs] = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).limit(1)
    const [user] = await db.select({ preferences: users.preferences }).from(users).where(eq(users.id, userId)).limit(1)
    return {
      prefs: prefs ?? defaultPrefs(userId),
      timeZone: user?.preferences?.timezone || DEFAULT_TIME_ZONE,
    }
  },
}
