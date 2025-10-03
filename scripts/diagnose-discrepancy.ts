#!/usr/bin/env tsx

/**
 * Diagnostic script to find spending trend discrepancy
 * Run with: npx tsx scripts/diagnose-discrepancy.ts
 */

import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { transactions } from '../src/db/schema'
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('❌ DATABASE_URL not set')
  process.exit(1)
}

const client = neon(connectionString)
const db = drizzle(client)

async function diagnose() {
  console.log('🔍 SPENDING TREND DISCREPANCY INVESTIGATION')
  console.log('='.repeat(80))
  console.log(`Database: ${connectionString.includes('quiet-block') ? 'PRODUCTION ⚠️' : 'DEVELOPMENT'}`)
  console.log('='.repeat(80) + '\n')

  try {
    // Get recent user
    const recentTxn = await db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.transactionDate))
      .limit(1)

    if (recentTxn.length === 0) {
      console.log('❌ No transactions found')
      return
    }

    const userId = recentTxn[0].userId
    console.log(`👤 User ID: ${userId}\n`)

    // Target date: September 27, 2025
    const targetDate = '2025-09-27'
    console.log(`📅 Investigating: ${targetDate}`)
    console.log(`📊 Chart shows: $480.34`)
    console.log(`📄 Transaction page shows: $280.39`)
    console.log(`❌ Discrepancy: $${(480.34 - 280.39).toFixed(2)}\n`)

    // Method 1: Strict date range (what transaction page might use)
    console.log('─'.repeat(80))
    console.log('METHOD 1: Strict UTC date range (Transaction Page Method)')
    console.log('─'.repeat(80))
    
    const startOfDay = new Date('2025-09-27T00:00:00.000Z')
    const endOfDay = new Date('2025-09-27T23:59:59.999Z')

    const method1Txns = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.transactionDate, startOfDay),
          lte(transactions.transactionDate, endOfDay)
        )
      )

    const method1Total = method1Txns.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0)
    console.log(`Transactions found: ${method1Txns.length}`)
    console.log(`Total: $${method1Total.toFixed(2)}\n`)

    method1Txns.forEach((txn, idx) => {
      console.log(`  ${idx + 1}. $${Math.abs(parseFloat(txn.amount)).toFixed(2)} - ${txn.merchant || txn.description}`)
      console.log(`     ${txn.transactionDate.toISOString()}`)
    })

    // Method 2: API aggregation method (what chart uses)
    console.log('\n' + '─'.repeat(80))
    console.log('METHOD 2: API Aggregation (Chart Method)')
    console.log('─'.repeat(80))

    const last30Days = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.transactionDate, new Date('2025-09-01')),
          lte(transactions.transactionDate, new Date())
        )
      )

    // Aggregate using toISOString().split('T')[0]
    const dailyMap = new Map<string, number>()
    
    last30Days.forEach(txn => {
      const dateKey = txn.transactionDate.toISOString().split('T')[0]
      const amount = Math.abs(parseFloat(txn.amount))
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + amount)
    })

    console.log(`\nAll September dates:`)
    Array.from(dailyMap.entries())
      .filter(([date]) => date.startsWith('2025-09'))
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([date, total]) => {
        const marker = date === targetDate ? ' ⭐ TARGET' : ''
        console.log(`  ${date}: $${total.toFixed(2)}${marker}`)
      })

    const method2Total = dailyMap.get(targetDate) || 0
    console.log(`\n💰 Total for ${targetDate}: $${method2Total.toFixed(2)}`)

    // Method 3: Check for transactions that might be on Sep 26 but counted as Sep 27
    console.log('\n' + '─'.repeat(80))
    console.log('METHOD 3: Check Sep 26-28 for timezone issues')
    console.log('─'.repeat(80))

    const wideTxns = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.transactionDate, new Date('2025-09-26T00:00:00Z')),
          lte(transactions.transactionDate, new Date('2025-09-28T23:59:59Z'))
        )
      )
      .orderBy(desc(transactions.transactionDate))

    console.log(`\nAll transactions Sep 26-28:`)
    wideTxns.forEach(txn => {
      const isoDate = txn.transactionDate.toISOString()
      const dateKey = isoDate.split('T')[0]
      const amount = Math.abs(parseFloat(txn.amount))
      console.log(`  ${isoDate} → ${dateKey}: $${amount.toFixed(2)} - ${txn.merchant || txn.description}`)
    })

    // Summary
    console.log('\n' + '='.repeat(80))
    console.log('📊 SUMMARY')
    console.log('='.repeat(80))
    console.log(`Chart display: $480.34`)
    console.log(`Transaction page: $280.39`)
    console.log(`Method 1 (strict range): $${method1Total.toFixed(2)}`)
    console.log(`Method 2 (API aggregation): $${method2Total.toFixed(2)}`)
    
    if (Math.abs(method2Total - 480.34) < 0.1) {
      console.log(`\n✅ Method 2 matches the chart! The issue is in the aggregation logic.`)
    }
    
    if (Math.abs(method1Total - 280.39) < 0.1) {
      console.log(`✅ Method 1 matches the transaction page! This is the correct total.`)
    }

    console.log(`\n💡 The discrepancy is likely caused by:`)
    console.log(`   - Transactions from Sep 26 being counted as Sep 27 due to timezone`)
    console.log(`   - Or transactions from early Sep 28 being counted as Sep 27`)
    console.log(`   - Check the timestamps above to see which transactions are miscategorized`)

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

diagnose()
