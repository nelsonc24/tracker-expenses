/**
 * Debug script to check account balances and transaction calculations
 */

import { db } from '../src/db/index'
import { accounts, transactions } from '../src/db/schema'
import { eq } from 'drizzle-orm'

async function debugAccountBalances() {
  try {
    console.log('🔍 Debugging Account Balances\n')
    
    // Get all accounts
    const allAccounts = await db.select().from(accounts).limit(5)
    
    console.log(`Found ${allAccounts.length} accounts\n`)
    
    for (const account of allAccounts) {
      console.log(`\n${'='.repeat(80)}`)
      console.log(`📊 Account: ${account.name} (${account.institution})`)
      console.log(`   Type: ${account.accountType}`)
      console.log(`   Initial Balance: $${parseFloat(account.balance || '0').toFixed(2)}`)
      
      // Get all transactions for this account
      const accountTransactions = await db
        .select()
        .from(transactions)
        .where(eq(transactions.accountId, account.id))
        .orderBy(transactions.transactionDate)
      
      console.log(`   Transactions: ${accountTransactions.length}`)
      
      if (accountTransactions.length > 0) {
        console.log(`\n   Recent Transactions (showing up to 10):`)
        console.log(`   ${'─'.repeat(76)}`)
        console.log(`   Date       | Type    | Amount    | Description`)
        console.log(`   ${'─'.repeat(76)}`)
        
        accountTransactions.slice(0, 10).forEach(tx => {
          const date = new Date(tx.transactionDate).toLocaleDateString()
          const amount = parseFloat(tx.amount || '0').toFixed(2)
          const sign = tx.type === 'debit' ? '-' : '+'
          console.log(`   ${date} | ${tx.type.padEnd(7)} | ${sign}$${Math.abs(amount).toString().padStart(8)} | ${tx.description.substring(0, 30)}`)
        })
        
        // Calculate balance different ways
        console.log(`\n   Balance Calculations:`)
        console.log(`   ${'─'.repeat(76)}`)
        
        const initialBalance = parseFloat(account.balance || '0')
        
        // Current (incorrect) calculation: just sum all amounts
        const currentCalc = accountTransactions.reduce((sum, tx) => {
          return sum + parseFloat(tx.amount || '0')
        }, initialBalance)
        
        // Correct calculation: consider transaction type
        const correctCalc = accountTransactions.reduce((sum, tx) => {
          const amount = parseFloat(tx.amount || '0')
          // For credit transactions (deposits/income), add the amount
          // For debit transactions (withdrawals/expenses), subtract the amount
          if (tx.type === 'credit') {
            return sum + amount
          } else if (tx.type === 'debit') {
            return sum - amount
          }
          return sum
        }, initialBalance)
        
        // Alternative: if amounts are already signed
        const signedCalc = accountTransactions.reduce((sum, tx) => {
          const amount = parseFloat(tx.amount || '0')
          return sum + amount
        }, initialBalance)
        
        console.log(`   Initial Balance:              $${initialBalance.toFixed(2)}`)
        console.log(`   Current Calculation (sum):    $${currentCalc.toFixed(2)}`)
        console.log(`   Correct Calculation (typed):  $${correctCalc.toFixed(2)}`)
        console.log(`   Signed Amount Calculation:    $${signedCalc.toFixed(2)}`)
        
        // Show transaction type breakdown
        const credits = accountTransactions.filter(tx => tx.type === 'credit')
        const debits = accountTransactions.filter(tx => tx.type === 'debit')
        const transfers = accountTransactions.filter(tx => tx.type === 'transfer')
        
        const creditTotal = credits.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0)
        const debitTotal = debits.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0)
        const transferTotal = transfers.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0)
        
        console.log(`\n   Transaction Type Breakdown:`)
        console.log(`   ${'─'.repeat(76)}`)
        console.log(`   Credits (deposits):   ${credits.length.toString().padStart(3)} transactions, $${creditTotal.toFixed(2)}`)
        console.log(`   Debits (expenses):    ${debits.length.toString().padStart(3)} transactions, $${debitTotal.toFixed(2)}`)
        console.log(`   Transfers:            ${transfers.length.toString().padStart(3)} transactions, $${transferTotal.toFixed(2)}`)
      }
    }
    
    console.log(`\n${'='.repeat(80)}\n`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    process.exit(0)
  }
}

debugAccountBalances()
