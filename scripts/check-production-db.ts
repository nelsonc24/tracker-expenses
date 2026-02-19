import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { transactions, users } from '../src/db/schema'
import { sql } from 'drizzle-orm'

const connectionString = process.env.DATABASE_URL!

async function checkProductionDB() {
  const client = neon(connectionString)
  const db = drizzle(client)

  try {
    console.log('🔍 Checking Production Database...\n')

    // 1. Count total transactions
    const [{ count: totalCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactions)
    console.log(`📊 Total Transactions: ${totalCount}`)

    // 2. Count total users
    const [{ count: userCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
    console.log(`👥 Total Users: ${userCount}\n`)

    // 3. Get sample transactions with details
    console.log('📝 Sample Transactions (last 10):')
    const sampleTransactions = await db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        amount: transactions.amount,
        description: transactions.description,
        date: transactions.transactionDate,
        isTransfer: transactions.isTransfer,
        transferPairId: transactions.transferPairId,
      })
      .from(transactions)
      .orderBy(sql`${transactions.transactionDate} DESC`)
      .limit(10)

    sampleTransactions.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.date.toISOString().split('T')[0]} | $${t.amount} | ${t.description}`)
      console.log(`     User: ${t.userId} | Transfer: ${t.isTransfer} | PairId: ${t.transferPairId || 'none'}`)
    })

    // 4. Check transactions by user
    console.log('\n👤 Transactions per user:')
    const userTransactionCounts = await db
      .select({
        userId: transactions.userId,
        count: sql<number>`count(*)::int`,
      })
      .from(transactions)
      .groupBy(transactions.userId)

    userTransactionCounts.forEach(({ userId, count }) => {
      console.log(`  User ${userId}: ${count} transactions`)
    })

    // 5. Check date range of transactions
    console.log('\n📅 Transaction Date Range:')
    const [dateRange] = await db
      .select({
        earliest: sql<Date>`min(${transactions.transactionDate})`,
        latest: sql<Date>`max(${transactions.transactionDate})`,
      })
      .from(transactions)

    if (dateRange.earliest && dateRange.latest) {
      console.log(`  Earliest: ${dateRange.earliest.toISOString().split('T')[0]}`)
      console.log(`  Latest: ${dateRange.latest.toISOString().split('T')[0]}`)
    }

    // 6. Check for expenses in last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const [{ count: recentExpenses }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactions)
      .where(sql`${transactions.transactionDate} >= ${sevenDaysAgo} AND ${transactions.amount} < 0`)
    
    console.log(`\n💰 Expenses in last 7 days: ${recentExpenses}`)

    // 7. Check current month transactions
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const [{ count: thisMonthCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactions)
      .where(sql`${transactions.transactionDate} >= ${startOfMonth}`)
    
    console.log(`📆 Transactions this month (Feb 2026): ${thisMonthCount}`)

    // 8. Check if transferPairId column exists
    console.log('\n🔧 Schema Check:')
    const schemaCheck = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'transactions' 
      AND column_name IN ('is_transfer', 'transfer_pair_id')
      ORDER BY column_name
    `)
    
    console.log('  Transfer columns:')
    schemaCheck.forEach((row: any) => {
      console.log(`    - ${row.column_name}: ${row.data_type}`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkProductionDB()
