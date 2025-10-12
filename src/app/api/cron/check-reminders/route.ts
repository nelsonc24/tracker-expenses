import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { bills, debts, notificationPreferences } from '@/db/schema'
import { and, eq, gte, lte, isNotNull } from 'drizzle-orm'
import { sendBillReminderEmail, sendDebtReminderEmail, wasNotificationSentRecently } from '@/lib/notifications/email-service'
import { format } from 'date-fns'

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

    // Get all active bills with upcoming due dates
    const upcomingBills = await db
      .select()
      .from(bills)
      .where(
        and(
          eq(bills.isActive, true),
          isNotNull(bills.dueDate),
          gte(bills.dueDate, today),
          lte(bills.dueDate, maxDaysAhead)
        )
      )

    console.log(`Found ${upcomingBills.length} upcoming bills`)

    // Process each bill
    for (const bill of upcomingBills) {
      results.billsProcessed++

      try {
        if (!bill.dueDate) continue

        // Calculate days until due
        const dueDate = new Date(bill.dueDate)
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
            const result = await sendBillReminderEmail({
              userId: bill.userId,
              billId: bill.id,
              billName: bill.name,
              amount: `$${parseFloat(bill.amount).toFixed(2)}`,
              dueDate: format(dueDate, 'MMM dd, yyyy'),
              daysUntilDue,
              isAutoPay: bill.isAutoPay,
            })

            if (result.success) {
              results.billsNotified++
              console.log(`Sent bill reminder for ${bill.name} to user ${bill.userId}`)
            } else {
              results.errors.push(`Failed to send bill reminder for ${bill.name}: ${result.error}`)
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

    // Get all active debts with upcoming due dates
    const upcomingDebts = await db
      .select()
      .from(debts)
      .where(
        and(
          eq(debts.status, 'active'),
          isNotNull(debts.nextDueDate),
          gte(debts.nextDueDate, today),
          lte(debts.nextDueDate, maxDaysAhead)
        )
      )

    console.log(`Found ${upcomingDebts.length} upcoming debts`)

    // Process each debt
    for (const debt of upcomingDebts) {
      results.debtsProcessed++

      try {
        if (!debt.nextDueDate) continue

        // Calculate days until due
        const dueDate = new Date(debt.nextDueDate)
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
            const result = await sendDebtReminderEmail({
              userId: debt.userId,
              debtId: debt.id,
              debtName: debt.name,
              creditorName: debt.creditorName,
              minimumPayment: `$${parseFloat(debt.minimumPayment).toFixed(2)}`,
              currentBalance: `$${parseFloat(debt.currentBalance).toFixed(2)}`,
              dueDate: format(dueDate, 'MMM dd, yyyy'),
              daysUntilDue,
            })

            if (result.success) {
              results.debtsNotified++
              console.log(`Sent debt reminder for ${debt.name} to user ${debt.userId}`)
            } else {
              results.errors.push(`Failed to send debt reminder for ${debt.name}: ${result.error}`)
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
