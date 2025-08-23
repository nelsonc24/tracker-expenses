import { db } from '../src/db/index.js'
import { transactions } from '../src/db/schema.js'
import { sql } from 'drizzle-orm'

async function testCategoryAnalytics() {
  try {
    console.log('Testing category analytics query...')
    
    // This is the query that was failing
    const result = await db
      .select({
        categoryId: transactions.categoryId,
        transactionCount: sql`count(*)`.as('transaction_count'),
        totalAmount: sql`sum(${transactions.amount})`.as('total_amount')
      })
      .from(transactions)
      .where(sql`${transactions.categoryId} IS NOT NULL`)
      .groupBy(transactions.categoryId)
      
    console.log('Query successful!')
    console.log('Result:', result)
  } catch (error) {
    console.error('Query failed:', error.message)
  }
}

testCategoryAnalytics()
