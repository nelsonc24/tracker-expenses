/**
 * Check the current balance of Complete Access account
 */

import { db } from '../src/db/index'
import { accounts, transactions } from '../src/db/schema'
import { eq, and } from 'drizzle-orm'

async function checkCompleteAccessBalance() {
  try {
    console.log('🔍 Checking Complete Access Account Balance\n')
    
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
    console.log(`Institution: ${account.institution}`)
    console.log(`Initial Balance: $${parseFloat(account.balance || '0').toFixed(2)}`)
    console.log(`Account ID: ${account.id}\n`)
    
    // Get all transactions for this account
    const accountTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.accountId, account.id))
      .orderBy(transactions.transactionDate)
    
    console.log(`Total Transactions: ${accountTransactions.length}\n`)
    
    // Calculate balance
    const initialBalance = parseFloat(account.balance || '0')
    const transactionsTotal = accountTransactions.reduce((sum, tx) => {
      return sum + parseFloat(tx.amount || '0')
    }, 0)
    
    const calculatedBalance = initialBalance + transactionsTotal
    
    console.log('Balance Calculation:')
    console.log('─'.repeat(60))
    console.log(`Initial Balance:        $${initialBalance.toFixed(2)}`)
    console.log(`Transactions Total:     $${transactionsTotal.toFixed(2)}`)
    console.log(`Calculated Balance:     $${calculatedBalance.toFixed(2)}`)
    console.log('')
    console.log(`Expected Balance:       $50.70`)
    console.log(`Difference:             $${(calculatedBalance - 50.70).toFixed(2)}`)
    
    if (Math.abs(calculatedBalance - 50.70) > 0.01) {
      console.log('\n⚠️  Balance mismatch detected!')
      console.log('\nShowing last 10 transactions:')
      console.log('─'.repeat(80))
      console.log('Date       | Type    | Amount     | Description')
      console.log('─'.repeat(80))
      
      accountTransactions.slice(-10).forEach(tx => {
        const date = new Date(tx.transactionDate).toLocaleDateString()
        const amount = parseFloat(tx.amount || '0')
        console.log(`${date.padEnd(11)}| ${tx.type.padEnd(7)} | ${amount.toFixed(2).padStart(10)} | ${tx.description.substring(0, 40)}`)
      })
    } else {
      console.log('\n✅ Balance is correct!')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    process.exit(0)
  }
}

checkCompleteAccessBalance()
