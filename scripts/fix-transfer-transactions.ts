/**
 * Script to identify and optionally fix transactions that should be marked as transfers
 * 
 * This script finds:
 * 1. Transactions with "Income" or "Transfer" categories that have isTransfer=false
 * 2. Credit transactions (income) that might be transfers between accounts
 * 
 * Usage:
 *   pnpm tsx scripts/fix-transfer-transactions.ts [--dry-run] [--user-id=<userId>]
 * 
 * Options:
 *   --dry-run    Show what would be changed without making changes
 *   --user-id    Process only transactions for a specific user
 */

import { db } from '@/db'
import { transactions, categories } from '@/db/schema'
import { eq, and, or, inArray } from 'drizzle-orm'

async function findTransferCandidates(userId?: string) {
  console.log('🔍 Finding transactions that might be transfers...\n')
  
  // Find all Income and Transfer categories
  const transferCategories = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(
      or(
        eq(categories.name, 'Income'),
        eq(categories.name, 'Transfer'),
        eq(categories.name, 'Internal Transfer')
      )
    )
  
  console.log(`Found ${transferCategories.length} transfer-related categories:`)
  transferCategories.forEach(cat => console.log(`  - ${cat.name} (${cat.id})`))
  console.log()
  
  if (transferCategories.length === 0) {
    console.log('⚠️  No transfer-related categories found')
    return { candidates: [], transferCategories: [] }
  }
  
  const categoryIds = transferCategories.map(c => c.id)
  
  // Find transactions with these categories that aren't marked as transfers
  const conditions = [
    inArray(transactions.categoryId, categoryIds),
    eq(transactions.isTransfer, false)
  ]
  
  if (userId) {
    conditions.push(eq(transactions.userId, userId))
  }
  
  const candidates = await db
    .select({
      id: transactions.id,
      userId: transactions.userId,
      description: transactions.description,
      amount: transactions.amount,
      type: transactions.type,
      transactionDate: transactions.transactionDate,
      categoryId: transactions.categoryId,
      isTransfer: transactions.isTransfer,
    })
    .from(transactions)
    .where(and(...conditions))
    .orderBy(transactions.transactionDate)
  
  return { candidates, transferCategories }
}

async function fixTransferTransactions(transactionIds: string[], dryRun: boolean) {
  if (dryRun) {
    console.log(`\n🔎 DRY RUN: Would update ${transactionIds.length} transactions`)
    return
  }
  
  console.log(`\n✏️  Updating ${transactionIds.length} transactions...`)
  
  await db
    .update(transactions)
    .set({ 
      isTransfer: true,
      updatedAt: new Date()
    })
    .where(inArray(transactions.id, transactionIds))
  
  console.log('✅ Transactions updated successfully')
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const userIdArg = args.find(arg => arg.startsWith('--user-id='))
  const userId = userIdArg ? userIdArg.split('=')[1] : undefined
  
  console.log('🚀 Transfer Transaction Fixer\n')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  if (userId) {
    console.log(`User ID: ${userId}`)
  }
  console.log()
  
  const { candidates, transferCategories } = await findTransferCandidates(userId)
  
  if (candidates.length === 0) {
    console.log('✨ No transactions need to be fixed!')
    return
  }
  
  console.log(`\n📊 Found ${candidates.length} transactions that should be marked as transfers:\n`)
  
  // Group by category for display
  const byCategory = new Map<string, typeof candidates>()
  candidates.forEach((t) => {
    const cat = transferCategories.find((c) => c.id === t.categoryId)
    const catName = cat?.name || 'Unknown'
    if (!byCategory.has(catName)) {
      byCategory.set(catName, [])
    }
    byCategory.get(catName)!.push(t)
  })
  
  byCategory.forEach((txs, catName) => {
    console.log(`\n${catName} (${txs.length} transactions):`)
    txs.slice(0, 5).forEach((t) => {
      console.log(`  - ${t.transactionDate.toISOString().split('T')[0]} | $${t.amount} | ${t.description}`)
    })
    if (txs.length > 5) {
      console.log(`  ... and ${txs.length - 5} more`)
    }
  })
  
  console.log('\n' + '='.repeat(70))
  console.log(`Total: ${candidates.length} transactions need isTransfer=true`)
  console.log('='.repeat(70))
  
  if (dryRun) {
    console.log('\n💡 Run without --dry-run to apply changes')
  } else {
    await fixTransferTransactions(candidates.map((t) => t.id), false)
  }
}

main()
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })
