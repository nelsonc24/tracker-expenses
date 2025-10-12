import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { notificationPreferences } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const updatePreferencesSchema = z.object({
  emailNotificationsEnabled: z.boolean().optional(),
  pushNotificationsEnabled: z.boolean().optional(),
  billRemindersEnabled: z.boolean().optional(),
  billReminderDaysBefore: z.number().min(0).max(14).optional(),
  billReminderChannel: z.enum(['email', 'push', 'both']).optional(),
  debtRemindersEnabled: z.boolean().optional(),
  debtReminderDaysBefore: z.number().min(0).max(14).optional(),
  debtReminderChannel: z.enum(['email', 'push', 'both']).optional(),
  budgetAlertsEnabled: z.boolean().optional(),
  budgetAlertThreshold: z.number().min(0).max(100).optional(),
  budgetAlertChannel: z.enum(['email', 'push', 'both']).optional(),
  digestFrequency: z.enum(['immediate', 'daily', 'weekly', 'never']).optional(),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
  preferredEmail: z.string().email().optional(),
})

// GET /api/notifications/preferences - Get user notification preferences
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Try to get existing preferences
    let [prefs] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1)

    // If no preferences exist, create default ones
    if (!prefs) {
      [prefs] = await db
        .insert(notificationPreferences)
        .values({
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
        })
        .returning()
    }

    return NextResponse.json(prefs)
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    )
  }
}

// POST /api/notifications/preferences - Update user notification preferences
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updatePreferencesSchema.parse(body)

    // Check if preferences exist
    const [existing] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1)

    let updatedPrefs

    if (existing) {
      // Update existing preferences
      ;[updatedPrefs] = await db
        .update(notificationPreferences)
        .set({
          ...validatedData,
          updatedAt: new Date(),
        })
        .where(eq(notificationPreferences.userId, userId))
        .returning()
    } else {
      // Create new preferences with provided values
      ;[updatedPrefs] = await db
        .insert(notificationPreferences)
        .values({
          userId,
          ...validatedData,
        })
        .returning()
    }

    return NextResponse.json(updatedPrefs)
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    )
  }
}
