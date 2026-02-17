#!/usr/bin/env node
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'
import { sql, count, desc, eq, isNotNull } from 'drizzle-orm'
import { transactions, categories } from '../src/db/schema'

// Load environment variables
config({ path: '.env.local' })

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set in environment variables')
  process.exit(1)
}

const client = neon(process.env.DATABASE_URL)
const db = drizzle(client)

async function analyzeTransactionCategories() {
  console.log('🔍 Analyzing transaction categories and merchants...\n')

  try {
    // Get total transaction count
    const [{ totalTransactions }] = await db
      .select({ totalTransactions: count() })
      .from(transactions)

    console.log(`📊 Total transactions: ${totalTransactions}\n`)

    // Get most frequent categories (by category name from joined table)
    console.log('🏷️  Most frequent categories:')
    const frequentCategories = await db
      .select({
        categoryName: categories.name,
        categoryColor: categories.color,
        categoryIcon: categories.icon,
        transactionCount: count(),
        percentage: sql<number>`round((count(*)::decimal / ${totalTransactions} * 100), 2)`
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(isNotNull(categories.name))
      .groupBy(categories.name, categories.color, categories.icon)
      .orderBy(desc(count()))
      .limit(15)

    frequentCategories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.categoryName} - ${cat.transactionCount} transactions (${cat.percentage}%)`)
    })

    // Get uncategorized transactions
    const [{ uncategorizedCount }] = await db
      .select({ uncategorizedCount: count() })
      .from(transactions)
      .where(sql`category_id IS NULL`)

    console.log(`\n❌ Uncategorized transactions: ${uncategorizedCount} (${((uncategorizedCount / totalTransactions) * 100).toFixed(2)}%)\n`)

    // Get most frequent merchants
    console.log('🏪 Most frequent merchants:')
    const frequentMerchants = await db
      .select({
        merchant: transactions.merchant,
        transactionCount: count(),
        categoryName: categories.name,
        avgAmount: sql<number>`round(avg(${transactions.amount})::decimal, 2)`
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(isNotNull(transactions.merchant))
      .groupBy(transactions.merchant, categories.name)
      .orderBy(desc(count()))
      .limit(20)

    frequentMerchants.forEach((merchant, index) => {
      console.log(`${index + 1}. ${merchant.merchant} - ${merchant.transactionCount} transactions (${merchant.categoryName || 'Uncategorized'}) - Avg: $${merchant.avgAmount}`)
    })

    // Get most frequent transaction descriptions for pattern analysis
    console.log('\n📝 Most frequent transaction descriptions:')
    const frequentDescriptions = await db
      .select({
        description: transactions.description,
        transactionCount: count(),
        categoryName: categories.name,
        avgAmount: sql<number>`round(avg(${transactions.amount})::decimal, 2)`
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .groupBy(transactions.description, categories.name)
      .orderBy(desc(count()))
      .limit(25)

    frequentDescriptions.forEach((desc, index) => {
      console.log(`${index + 1}. "${desc.description.substring(0, 60)}..." - ${desc.transactionCount} transactions (${desc.categoryName || 'Uncategorized'}) - Avg: $${desc.avgAmount}`)
    })

    // Analyze transaction amounts by category
    console.log('\n💰 Average transaction amounts by category:')
    const categoryAmounts = await db
      .select({
        categoryName: categories.name,
        transactionCount: count(),
        avgAmount: sql<number>`round(avg(${transactions.amount})::decimal, 2)`,
        totalAmount: sql<number>`round(sum(${transactions.amount})::decimal, 2)`
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(isNotNull(categories.name))
      .groupBy(categories.name)
      .orderBy(desc(sql`sum(${transactions.amount})`))
      .limit(10)

    categoryAmounts.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.categoryName} - ${cat.transactionCount} transactions, Avg: $${cat.avgAmount}, Total: $${cat.totalAmount}`)
    })

  } catch (error) {
    console.error('❌ Error analyzing transactions:', error)
    process.exit(1)
  }
}

// Run the analysis
analyzeTransactionCategories()