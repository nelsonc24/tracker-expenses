import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { goals, goalContributions } from '@/db/schema'
import { eq, sql, desc } from 'drizzle-orm'

// GET /api/goals/stats — aggregate stats for the dashboard
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Aggregate goals counts
  const [statsRow] = await db
    .select({
      totalSaved: sql<string>`coalesce(sum(current_amount), 0)`,
      activeCount: sql<number>`count(*) filter (where status = 'active')`,
      completedCount: sql<number>`count(*) filter (where status = 'completed')`,
      pausedCount: sql<number>`count(*) filter (where status = 'paused')`,
    })
    .from(goals)
    .where(eq(goals.userId, userId))

  // Contribution streak calculation:
  // Group contributions by year-month and count distinct months with at least one contribution
  const monthRows = await db
    .select({
      month: sql<string>`to_char(contributed_at, 'YYYY-MM')`,
    })
    .from(goalContributions)
    .where(eq(goalContributions.userId, userId))
    .groupBy(sql`to_char(contributed_at, 'YYYY-MM')`)
    .orderBy(desc(sql`to_char(contributed_at, 'YYYY-MM')`))

  // Calculate consecutive month streak from today backwards
  let streak = 0
  const today = new Date()
  let checkYear = today.getFullYear()
  let checkMonth = today.getMonth() + 1 // 1-based

  for (const row of monthRows) {
    const expected = `${checkYear}-${String(checkMonth).padStart(2, '0')}`
    if (row.month === expected) {
      streak++
      checkMonth--
      if (checkMonth === 0) {
        checkMonth = 12
        checkYear--
      }
    } else {
      break
    }
  }

  return NextResponse.json({
    totalSaved: parseFloat(statsRow.totalSaved ?? '0'),
    activeGoals: Number(statsRow.activeCount ?? 0),
    completedGoals: Number(statsRow.completedCount ?? 0),
    pausedGoals: Number(statsRow.pausedCount ?? 0),
    contributionStreakMonths: streak,
  })
}
