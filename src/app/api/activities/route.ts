import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { activities, insertActivitySchema } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { z } from 'zod'

// GET /api/activities - Get all activities for the authenticated user
export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userActivities = await db
      .select()
      .from(activities)
      .where(eq(activities.userId, userId))
      .orderBy(desc(activities.createdAt))

    return NextResponse.json(userActivities)
  } catch (error) {
    console.error('Error fetching activities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    )
  }
}

// POST /api/activities - Create a new activity
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate the request body
    const validatedData = insertActivitySchema.parse({
      ...body,
      userId,
    })

    // Check if activity name already exists for this user
    const existingActivity = await db
      .select()
      .from(activities)
      .where(and(
        eq(activities.userId, userId),
        eq(activities.name, validatedData.name)
      ))
      .limit(1)

    if (existingActivity.length > 0) {
      return NextResponse.json(
        { error: 'Activity with this name already exists' },
        { status: 400 }
      )
    }

    const newActivity = await db
      .insert(activities)
      .values(validatedData)
      .returning()

    return NextResponse.json(newActivity[0], { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('Error creating activity:', error)
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 }
    )
  }
}
