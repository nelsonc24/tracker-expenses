import { sendBillReminderEmail, sendDebtReminderEmail } from './email-service'
import {
  sendTelegramBillReminder,
  sendTelegramDebtReminder,
  sendTelegramText,
  telegramImportAlertText,
} from './telegram-service'
import { isE164 } from './phone'
import { isWhatsAppAllowedUser } from './whatsapp-access'
import { sendWhatsAppEvent } from './whatsapp-notifications'
import type { ChannelSendResult, NotificationChannel, NotificationEvent } from './notifier'

type ServiceResult = { success: boolean; notificationId?: string; error?: string }

const toResult = (r: ServiceResult): ChannelSendResult =>
  r.success ? { status: 'sent', notificationId: r.notificationId } : { status: 'failed', error: r.error ?? 'Unknown error' }

// The existing services take the user id inside the payload
function billPayload(userId: string, e: Extract<NotificationEvent, { type: 'bill_due' }>) {
  return {
    userId,
    billId: e.billId,
    billName: e.billName,
    amount: e.amount,
    dueDate: e.dueDate,
    daysUntilDue: e.daysUntilDue,
    isAutoPay: e.isAutoPay,
  }
}

function debtPayload(userId: string, e: Extract<NotificationEvent, { type: 'debt_due' }>) {
  return {
    userId,
    debtId: e.debtId,
    debtName: e.debtName,
    creditorName: e.creditorName,
    minimumPayment: e.minimumPayment,
    currentBalance: e.currentBalance,
    dueDate: e.dueDate,
    daysUntilDue: e.daysUntilDue,
  }
}

/**
 * Email adapter. Only bill and debt reminders have email templates today; other event types
 * report 'unsupported' until templates exist (see plan 3.2 / 3.3).
 */
export const emailChannel: NotificationChannel = {
  id: 'email',
  isEnabled: prefs => prefs.emailNotificationsEnabled,
  async send(prefs, event) {
    switch (event.type) {
      case 'bill_due':
        return toResult(await sendBillReminderEmail(billPayload(prefs.userId, event)))
      case 'debt_due':
        return toResult(await sendDebtReminderEmail(debtPayload(prefs.userId, event)))
      default:
        return { status: 'unsupported' }
    }
  },
}

export const telegramChannel: NotificationChannel = {
  id: 'telegram',
  isEnabled: prefs => prefs.telegramNotificationsEnabled && Boolean(prefs.telegramChatId),
  async send(prefs, event) {
    switch (event.type) {
      case 'bill_due':
        return toResult(await sendTelegramBillReminder(billPayload(prefs.userId, event)))
      case 'debt_due':
        return toResult(await sendTelegramDebtReminder(debtPayload(prefs.userId, event)))
      case 'import_summary':
      case 'statement_missing':
      case 'import_failed':
        return toResult(await sendTelegramText(prefs.telegramChatId!, telegramImportAlertText(event)))
      default:
        return { status: 'unsupported' }
    }
  },
}

/**
 * WhatsApp adapter (Meta Cloud API). Every event type has an approved template, see
 * eventToWhatsAppTemplate(). Runs in dry-run mode while WHATSAPP_TOKEN is unset.
 */
export const whatsappChannel: NotificationChannel = {
  id: 'whatsapp',
  isEnabled: prefs =>
    prefs.whatsappNotificationsEnabled && isE164(prefs.whatsappPhoneNumber) && isWhatsAppAllowedUser(prefs.userId),
  async send(prefs, event) {
    return toResult(await sendWhatsAppEvent(prefs.userId, prefs.whatsappPhoneNumber!, event))
  },
}
