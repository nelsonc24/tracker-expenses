/**
 * Telegram Bot Notification Service
 *
 * Sends payment/bill/subscription alerts via Telegram Bot API.
 *
 * Prerequisites:
 *  1. A Telegram Bot created via @BotFather – get the bot token.
 *  2. The recipient's Telegram Chat ID stored per user in `telegram_chat_id`
 *     in notification_preferences. Users can get their Chat ID by messaging
 *     your bot and calling /getUpdates, or by forwarding a message to
 *     @userinfobot.
 *
 * Environment variables required:
 *   TELEGRAM_BOT_TOKEN   – Bot token from @BotFather (e.g. 1234567890:AAB...)
 */

import { db } from '@/db'
import { notifications, notificationPreferences, users } from '@/db/schema'
import { eq } from 'drizzle-orm'

// ─── Types ──────────────────────────────────────────────────────────────────

interface TelegramSendResult {
  success: boolean
  notificationId?: string
  messageId?: number
  error?: string
}

export interface BillReminderData {
  userId: string
  billId: string
  billName: string
  amount: string
  dueDate: string
  daysUntilDue: number
  isAutoPay: boolean
}

export interface DebtReminderData {
  userId: string
  debtId: string
  debtName: string
  creditorName: string
  minimumPayment: string
  currentBalance: string
  dueDate: string
  daysUntilDue: number
}

// ─── Core send helper ────────────────────────────────────────────────────────

/**
 * Send a text message to a Telegram user via the Bot API.
 */
async function sendTelegramMessage(
  chatId: string,
  text: string,
): Promise<{ messageId?: number; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN

  if (!botToken) {
    return { error: 'TELEGRAM_BOT_TOKEN is not configured' }
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  })

  const json = (await response.json()) as {
    ok: boolean
    result?: { message_id: number }
    description?: string
  }

  if (!response.ok || !json.ok) {
    const errorMessage = json.description ?? `HTTP ${response.status}`
    console.error('Telegram send error:', errorMessage)
    return { error: errorMessage }
  }

  return { messageId: json.result?.message_id }
}

// ─── Preference helpers ──────────────────────────────────────────────────────

/**
 * Retrieve Telegram-related preferences for a user.
 * Returns null if not found or Telegram notifications are disabled.
 */
async function getTelegramPrefs(userId: string): Promise<{
  chatId: string
  userName: string
} | null> {
  const [prefs] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1)

  if (
    !prefs ||
    !prefs.telegramNotificationsEnabled ||
    !prefs.telegramChatId
  ) {
    return null
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  return {
    chatId: prefs.telegramChatId,
    userName: user?.firstName ?? 'there',
  }
}

// ─── Notification senders ────────────────────────────────────────────────────

/**
 * Send a Telegram bill/subscription reminder.
 */
export async function sendTelegramBillReminder(
  data: BillReminderData,
): Promise<TelegramSendResult> {
  try {
    const tgPrefs = await getTelegramPrefs(data.userId)
    if (!tgPrefs) {
      return { success: false, error: 'Telegram notifications not configured or disabled' }
    }

    const urgencyText =
      data.daysUntilDue === 0
        ? '<b>TODAY</b>'
        : data.daysUntilDue === 1
        ? 'tomorrow'
        : `in ${data.daysUntilDue} days`

    const messageText = data.isAutoPay
      ? `💳 <b>Auto-Pay Reminder</b>\n\nHi ${tgPrefs.userName}! Your bill "<b>${data.billName}</b>" (${data.amount}) will be auto-paid ${urgencyText} on ${data.dueDate}.\n\nMake sure you have sufficient funds. 💰`
      : `🔔 <b>Bill Reminder</b>\n\nHi ${tgPrefs.userName}! Your bill "<b>${data.billName}</b>" (${data.amount}) is due ${urgencyText} on ${data.dueDate}.\n\nDon't forget to pay on time! ✅`

    const [notification] = await db
      .insert(notifications)
      .values({
        userId: data.userId,
        notificationType: 'bill_reminder',
        title: `Bill Reminder: ${data.billName}`,
        message: messageText,
        channel: 'telegram',
        status: 'pending',
        relatedEntityType: 'bill',
        relatedEntityId: data.billId,
        metadata: {
          billName: data.billName,
          amount: parseFloat(data.amount),
          dueDate: data.dueDate,
          daysUntilDue: data.daysUntilDue,
          isAutoPay: data.isAutoPay,
          channel: 'telegram',
        },
      })
      .returning()

    const { messageId, error } = await sendTelegramMessage(tgPrefs.chatId, messageText)

    if (error) {
      await db
        .update(notifications)
        .set({
          status: 'failed',
          errorCount: 1,
          lastErrorMessage: error,
          lastErrorAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(notifications.id, notification.id))

      return { success: false, error }
    }

    await db
      .update(notifications)
      .set({
        status: 'sent',
        sentAt: new Date(),
        metadata: {
          ...(notification.metadata as Record<string, unknown>),
          telegramMessageId: messageId,
        },
        updatedAt: new Date(),
      })
      .where(eq(notifications.id, notification.id))

    console.log(`Telegram bill reminder sent to chat ${tgPrefs.chatId} for bill ${data.billName}`)
    return { success: true, notificationId: notification.id, messageId }
  } catch (error) {
    console.error('Error sending Telegram bill reminder:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send a Telegram debt payment reminder.
 */
export async function sendTelegramDebtReminder(
  data: DebtReminderData,
): Promise<TelegramSendResult> {
  try {
    const tgPrefs = await getTelegramPrefs(data.userId)
    if (!tgPrefs) {
      return { success: false, error: 'Telegram notifications not configured or disabled' }
    }

    const urgencyText =
      data.daysUntilDue === 0
        ? '<b>TODAY</b>'
        : data.daysUntilDue === 1
        ? 'tomorrow'
        : `in ${data.daysUntilDue} days`

    const messageText =
      `💰 <b>Debt Payment Reminder</b>\n\nHi ${tgPrefs.userName}! Your payment for "<b>${data.debtName}</b>" (${data.creditorName}) is due ${urgencyText} on ${data.dueDate}.\n\n` +
      `Minimum payment: <b>${data.minimumPayment}</b>\nRemaining balance: ${data.currentBalance}\n\nPay on time to avoid penalties! 📅`

    const [notification] = await db
      .insert(notifications)
      .values({
        userId: data.userId,
        notificationType: 'debt_reminder',
        title: `Debt Reminder: ${data.debtName}`,
        message: messageText,
        channel: 'telegram',
        status: 'pending',
        relatedEntityType: 'debt',
        relatedEntityId: data.debtId,
        metadata: {
          debtName: data.debtName,
          creditorName: data.creditorName,
          minimumPayment: parseFloat(data.minimumPayment),
          currentBalance: parseFloat(data.currentBalance),
          dueDate: data.dueDate,
          daysUntilDue: data.daysUntilDue,
          channel: 'telegram',
        },
      })
      .returning()

    const { messageId, error } = await sendTelegramMessage(tgPrefs.chatId, messageText)

    if (error) {
      await db
        .update(notifications)
        .set({
          status: 'failed',
          errorCount: 1,
          lastErrorMessage: error,
          lastErrorAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(notifications.id, notification.id))

      return { success: false, error }
    }

    await db
      .update(notifications)
      .set({
        status: 'sent',
        sentAt: new Date(),
        metadata: {
          ...(notification.metadata as Record<string, unknown>),
          telegramMessageId: messageId,
        },
        updatedAt: new Date(),
      })
      .where(eq(notifications.id, notification.id))

    console.log(`Telegram debt reminder sent to chat ${tgPrefs.chatId} for debt ${data.debtName}`)
    return { success: true, notificationId: notification.id, messageId }
  } catch (error) {
    console.error('Error sending Telegram debt reminder:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/** Alias – subscriptions use the same flow as bills */
export const sendTelegramSubscriptionReminder = sendTelegramBillReminder
