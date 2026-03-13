import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { goals, goalContributions } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

// Get all goals for mobile
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userGoals = await db
      .select()
      .from(goals)
      .where(eq(goals.userId, userId))
      .orderBy(desc(goals.createdAt))

    const enriched = userGoals.map(g => {
      const current = parseFloat(g.currentAmount ?? '0')
      const target = parseFloat(g.targetAmount)
      const percentComplete = target > 0 ? Math.min(100, (current / target) * 100) : 0
      
      return {
        id: g.id,
        name: g.name,
        emoji: g.emoji,
        description: g.description,
        type: g.type,
        color: g.color,
        targetAmount: target,
        currentAmount: current,
        percentComplete: Math.round(percentComplete),
        currency: g.currency,
        status: g.status,
        targetDate: g.targetDate,
        saveFrequency: g.saveFrequency,
        saveAmount: g.saveAmount ? parseFloat(g.saveAmount) : null,
        createdAt: g.createdAt,
        completedAt: g.completedAt
      }
    })

    return NextResponse.json(enriched)
  } catch (error) {
    console.error('[Mobile Goals Error]:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch goals' 
    }, { status: 500 })
  }
}
