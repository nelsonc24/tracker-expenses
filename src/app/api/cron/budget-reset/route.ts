import { NextRequest, NextResponse } from 'next/server'
import { findBudgetsNeedingReset, resetBudgetPeriod } from '@/lib/db-utils'

/**
 * Budget Reset Cron Job
 * This endpoint is called daily by Vercel Cron to automatically reset budgets
 * when their period ends.
 * 
 * Schedule: Daily at 00:00 UTC (configured in vercel.json)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authorization - only allow requests from Vercel Cron
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret) {
      console.error('[Budget Reset] CRON_SECRET not configured')
      return NextResponse.json(
        { error: 'Cron job not configured' },
        { status: 500 }
      )
    }
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Budget Reset] Unauthorized request')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[Budget Reset] Starting budget reset job...')
    const startTime = Date.now()

    // Find budgets needing reset
    const budgetsToReset = await findBudgetsNeedingReset()
    
    console.log(`[Budget Reset] Found ${budgetsToReset.length} budgets to reset`)

    if (budgetsToReset.length === 0) {
      return NextResponse.json({
        success: true,
        totalBudgets: 0,
        successful: 0,
        failed: 0,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      })
    }

    // Reset each budget
    const results = await Promise.allSettled(
      budgetsToReset.map(async (budget) => {
        console.log(`[Budget Reset] Resetting budget ${budget.id} (${budget.name})`)
        await resetBudgetPeriod(budget)
        return budget.id
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    // Log failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const budget = budgetsToReset[index]
        console.error(`[Budget Reset] Failed to reset budget ${budget.id}:`, result.reason)
      }
    })

    const duration = Date.now() - startTime
    console.log(`[Budget Reset] Completed: ${successful} successful, ${failed} failed in ${duration}ms`)

    return NextResponse.json({
      success: true,
      totalBudgets: budgetsToReset.length,
      successful,
      failed,
      duration,
      timestamp: new Date().toISOString(),
      budgets: budgetsToReset.map(b => ({
        id: b.id,
        name: b.name,
        period: b.period
      }))
    })
  } catch (error) {
    console.error('[Budget Reset] Error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Allow manual triggering during development
export async function POST(request: NextRequest) {
  try {
    // In production, require API key
    const apiKey = request.headers.get('x-api-key')
    
    if (process.env.NODE_ENV === 'production' && apiKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[Budget Reset] Manual reset triggered')
    
    // Call the GET handler
    return GET(request)
  } catch (error) {
    console.error('[Budget Reset] Error in manual trigger:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
