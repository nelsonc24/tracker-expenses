import { db } from '@/db'
import { notifications, notificationPreferences, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { resend, EMAIL_FROM } from './resend-client'
import { BillReminderEmail } from '@/emails/bill-reminder'
import { DebtReminderEmail } from '@/emails/debt-reminder'
import { render } from '@react-email/components'

interface BillReminderData {
  userId: string
  billId: string
  billName: string
  amount: string
  dueDate: string
  daysUntilDue: number
  isAutoPay: boolean
}

interface DebtReminderData {
  userId: string
  debtId: string
  debtName: string
  creditorName: string
  minimumPayment: string
  currentBalance: string
  dueDate: string
  daysUntilDue: number
}

/**
 * Send a bill reminder email notification
 */
export async function sendBillReminderEmail(data: BillReminderData): Promise<{
  success: boolean
  notificationId?: string
  error?: string
}> {
  try {
    // Get user preferences
    const [userPrefs] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, data.userId))
      .limit(1)

    // Check if bill reminders are enabled
    if (userPrefs && !userPrefs.billRemindersEnabled) {
      console.log(`Bill reminders disabled for user ${data.userId}`)
      return { success: false, error: 'Bill reminders disabled' }
    }

    // Get user email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, data.userId))
      .limit(1)

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    const recipientEmail = userPrefs?.preferredEmail || user.email
    const userName = user.firstName || 'there'

    // Create notification record
    const [notification] = await db
      .insert(notifications)
      .values({
        userId: data.userId,
        notificationType: 'bill_reminder',
        title: `Bill Reminder: ${data.billName}`,
        message: `Your bill "${data.billName}" is due ${data.daysUntilDue === 0 ? 'today' : data.daysUntilDue === 1 ? 'tomorrow' : `in ${data.daysUntilDue} days`}`,
        channel: 'email',
        status: 'pending',
        relatedEntityType: 'bill',
        relatedEntityId: data.billId,
        emailTo: recipientEmail,
        emailSubject: data.isAutoPay 
          ? `Auto-Pay Reminder: ${data.billName} - ${data.amount}`
          : `Bill Reminder: ${data.billName} - ${data.amount} due soon`,
        metadata: {
          billName: data.billName,
          amount: parseFloat(data.amount),
          dueDate: data.dueDate,
          daysUntilDue: data.daysUntilDue,
        },
      })
      .returning()

    // Render email template
    const emailHtml = await render(
      BillReminderEmail({
        billName: data.billName,
        amount: data.amount,
        dueDate: data.dueDate,
        daysUntilDue: data.daysUntilDue,
        isAutoPay: data.isAutoPay,
        userName,
      })
    )

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: EMAIL_FROM,
      to: recipientEmail,
      subject: notification.emailSubject!,
      html: emailHtml,
    })

    if (emailError) {
      // Update notification with error
      await db
        .update(notifications)
        .set({
          status: 'failed',
          errorCount: 1,
          lastErrorMessage: emailError.message,
          lastErrorAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(notifications.id, notification.id))

      return { success: false, error: emailError.message }
    }

    // Update notification as sent
    await db
      .update(notifications)
      .set({
        status: 'sent',
        sentAt: new Date(),
        emailMessageId: emailData?.id,
        metadata: {
          ...notification.metadata,
          resendResponse: emailData as unknown as Record<string, unknown>,
        },
        updatedAt: new Date(),
      })
      .where(eq(notifications.id, notification.id))

    console.log(`Bill reminder sent to ${recipientEmail} for bill ${data.billName}`)
    return { success: true, notificationId: notification.id }
  } catch (error) {
    console.error('Error sending bill reminder:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Send a debt reminder email notification
 */
export async function sendDebtReminderEmail(data: DebtReminderData): Promise<{
  success: boolean
  notificationId?: string
  error?: string
}> {
  try {
    // Get user preferences
    const [userPrefs] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, data.userId))
      .limit(1)

    // Check if debt reminders are enabled
    if (userPrefs && !userPrefs.debtRemindersEnabled) {
      console.log(`Debt reminders disabled for user ${data.userId}`)
      return { success: false, error: 'Debt reminders disabled' }
    }

    // Get user email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, data.userId))
      .limit(1)

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    const recipientEmail = userPrefs?.preferredEmail || user.email
    const userName = user.firstName || 'there'

    // Create notification record
    const [notification] = await db
      .insert(notifications)
      .values({
        userId: data.userId,
        notificationType: 'debt_due',
        title: `Debt Payment Reminder: ${data.debtName}`,
        message: `Your debt payment for "${data.debtName}" is due ${data.daysUntilDue === 0 ? 'today' : data.daysUntilDue === 1 ? 'tomorrow' : `in ${data.daysUntilDue} days`}`,
        channel: 'email',
        status: 'pending',
        relatedEntityType: 'debt',
        relatedEntityId: data.debtId,
        emailTo: recipientEmail,
        emailSubject: `Debt Payment Reminder: ${data.debtName} - ${data.minimumPayment} due soon`,
        metadata: {
          debtName: data.debtName,
          amount: parseFloat(data.minimumPayment),
          dueDate: data.dueDate,
          daysUntilDue: data.daysUntilDue,
        },
      })
      .returning()

    // Render email template
    const emailHtml = await render(
      DebtReminderEmail({
        debtName: data.debtName,
        creditorName: data.creditorName,
        minimumPayment: data.minimumPayment,
        currentBalance: data.currentBalance,
        dueDate: data.dueDate,
        daysUntilDue: data.daysUntilDue,
        userName,
      })
    )

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: EMAIL_FROM,
      to: recipientEmail,
      subject: notification.emailSubject!,
      html: emailHtml,
    })

    if (emailError) {
      // Update notification with error
      await db
        .update(notifications)
        .set({
          status: 'failed',
          errorCount: 1,
          lastErrorMessage: emailError.message,
          lastErrorAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(notifications.id, notification.id))

      return { success: false, error: emailError.message }
    }

    // Update notification as sent
    await db
      .update(notifications)
      .set({
        status: 'sent',
        sentAt: new Date(),
        emailMessageId: emailData?.id,
        metadata: {
          ...notification.metadata,
          resendResponse: emailData as unknown as Record<string, unknown>,
        },
        updatedAt: new Date(),
      })
      .where(eq(notifications.id, notification.id))

    console.log(`Debt reminder sent to ${recipientEmail} for debt ${data.debtName}`)
    return { success: true, notificationId: notification.id }
  } catch (error) {
    console.error('Error sending debt reminder:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Check if a notification was already sent for a specific entity within a timeframe
 */
export async function wasNotificationSentRecently(
  userId: string,
  entityType: string,
  entityId: string,
  hoursAgo: number = 24
): Promise<boolean> {
  const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000)
  
  const recentNotifications = await db
    .select()
    .from(notifications)
    .where(
      eq(notifications.userId, userId)
    )
    .limit(100)

  const found = recentNotifications.some(
    n => 
      n.relatedEntityType === entityType &&
      n.relatedEntityId === entityId &&
      n.status === 'sent' &&
      n.sentAt &&
      n.sentAt > cutoffTime
  )

  return found
}
