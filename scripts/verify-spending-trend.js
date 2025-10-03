/**
 * Script to verify Spending Trend accuracy
 * Tests the aggregation logic against actual transaction data
 * 
 * Run with: node --input-type=module scripts/verify-spending-trend.js
 */

import('drizzle-orm/postgres-js').then(async ({ drizzle }) => {
  const postgres = (await import('postgres')).default
  const { transactions } = await import('../src/db/schema.js')
  const { eq, and, gte, lte, desc } = await import('drizzle-orm')

  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set')
    process.exit(1)
  }

  const client = postgres(connectionString)
  const db = drizzle(client)

async function verifySpendingTrend() {
  console.log('🔍 Verifying Spending Trend Calculation...\n')

  try {
    // Get all users with transactions
    const allTransactions = await db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.transactionDate))
      .limit(1)

    if (allTransactions.length === 0) {
      console.log('❌ No transactions found in database')
      return
    }

    const userId = allTransactions[0].userId
    console.log(`📊 Testing for user: ${userId}\n`)

    // Test date: September 27, 2024
    const testDate = new Date('2024-09-27')
    const startOfDay = new Date(testDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(testDate)
    endOfDay.setHours(23, 59, 59, 999)

    console.log(`📅 Test Date: ${testDate.toISOString().split('T')[0]}`)
    console.log(`   Start of Day: ${startOfDay.toISOString()}`)
    console.log(`   End of Day: ${endOfDay.toISOString()}\n`)

    // Get transactions for September 27th
    const sept27Transactions = await db
      .select({
        id: transactions.id,
        date: transactions.transactionDate,
        amount: transactions.amount,
        description: transactions.description,
        merchantName: transactions.merchantName
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.transactionDate, startOfDay),
          lte(transactions.transactionDate, endOfDay)
        )
      )
      .orderBy(desc(transactions.transactionDate))

    console.log(`📋 Transactions on September 27, 2024: ${sept27Transactions.length} transactions\n`)
    
    if (sept27Transactions.length === 0) {
      console.log('ℹ️  No transactions found for this date. Trying last 7 days...\n')
      
      // Get last 7 days of transactions
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const recentTransactions = await db
        .select({
          id: transactions.id,
          date: transactions.transactionDate,
          amount: transactions.amount,
          description: transactions.description,
          merchantName: transactions.merchantName
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            gte(transactions.transactionDate, sevenDaysAgo)
          )
        )
        .orderBy(desc(transactions.transactionDate))
      
      console.log(`📋 Transactions in last 7 days: ${recentTransactions.length}\n`)
      
      // Group by date
      const dailySpending = new Map()
      
      recentTransactions.forEach(txn => {
        const date = new Date(txn.date).toISOString().split('T')[0]
        const amount = Math.abs(parseFloat(txn.amount))
        dailySpending.set(date, (dailySpending.get(date) || 0) + amount)
      })
      
      console.log('📊 Daily Spending Breakdown:')
      console.log('─'.repeat(80))
      const sortedDates = Array.from(dailySpending.entries()).sort((a, b) => b[0].localeCompare(a[0]))
      
      sortedDates.forEach(([date, total]) => {
        const dateTxns = recentTransactions.filter(t => new Date(t.date).toISOString().split('T')[0] === date)
        console.log(`\n📅 ${date}: $${total.toFixed(2)} (${dateTxns.length} transactions)`)
        dateTxns.forEach(txn => {
          console.log(`   • $${Math.abs(parseFloat(txn.amount)).toFixed(2)} - ${txn.merchantName || txn.description}`)
        })
      })
      
      // Now simulate the spending trend API logic
      console.log('\n' + '='.repeat(80))
      console.log('🔄 SIMULATING SPENDING TREND API LOGIC')
      console.log('='.repeat(80) + '\n')
      
      // Get last 30 days for comparison
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const last30Days = await db
        .select({
          date: transactions.transactionDate,
          amount: transactions.amount
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            gte(transactions.transactionDate, thirtyDaysAgo)
          )
        )
      
      console.log(`📊 Total transactions in last 30 days: ${last30Days.length}\n`)
      
      // Replicate the exact logic from the API
      const spendingMap = new Map()
      
      last30Days.forEach(txn => {
        const date = new Date(txn.date)
        const key = date.toISOString().split('T')[0]
        const amount = Math.abs(parseFloat(txn.amount))
        spendingMap.set(key, (spendingMap.get(key) || 0) + amount)
      })
      
      // Convert to array and sort (last 7 days)
      const trendData = Array.from(spendingMap.entries())
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-7)
      
      console.log('📈 SPENDING TREND (Last 7 Days):')
      console.log('─'.repeat(80))
      trendData.forEach(item => {
        console.log(`${item.date}: $${item.amount.toFixed(2)}`)
      })
      
      // Compare with what dashboard page would show
      console.log('\n' + '='.repeat(80))
      console.log('🔍 COMPARISON WITH DASHBOARD PAGE LOGIC')
      console.log('='.repeat(80) + '\n')
      
      const dailySpendingDashboard = new Map()
      
      last30Days.forEach(txn => {
        const date = txn.date.toISOString().split('T')[0]
        const amount = Math.abs(parseFloat(txn.amount))
        dailySpendingDashboard.set(date, (dailySpendingDashboard.get(date) || 0) + amount)
      })
      
      const dashboardTrendData = Array.from(dailySpendingDashboard.entries())
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-7)
      
      console.log('📊 DASHBOARD INITIAL DATA (Last 7 Days):')
      console.log('─'.repeat(80))
      dashboardTrendData.forEach(item => {
        console.log(`${item.date}: $${item.amount.toFixed(2)}`)
      })
      
      // Check for discrepancies
      console.log('\n' + '='.repeat(80))
      console.log('✅ VERIFICATION RESULTS')
      console.log('='.repeat(80) + '\n')
      
      let hasDiscrepancy = false
      trendData.forEach((apiItem, index) => {
        const dashboardItem = dashboardTrendData[index]
        if (apiItem.date !== dashboardItem.date || Math.abs(apiItem.amount - dashboardItem.amount) > 0.01) {
          hasDiscrepancy = true
          console.log(`❌ MISMATCH on ${apiItem.date}:`)
          console.log(`   API: $${apiItem.amount.toFixed(2)}`)
          console.log(`   Dashboard: $${dashboardItem.amount.toFixed(2)}`)
        }
      })
      
      if (!hasDiscrepancy) {
        console.log('✅ All data matches between API and Dashboard!')
      }
      
    } else {
      // Calculate total for Sept 27
      const total = sept27Transactions.reduce((sum, txn) => {
        return sum + Math.abs(parseFloat(txn.amount))
      }, 0)

      console.log('💰 Individual Transactions:')
      console.log('─'.repeat(80))
      sept27Transactions.forEach(txn => {
        console.log(`• $${Math.abs(parseFloat(txn.amount)).toFixed(2)} - ${txn.merchantName || txn.description}`)
        console.log(`  Date: ${new Date(txn.date).toISOString()}`)
      })

      console.log('\n' + '='.repeat(80))
      console.log(`📊 TOTAL for September 27, 2024: $${total.toFixed(2)}`)
      console.log('='.repeat(80) + '\n')

      console.log('✅ This is what should appear in the Spending Trend chart for Sept 27')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await client.end()
  }
}

verifySpendingTrend()
