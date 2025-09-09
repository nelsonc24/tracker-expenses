import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { activities, insertActivitySchema } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

interface Params {
  id: string
}

// GET /api/activities/[id] - Get a specific activity
export async function GET(
  request: NextRequest,
  context: { params: Promise<Params> }
) {
  try {
    const { userId } = await auth()
    const { id } = await context.params
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const activity = await db
      .select()
      .from(activities)
      .where(and(
        eq(activities.id, id),
        eq(activities.userId, userId)
      ))
      .limit(1)

    if (activity.length === 0) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    return NextResponse.json(activity[0])
  } catch (error) {
    console.error('Error fetching activity:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity' },
      { status: 500 }
    )
  }
}

// PUT /api/activities/[id] - Update an activity
export async function PUT(
  request: NextRequest,
  context: { params: Promise<Params> }
) {
  try {
    const { userId } = await auth()
    const { id } = await context.params
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate the request body (excluding userId and id)
    const updateSchema = insertActivitySchema.omit({ userId: true, id: true, createdAt: true })
    const validatedData = updateSchema.parse(body)

    // Check if the activity exists and belongs to the user
    const existingActivity = await db
      .select()
      .from(activities)
      .where(and(
        eq(activities.id, id),
        eq(activities.userId, userId)
      ))
      .limit(1)

    if (existingActivity.length === 0) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    // Check if the new name conflicts with another activity (if name is being changed)
    if (validatedData.name && validatedData.name !== existingActivity[0].name) {
      const nameConflict = await db
        .select()
        .from(activities)
        .where(and(
          eq(activities.userId, userId),
          eq(activities.name, validatedData.name)
        ))
        .limit(1)

      if (nameConflict.length > 0) {
        return NextResponse.json(
          { error: 'Activity with this name already exists' },
          { status: 400 }
        )
      }
    }

    const updatedActivity = await db
      .update(activities)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(and(
        eq(activities.id, id),
        eq(activities.userId, userId)
      ))
      .returning()

    return NextResponse.json(updatedActivity[0])
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('Error updating activity:', error)
    return NextResponse.json(
      { error: 'Failed to update activity' },
      { status: 500 }
    )
  }
}

// DELETE /api/activities/[id] - Delete an activity
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<Params> }
) {
  try {
    const { userId } = await auth()
    const { id } = await context.params
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if the activity exists and belongs to the user
    const existingActivity = await db
      .select()
      .from(activities)
      .where(and(
        eq(activities.id, id),
        eq(activities.userId, userId)
      ))
      .limit(1)

    if (existingActivity.length === 0) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    // Delete the activity (this will cascade delete related records due to foreign key constraints)
    await db
      .delete(activities)
      .where(and(
        eq(activities.id, id),
        eq(activities.userId, userId)
      ))

    return NextResponse.json({ message: 'Activity deleted successfully' })
  } catch (error) {
    console.error('Error deleting activity:', error)
    return NextResponse.json(
      { error: 'Failed to delete activity' },
      { status: 500 }
    )
  }
}
