/**
 * Clear all transactions from all accounts for fresh import
 */

import { db } from '../src/db/index'
import { accounts, transactions } from '../src/db/schema'
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

async function clearAllAccountTransactions() {
  try {
    console.log('🧹 Clearing All Account Transactions\n')
    
    // Get all accounts
    const allAccounts = await db.select().from(accounts)
    
    console.log(`Found ${allAccounts.length} accounts:\n`)
    
    let totalDeleted = 0
    
    for (const account of allAccounts) {
      console.log(`📊 ${account.name} (${account.institution})`)
      console.log(`   Account ID: ${account.id}`)
      console.log(`   Current Balance: $${parseFloat(account.balance || '0').toFixed(2)}`)
      
      // Count transactions for this account
      const accountTransactions = await db
        .select()
        .from(transactions)
        .where(eq(transactions.accountId, account.id))
      
      console.log(`   Transactions: ${accountTransactions.length}`)
      
      if (accountTransactions.length > 0) {
        // Delete all transactions for this account
        await db
          .delete(transactions)
          .where(eq(transactions.accountId, account.id))
        
        // Reset account balance to 0
        await db
          .update(accounts)
          .set({ 
            balance: '0.00',
            updatedAt: new Date()
          })
          .where(eq(accounts.id, account.id))
        
        console.log(`   ✅ Deleted ${accountTransactions.length} transactions, reset balance to $0.00`)
        totalDeleted += accountTransactions.length
      } else {
        console.log(`   ℹ️  No transactions to delete`)
      }
      
      console.log('')
    }
    
    // Verify all transactions are deleted
    const remainingTransactions = await db.execute(sql`
      SELECT COUNT(*) as count FROM transactions
    `)
    
    console.log('─'.repeat(60))
    console.log(`\n✅ Operation Complete!`)
    console.log(`   Total transactions deleted: ${totalDeleted}`)
    console.log(`   Remaining transactions: ${remainingTransactions.rows[0].count}`)
    console.log(`\nℹ️  All accounts are ready for fresh imports.`)
    console.log(`   Account balances will be updated when you import CSV files with balance columns.`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    process.exit(0)
  }
}

clearAllAccountTransactions()

/***
 * To run this script, use:
 * npx tsx --env-file=.env.local scripts/clear-all-transactions.ts 2>&1
 * Make sure your .env.local file is set up with the correct database connection string.
 */