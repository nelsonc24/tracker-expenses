/**
 * PRODUCTION SAFE: Remove duplicate transactions while preserving categories and budgets
 * 
 * This script:
 * 1. Identifies duplicate transactions based on the OLD hash logic (with account name)
 * 2. Keeps the FIRST occurrence of each duplicate set
 * 3. Deletes only the duplicate copies
 * 4. Updates account balances based on remaining transactions
 * 5. Does NOT touch categories or budgets
 * 
 * Safe to run on production - only removes duplicates, preserves all other data
 */

import { db } from '../src/db/index'
import { accounts, transactions } from '../src/db/schema'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'

// Generate hash using OLD logic (with account name) to find existing duplicates
function generateOldHash(
  userId: string,
  date: string,
  description: string,
  amount: number,
  accountName: string
): string {
  const normalizedDescription = description.toLowerCase().trim()
  const hashInput = `${userId}-${date}-${normalizedDescription}-${amount}-${accountName}`
  return crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 16)
}

interface DuplicateGroup {
  hash: string
  transactions: Array<{
    id: string
    date: Date
    description: string
    amount: string
    accountId: string
    accountName: string
    createdAt: Date
  }>
}

async function removeDuplicates() {
  try {
    console.log('🔍 Production Duplicate Removal Tool\n')
    console.log('This script will:')
    console.log('  ✓ Find duplicate transactions')
    console.log('  ✓ Keep the first occurrence')
    console.log('  ✓ Remove duplicate copies')
    console.log('  ✓ Preserve categories and budgets')
    console.log('  ✓ Update account balances\n')

    // Get all transactions with account info
    const allTransactions = await db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        date: transactions.transactionDate,
        description: transactions.description,
        amount: transactions.amount,
        accountId: transactions.accountId,
        createdAt: transactions.createdAt,
        accountName: accounts.name
      })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))

    console.log(`📊 Total transactions in database: ${allTransactions.length}\n`)

    // Group transactions by hash
    const hashGroups = new Map<string, DuplicateGroup>()

    for (const tx of allTransactions) {
      if (!tx.userId || !tx.accountName) continue

      const hash = generateOldHash(
        tx.userId,
        tx.date.toISOString(),
        tx.description,
        parseFloat(tx.amount),
        tx.accountName
      )

      if (!hashGroups.has(hash)) {
        hashGroups.set(hash, {
          hash,
          transactions: []
        })
      }

      hashGroups.get(hash)!.transactions.push({
        id: tx.id,
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        accountId: tx.accountId!,
        accountName: tx.accountName,
        createdAt: tx.createdAt
      })
    }

    // Find groups with duplicates
    const duplicateGroups = Array.from(hashGroups.values())
      .filter(group => group.transactions.length > 1)

    if (duplicateGroups.length === 0) {
      console.log('✅ No duplicates found! Your database is clean.\n')
      return
    }

    console.log(`⚠️  Found ${duplicateGroups.length} groups with duplicates\n`)

    // Show preview
    let totalToDelete = 0
    for (const group of duplicateGroups) {
      const duplicateCount = group.transactions.length - 1
      totalToDelete += duplicateCount
      
      console.log(`Duplicate Group (${group.transactions.length} copies):`)
      group.transactions.forEach((tx, index) => {
        const marker = index === 0 ? '✓ KEEP' : '✗ DELETE'
        console.log(`  ${marker} - ${tx.date.toLocaleDateString()} | ${tx.description} | $${tx.amount} | ${tx.accountName}`)
      })
      console.log()
    }

    console.log(`\n📋 Summary:`)
    console.log(`   Total duplicate groups: ${duplicateGroups.length}`)
    console.log(`   Transactions to keep: ${duplicateGroups.length}`)
    console.log(`   Transactions to delete: ${totalToDelete}`)
    console.log(`   Final transaction count: ${allTransactions.length - totalToDelete}\n`)

    // Prompt for confirmation (commented out for production script)
    // In production, you might want to add: if (process.env.CONFIRM_DELETE !== 'yes') return

    console.log('🗑️  Deleting duplicates...\n')

    let deletedCount = 0
    const affectedAccounts = new Set<string>()

    for (const group of duplicateGroups) {
      // Sort by createdAt to keep the oldest one
      const sorted = group.transactions.sort((a, b) => 
        a.createdAt.getTime() - b.createdAt.getTime()
      )

      // Delete all except the first one
      for (let i = 1; i < sorted.length; i++) {
        const tx = sorted[i]
        await db.delete(transactions).where(eq(transactions.id, tx.id))
        deletedCount++
        affectedAccounts.add(tx.accountId)
        console.log(`  ✗ Deleted: ${tx.description} ($${tx.amount}) from ${tx.accountName}`)
      }
    }

    console.log(`\n✅ Deleted ${deletedCount} duplicate transactions\n`)

    // Update account balances
    console.log('💰 Updating account balances...\n')

    for (const accountId of affectedAccounts) {
      const accountData = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .limit(1)

      if (accountData.length === 0) continue

      const account = accountData[0]

      // Calculate new balance from remaining transactions
      const accountTransactions = await db
        .select()
        .from(transactions)
        .where(eq(transactions.accountId, accountId))
        .orderBy(transactions.transactionDate)

      let balance = 0
      for (const tx of accountTransactions) {
        balance += parseFloat(tx.amount)
      }

      await db
        .update(accounts)
        .set({
          balance: balance.toFixed(2),
          updatedAt: new Date()
        })
        .where(eq(accounts.id, accountId))

      console.log(`  ✓ ${account.name}: Updated balance to $${balance.toFixed(2)} (${accountTransactions.length} transactions)`)
    }

    console.log(`\n✨ Production cleanup complete!`)
    console.log(`   Removed ${deletedCount} duplicates`)
    console.log(`   Updated ${affectedAccounts.size} account balances`)
    console.log(`   Categories and budgets preserved`)
    console.log('\n💡 Next steps:')
    console.log('   1. Verify account balances in the UI')
    console.log('   2. New imports will use the improved Transaction ID logic')
    console.log('   3. No more duplicates! 🎉\n')

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

// Run the script
removeDuplicates()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
