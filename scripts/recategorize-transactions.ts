#!/usr/bin/env node
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'
import { transactions, categories as categoriesTable } from '../src/db/schema'
import { categorizeTransaction, extractMerchant, isTransferTransaction } from '../src/lib/csv-processing'
import { eq, sql } from 'drizzle-orm'

// Load environment variables
config({ path: '.env.local' })

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set in environment variables')
  process.exit(1)
}

const client = neon(process.env.DATABASE_URL)
const db = drizzle(client)

async function recategorizeTransactions() {
  try {
    console.log('🔄 Recategorizing existing transactions...\n')

    // Get all transactions
    const allTransactions = await db
      .select({
        id: transactions.id,
        description: transactions.description,
        merchant: transactions.merchant,
        amount: transactions.amount,
        userId: transactions.userId
      })
      .from(transactions)

    console.log(`📊 Found ${allTransactions.length} transactions to analyze\n`)

    // Get existing categories for each user
    const userCategories = new Map()
    
    // Define default categories that should exist
    const defaultCategories = [
      { name: 'Groceries', color: '#22c55e', icon: 'shopping-cart' },
      { name: 'Dining Out', color: '#f59e0b', icon: 'utensils' },
      { name: 'Transport', color: '#3b82f6', icon: 'car' },
      { name: 'Entertainment', color: '#8b5cf6', icon: 'gamepad-2' },
      { name: 'Healthcare', color: '#ef4444', icon: 'heart-handshake' },
      { name: 'Shopping', color: '#ec4899', icon: 'shopping-bag' },
      { name: 'Housing & Utilities', color: '#06b6d4', icon: 'home' },
      { name: 'Bills & Finance', color: '#64748b', icon: 'receipt' },
      { name: 'Subscriptions', color: '#a855f7', icon: 'calendar' },
      { name: 'Transfers', color: '#10b981', icon: 'arrow-right-left' },
      { name: 'Income', color: '#22c55e', icon: 'trending-up' },
      { name: 'Refunds', color: '#84cc16', icon: 'undo' },
      { name: 'Fees & Services', color: '#f97316', icon: 'credit-card' },
      { name: 'Personal & Family', color: '#f472b6', icon: 'users' },
      { name: 'Uncategorized', color: '#6b7280', icon: 'help-circle' }
    ]

    // Get unique user IDs
    const userIds = [...new Set(allTransactions.map(t => t.userId))]
    
    for (const userId of userIds) {
      // Get existing categories for this user
      const existingCategories = await db
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.userId, userId))

      const existingCategoryNames = new Set(existingCategories.map(c => c.name))
      userCategories.set(userId, new Map(existingCategories.map(c => [c.name, c.id])))

      // Create missing default categories
      for (const defaultCat of defaultCategories) {
        if (!existingCategoryNames.has(defaultCat.name)) {
          console.log(`📝 Creating category: ${defaultCat.name} for user ${userId}`)
          
          const [newCategory] = await db
            .insert(categoriesTable)
            .values({
              userId,
              name: defaultCat.name,
              color: defaultCat.color,
              icon: defaultCat.icon,
              isDefault: true
            })
            .returning({ id: categoriesTable.id })

          userCategories.get(userId)!.set(defaultCat.name, newCategory.id)
        }
      }
    }

    // Track categorization changes
    const changes = {
      total: 0,
      changed: 0,
      unchanged: 0,
      categories: {} as Record<string, number>
    }

    // Recategorize each transaction
    for (const transaction of allTransactions) {
      changes.total++
      
      const description = transaction.description || ''
      const merchant = transaction.merchant || extractMerchant(description)
      const amount = parseFloat(transaction.amount)
      
      // Get new category
      const newCategory = categorizeTransaction(description, merchant, amount)
      const newCategoryId = userCategories.get(transaction.userId)?.get(newCategory)
      
      if (!newCategoryId) {
        console.warn(`⚠️  Category '${newCategory}' not found for user ${transaction.userId}`)
        continue
      }

      // Update transaction with new category
      await db
        .update(transactions)
        .set({ 
          categoryId: newCategoryId,
          merchant: merchant, // Also update merchant if it was extracted
          isTransfer: isTransferTransaction(description)
        })
        .where(eq(transactions.id, transaction.id))

      changes.changed++
      changes.categories[newCategory] = (changes.categories[newCategory] || 0) + 1
    }

    console.log('✅ Recategorization complete!\n')
    console.log('📈 Summary:')
    console.log(`   Total transactions: ${changes.total}`)
    console.log(`   Updated: ${changes.changed}`)
    console.log(`   Unchanged: ${changes.unchanged}`)
    
    console.log('\n🏷️  New category distribution:')
    const sortedCategories = Object.entries(changes.categories)
      .sort(([,a], [,b]) => b - a)
    
    for (const [category, count] of sortedCategories) {
      const percentage = ((count / changes.total) * 100).toFixed(1)
      console.log(`   ${category}: ${count} transactions (${percentage}%)`)
    }

  } catch (error) {
    console.error('❌ Error recategorizing transactions:', error)
    process.exit(1)
  }
}

// Run the recategorization
recategorizeTransactions()