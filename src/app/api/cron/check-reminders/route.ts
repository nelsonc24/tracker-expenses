import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { bills, debts, notificationPreferences } from '@/db/schema'
import { and, eq, isNotNull } from 'drizzle-orm'
import { sendBillReminderEmail, sendDebtReminderEmail, wasNotificationSentRecently } from '@/lib/notifications/email-service'
import { sendTelegramBillReminder, sendTelegramDebtReminder } from '@/lib/notifications/telegram-service'
import { format, startOfDay, addWeeks, addMonths, addQuarters, addYears, setDate, isAfter } from 'date-fns'

type Bill = typeof bills.$inferSelect

function getNextBillDueDate(bill: Bill, today: Date): Date | null {
  if (bill.frequency === 'monthly' && bill.dueDay) {
    let next = startOfDay(setDate(today, bill.dueDay))
    if (!isAfter(next, today) && next.getTime() !== today.getTime()) {
      next = addMonths(next, 1)
    }
    return next
  }

  if (!bill.dueDate) return null

  let next = startOfDay(new Date(bill.dueDate))
  if (next >= today) return next

  // Advance past-due recurring bills to the next occurrence
  const advanceFn: Record<string, (d: Date) => Date> = {
    weekly:    d => addWeeks(d, 1),
    biweekly:  d => addWeeks(d, 2),
    quarterly: d => addQuarters(d, 1),
    yearly:    d => addYears(d, 1),
  }
  const advance = advanceFn[bill.frequency]
  if (!advance) return null
  while (next < today) next = advance(next)
  return next
}

/**
 * Cron job to check for upcoming bills and debts and send reminder notifications
 * This endpoint should be called daily via Vercel Cron Jobs
 *
 * Security: Protected by CRON_SECRET environment variable
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results = {
      billsProcessed: 0,
      billsNotified: 0,
      debtsProcessed: 0,
      debtsNotified: 0,
      errors: [] as string[],
    }

    // Calculate date range for checking (today + next 7 days)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const maxDaysAhead = new Date(today)
    maxDaysAhead.setDate(maxDaysAhead.getDate() + 7)

    console.log(`Checking for bills and debts due between ${format(today, 'yyyy-MM-dd')} and ${format(maxDaysAhead, 'yyyy-MM-dd')}`)

    // Get all active bills — date filtering done in-process to handle recurring bills
    // whose stored dueDate may be stale (never auto-advanced after the last cycle)
    const activeBills = await db
      .select()
      .from(bills)
      .where(eq(bills.isActive, true))

    const upcomingBills = activeBills.filter(bill => {
      const next = getNextBillDueDate(bill, today)
      return next !== null && next >= today && next <= maxDaysAhead
    })

    console.log(`Found ${activeBills.length} active bills, ${upcomingBills.length} due within window`)

    // Process each bill
    for (const bill of upcomingBills) {
      results.billsProcessed++

      try {
        // Calculate days until due using the computed next occurrence
        const dueDate = getNextBillDueDate(bill, today)!
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        // Get user preferences
        const [prefs] = await db
          .select()
          .from(notificationPreferences)
          .where(eq(notificationPreferences.userId, bill.userId))
          .limit(1)

        const reminderDaysBefore = prefs?.billReminderDaysBefore ?? bill.reminderDays ?? 3

        // Check if we should send a reminder
        if (daysUntilDue <= reminderDaysBefore) {
          // Check if we already sent a notification recently
          const alreadySent = await wasNotificationSentRecently(
            bill.userId,
            'bill',
            bill.id,
            24 // Don't send more than once per day
          )

          if (!alreadySent) {
            const billPayload = {
              userId: bill.userId,
              billId: bill.id,
              billName: bill.name,
              amount: `$${parseFloat(bill.amount).toFixed(2)}`,
              dueDate: format(dueDate, 'MMM dd, yyyy'),
              daysUntilDue,
              isAutoPay: bill.isAutoPay,
            }

            const result = await sendBillReminderEmail(billPayload)

            if (result.success) {
              results.billsNotified++
              console.log(`Sent bill reminder for ${bill.name} to user ${bill.userId}`)
            } else {
              results.errors.push(`Failed to send bill reminder for ${bill.name}: ${result.error}`)
            }

            // Also send via Telegram if enabled
            const tgResult = await sendTelegramBillReminder(billPayload)
            if (!tgResult.success && tgResult.error !== 'Telegram notifications not configured or disabled') {
              results.errors.push(`Telegram bill reminder failed for ${bill.name}: ${tgResult.error}`)
            }
          } else {
            console.log(`Skipping bill ${bill.name} - notification already sent recently`)
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        results.errors.push(`Error processing bill ${bill.id}: ${errorMsg}`)
        console.error(`Error processing bill ${bill.id}:`, error)
      }
    }

    // Get all active debts — same approach as bills: filter in-process to handle stale nextDueDate
    const activeDebts = await db
      .select()
      .from(debts)
      .where(and(eq(debts.status, 'active'), isNotNull(debts.nextDueDate)))

    const upcomingDebts = activeDebts.filter(debt => {
      if (!debt.nextDueDate) return false
      const stored = startOfDay(new Date(debt.nextDueDate))
      if (stored >= today && stored <= maxDaysAhead) return true
      // Advance monthly debts with a stale nextDueDate
      if (debt.paymentFrequency === 'monthly' && debt.paymentDueDay) {
        let next = startOfDay(setDate(today, debt.paymentDueDay))
        if (next < today) next = addMonths(next, 1)
        return next >= today && next <= maxDaysAhead
      }
      return false
    })

    console.log(`Found ${activeDebts.length} active debts, ${upcomingDebts.length} due within window`)

    // Process each debt
    for (const debt of upcomingDebts) {
      results.debtsProcessed++

      try {
        if (!debt.nextDueDate) continue

        // Use computed next due date for monthly debts with stale stored date
        let dueDate = startOfDay(new Date(debt.nextDueDate))
        if (dueDate < today && debt.paymentFrequency === 'monthly' && debt.paymentDueDay) {
          dueDate = startOfDay(setDate(today, debt.paymentDueDay))
          if (dueDate < today) dueDate = addMonths(dueDate, 1)
        }
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        // Get user preferences
        const [prefs] = await db
          .select()
          .from(notificationPreferences)
          .where(eq(notificationPreferences.userId, debt.userId))
          .limit(1)

        const reminderDaysBefore = prefs?.debtReminderDaysBefore ?? 3

        // Check if we should send a reminder
        if (daysUntilDue <= reminderDaysBefore) {
          // Check if we already sent a notification recently
          const alreadySent = await wasNotificationSentRecently(
            debt.userId,
            'debt',
            debt.id,
            24 // Don't send more than once per day
          )

          if (!alreadySent) {
            const debtPayload = {
              userId: debt.userId,
              debtId: debt.id,
              debtName: debt.name,
              creditorName: debt.creditorName,
              minimumPayment: `$${parseFloat(debt.minimumPayment).toFixed(2)}`,
              currentBalance: `$${parseFloat(debt.currentBalance).toFixed(2)}`,
              dueDate: format(dueDate, 'MMM dd, yyyy'),
              daysUntilDue,
            }

            const result = await sendDebtReminderEmail(debtPayload)

            if (result.success) {
              results.debtsNotified++
              console.log(`Sent debt reminder for ${debt.name} to user ${debt.userId}`)
            } else {
              results.errors.push(`Failed to send debt reminder for ${debt.name}: ${result.error}`)
            }

            // Also send via Telegram if enabled
            const tgResult = await sendTelegramDebtReminder(debtPayload)
            if (!tgResult.success && tgResult.error !== 'Telegram notifications not configured or disabled') {
              results.errors.push(`Telegram debt reminder failed for ${debt.name}: ${tgResult.error}`)
            }
          } else {
            console.log(`Skipping debt ${debt.name} - notification already sent recently`)
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        results.errors.push(`Error processing debt ${debt.id}: ${errorMsg}`)
        console.error(`Error processing debt ${debt.id}:`, error)
      }
    }

    console.log('Cron job completed:', results)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results,
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
