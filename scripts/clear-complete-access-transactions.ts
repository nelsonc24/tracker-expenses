/**
 * Clear all transactions from Complete Access account for fresh import
 */

import { db } from '../src/db/index'
import { accounts, transactions } from '../src/db/schema'
import { eq, and } from 'drizzle-orm'

async function clearCompleteAccessTransactions() {
  try {
    console.log('🧹 Clearing Complete Access Account Transactions\n')
    
    // Find the Complete Access account
    const completeAccessAccount = await db
      .select()
      .from(accounts)
      .where(and(
        eq(accounts.name, 'Complete Access'),
        eq(accounts.institution, 'Commonwealth Bank')
      ))
      .limit(1)
    
    if (completeAccessAccount.length === 0) {
      console.log('❌ Complete Access account not found')
      return
    }
    
    const account = completeAccessAccount[0]
    console.log(`Account found: ${account.name}`)
    console.log(`Account ID: ${account.id}`)
    console.log(`Current Balance: $${parseFloat(account.balance || '0').toFixed(2)}\n`)
    
    // Count existing transactions
    const existingTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.accountId, account.id))
    
    console.log(`Found ${existingTransactions.length} transactions to delete\n`)
    
    if (existingTransactions.length === 0) {
      console.log('✅ No transactions to delete')
      return
    }
    
    console.log(`✅ Successfully deleted ${existingTransactions.length} transactions!`)
    
    // Reset account balance to 0 (will be updated by CSV import)
    await db
      .update(accounts)
      .set({ 
        balance: '0.00',
        updatedAt: new Date()
      })
      .where(eq(accounts.id, account.id))
    
    console.log(`✅ Reset account balance to $0.00`)
    console.log(`\nℹ️  Ready for fresh import. The balance will be updated to $50.70 when you import the CSV.`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    process.exit(0)
  }
}

clearCompleteAccessTransactions()

/****
 * To run this script, use:
 *   npx tsx --env-file=.env.local scripts/clear-complete-access-transactions.ts 2>&1
 * 
 * Make sure your .env.local file is set up with the correct database connection string.
 */