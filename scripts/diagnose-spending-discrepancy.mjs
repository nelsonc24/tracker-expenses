#!/usr/bin/env node

/**
 * Diagnostic script to find the spending trend discrepancy
 * Compares what the chart shows vs actual transactions for Sep 27, 2025
 */

import('drizzle-orm/postgres-js').then(async (drizzleModule) => {
  const { drizzle } = drizzleModule
  const postgres = (await import('postgres')).default
  const { transactions } = await import('../src/db/schema.js')
  const { eq, and, gte, lte, desc, sql } = await import('drizzle-orm')

  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable is not set')
    process.exit(1)
  }

  console.log('🔍 SPENDING TREND DISCREPANCY INVESTIGATION')
  console.log('=' .repeat(80))
  console.log(`Database: ${connectionString.includes('quiet-block') ? 'PRODUCTION' : 'DEVELOPMENT'}`)
  console.log('=' .repeat(80) + '\n')

  const client = postgres(connectionString)
  const db = drizzle(client)

  try {
    // Get the most recent user with transactions
    const recentTxn = await db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.transactionDate))
      .limit(1)

    if (recentTxn.length === 0) {
      console.log('❌ No transactions found')
      await client.end()
      return
    }

    const userId = recentTxn[0].userId
    console.log(`👤 User ID: ${userId}\n`)

    // CRITICAL: Check September 27, 2025
    const targetDate = '2025-09-27'
    console.log(`📅 Target Date: ${targetDate}`)
    console.log('─'.repeat(80))

    // Query 1: Get all transactions on Sep 27 using the EXACT date
    const startOfDay = new Date('2025-09-27T00:00:00.000Z')
    const endOfDay = new Date('2025-09-27T23:59:59.999Z')

    console.log(`Start of day UTC: ${startOfDay.toISOString()}`)
    console.log(`End of day UTC: ${endOfDay.toISOString()}\n`)

    const sept27Transactions = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.transactionDate, startOfDay),
          lte(transactions.transactionDate, endOfDay)
        )
      )
      .orderBy(desc(transactions.transactionDate))

    console.log(`\n📊 QUERY 1: Transactions between ${startOfDay.toISOString()} and ${endOfDay.toISOString()}`)
    console.log(`Found: ${sept27Transactions.length} transactions\n`)

    if (sept27Transactions.length > 0) {
      let total = 0
      sept27Transactions.forEach((txn, idx) => {
        const amount = Math.abs(parseFloat(txn.amount))
        total += amount
        console.log(`${idx + 1}. $${amount.toFixed(2)} - ${txn.merchant || txn.description}`)
        console.log(`   Date: ${txn.transactionDate.toISOString()}`)
      })
      console.log(`\n💰 Total (Query 1): $${total.toFixed(2)}`)
    }

    // Query 2: Check what the API does - using toISOString().split('T')[0]
    console.log('\n' + '='.repeat(80))
    console.log('📊 QUERY 2: How the API aggregates (using toISOString().split("T")[0])')
    console.log('='.repeat(80) + '\n')

    // Get last 30 days
    const thirtyDaysAgo = new Date('2025-09-01T00:00:00.000Z')
    const now = new Date()

    const last30DaysTxns = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.transactionDate, thirtyDaysAgo),
          lte(transactions.transactionDate, now)
        )
      )

    console.log(`Total transactions in range: ${last30DaysTxns.length}\n`)

    // Aggregate by date using the EXACT logic from the API
    const dailySpending = new Map()

    last30DaysTxns.forEach(txn => {
      const date = txn.transactionDate.toISOString().split('T')[0]
      const amount = Math.abs(parseFloat(txn.amount))
      dailySpending.set(date, (dailySpending.get(date) || 0) + amount)
    })

    // Show all dates in September
    const septDates = Array.from(dailySpending.entries())
      .filter(([date]) => date.startsWith('2025-09'))
      .sort((a, b) => a[0].localeCompare(b[0]))

    console.log('Daily totals for September 2025:')
    console.log('─'.repeat(80))
    septDates.forEach(([date, total]) => {
      const highlight = date === targetDate ? ' ⭐' : ''
      console.log(`${date}: $${total.toFixed(2)}${highlight}`)
    })

    const apiTotal = dailySpending.get(targetDate) || 0
    console.log(`\n💰 Total for ${targetDate} (API method): $${apiTotal.toFixed(2)}`)

    // Query 3: Check for timezone issues - get ALL Sep 27 transactions regardless of time
    console.log('\n' + '='.repeat(80))
    console.log('📊 QUERY 3: Raw SQL to see ALL transactions that might be counted as Sep 27')
    console.log('='.repeat(80) + '\n')

    const rawResults = await db.execute(sql`
      SELECT 
        transaction_date,
        transaction_date AT TIME ZONE 'UTC' as utc_time,
        transaction_date::date as date_part,
        amount,
        merchant,
        description
      FROM transactions
      WHERE user_id = ${userId}
        AND transaction_date >= '2025-09-26T00:00:00Z'
        AND transaction_date < '2025-09-28T00:00:00Z'
      ORDER BY transaction_date DESC
    `)

    console.log('Transactions near Sep 27 (26th-27th):')
    console.log('─'.repeat(80))
    
    let rawTotal = 0
    rawResults.forEach((row, idx) => {
      const amount = Math.abs(parseFloat(row.amount))
      rawTotal += amount
      console.log(`${idx + 1}. Date: ${row.transaction_date}`)
      console.log(`   UTC: ${row.utc_time}`)
      console.log(`   Date part: ${row.date_part}`)
      console.log(`   Amount: $${amount.toFixed(2)} - ${row.merchant || row.description}`)
      console.log()
    })

    console.log(`💰 Total from raw query: $${rawTotal.toFixed(2)}`)

    // COMPARISON
    console.log('\n' + '='.repeat(80))
    console.log('🔍 ANALYSIS')
    console.log('='.repeat(80))
    console.log(`Chart shows: $480.34`)
    console.log(`Transaction page shows: $280.39`)
    console.log(`Query 1 (strict date range): $${sept27Transactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0).toFixed(2)}`)
    console.log(`Query 2 (API method): $${apiTotal.toFixed(2)}`)
    console.log(`Query 3 (raw SQL): $${rawTotal.toFixed(2)}`)

    const difference = 480.34 - 280.39
    console.log(`\n❌ DISCREPANCY: $${difference.toFixed(2)}`)
    console.log(`\n💡 Possible causes:`)
    console.log(`   1. Duplicate transactions being counted`)
    console.log(`   2. Timezone issue causing Sep 26 transactions to be counted as Sep 27`)
    console.log(`   3. Income transactions being included (should only count expenses)`)
    console.log(`   4. Deleted/hidden transactions still being counted in the chart`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await client.end()
  }
}).catch(err => {
  console.error('Failed to load modules:', err)
  process.exit(1)
})
