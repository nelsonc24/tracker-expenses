/**
 * Production Database Health Check
 * 
 * Run this BEFORE and AFTER the duplicate removal to verify:
 * - Total transaction count
 * - Duplicate count
 * - Account balances
 * - Categories and budgets intact
 */

import { db } from '../src/db/index'
import { accounts, transactions, categories, budgets } from '../src/db/schema'

async function healthCheck() {
  try {
    console.log('🏥 Production Database Health Check\n')
    console.log('=' .repeat(60))
    
    // Get all transactions
    const allTransactions = await db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        transactionDate: transactions.transactionDate,
        description: transactions.description,
        amount: transactions.amount,
        accountId: transactions.accountId,
        categoryId: transactions.categoryId,
        duplicateCheckHash: transactions.duplicateCheckHash
      })
      .from(transactions)

    console.log(`\n📊 TRANSACTION STATISTICS`)
    console.log(`   Total transactions: ${allTransactions.length}`)
    
    // Check for duplicates
    const hashMap = new Map<string, number>()
    let duplicateCount = 0
    
    for (const tx of allTransactions) {
      if (tx.duplicateCheckHash) {
        const count = hashMap.get(tx.duplicateCheckHash) || 0
        hashMap.set(tx.duplicateCheckHash, count + 1)
        if (count > 0) {
          duplicateCount++
        }
      }
    }
    
    const duplicateGroups = Array.from(hashMap.values()).filter(count => count > 1).length
    
    console.log(`   Transactions with hashes: ${Array.from(hashMap.keys()).length}`)
    console.log(`   Duplicate groups: ${duplicateGroups}`)
    console.log(`   Total duplicates: ${duplicateCount}`)
    
    if (duplicateCount === 0) {
      console.log(`   ✅ No duplicates found!`)
    } else {
      console.log(`   ⚠️  ${duplicateCount} duplicates need removal`)
    }
    
    // Get accounts
    const allAccounts = await db.select().from(accounts)
    
    console.log(`\n💰 ACCOUNT BALANCES`)
    console.log(`   Total accounts: ${allAccounts.length}`)
    
    let totalBalance = 0
    for (const account of allAccounts) {
      const accountTransactions = allTransactions.filter(tx => tx.accountId === account.id)
      const calculatedBalance = accountTransactions.reduce((sum, tx) => 
        sum + parseFloat(tx.amount), 0
      )
      const storedBalance = parseFloat(account.balance || '0')
      const match = Math.abs(calculatedBalance - storedBalance) < 0.01
      
      console.log(`\n   ${account.name} (${account.institution})`)
      console.log(`      Stored balance: $${storedBalance.toFixed(2)}`)
      console.log(`      Calculated balance: $${calculatedBalance.toFixed(2)}`)
      console.log(`      Transactions: ${accountTransactions.length}`)
      console.log(`      Status: ${match ? '✅ Match' : '❌ Mismatch'}`)
      
      totalBalance += storedBalance
    }
    
    console.log(`\n   Total across all accounts: $${totalBalance.toFixed(2)}`)
    
    // Get categories
    const allCategories = await db.select().from(categories)
    const transactionsWithCategories = allTransactions.filter(tx => tx.categoryId !== null)
    
    console.log(`\n📁 CATEGORIES`)
    console.log(`   Total categories: ${allCategories.length}`)
    console.log(`   Transactions with categories: ${transactionsWithCategories.length}`)
    console.log(`   Uncategorized transactions: ${allTransactions.length - transactionsWithCategories.length}`)
    
    // Get budgets
    const allBudgets = await db.select().from(budgets)
    
    console.log(`\n💵 BUDGETS`)
    console.log(`   Total budgets: ${allBudgets.length}`)
    
    // Transaction ID coverage
    const transactionsWithIds = allTransactions.filter(tx => {
      // Check if originalData contains a transaction ID
      const original = tx as unknown as { transactionId?: string; originalData?: Record<string, unknown> }
      return original.transactionId || 
             (original.originalData && (
               original.originalData['Transaction ID'] ||
               original.originalData['transactionId']
             ))
    })
    
    console.log(`\n🆔 TRANSACTION ID COVERAGE`)
    console.log(`   Transactions with IDs: ${transactionsWithIds.length}`)
    console.log(`   Coverage: ${((transactionsWithIds.length / allTransactions.length) * 100).toFixed(1)}%`)
    
    // Date range
    const dates = allTransactions.map(tx => tx.transactionDate).sort()
    if (dates.length > 0) {
      console.log(`\n📅 DATE RANGE`)
      console.log(`   Oldest transaction: ${dates[0].toLocaleDateString()}`)
      console.log(`   Newest transaction: ${dates[dates.length - 1].toLocaleDateString()}`)
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('\n✅ Health check complete!\n')
    
    // Summary
    const issues = []
    if (duplicateCount > 0) issues.push(`${duplicateCount} duplicate transactions`)
    
    // Check for balance mismatches
    for (const account of allAccounts) {
      const accountTransactions = allTransactions.filter(tx => tx.accountId === account.id)
      const calculatedBalance = accountTransactions.reduce((sum, tx) => 
        sum + parseFloat(tx.amount), 0
      )
      const storedBalance = parseFloat(account.balance || '0')
      if (Math.abs(calculatedBalance - storedBalance) >= 0.01) {
        issues.push(`${account.name} balance mismatch`)
      }
    }
    
    if (issues.length > 0) {
      console.log('⚠️  ISSUES FOUND:')
      issues.forEach(issue => console.log(`   - ${issue}`))
      console.log('\n💡 Run the production-remove-duplicates.ts script to fix duplicates\n')
    } else {
      console.log('🎉 Database is healthy! No issues found.\n')
    }

  } catch (error) {
    console.error('❌ Error during health check:', error)
    throw error
  }
}

// Run the health check
healthCheck()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
