/**
 * Check raw transaction amounts to understand how they're stored
 */

import { db } from '../src/db/index'
import { transactions } from '../src/db/schema'

async function checkRawAmounts() {
  try {
    // Get a sample of transactions
    const sample = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        description: transactions.description,
      })
      .from(transactions)
      .limit(20)
    
    console.log('Sample Transaction Amounts (raw from DB):\n')
    console.log('Type    | Raw Amount | Description')
    console.log('─'.repeat(80))
    
    sample.forEach(tx => {
      console.log(`${tx.type.padEnd(7)} | ${String(tx.amount).padStart(10)} | ${tx.description?.substring(0, 40)}`)
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    process.exit(0)
  }
}

checkRawAmounts()
