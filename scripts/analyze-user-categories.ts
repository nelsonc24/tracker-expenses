#!/usr/bin/env node
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'
import { sql, count, desc, eq, isNotNull, ne } from 'drizzle-orm'
import { transactions, categories } from '../src/db/schema'

// Load environment variables
config({ path: '.env.local' })

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set in environment variables')
  process.exit(1)
}

const client = neon(process.env.DATABASE_URL)
const db = drizzle(client)

async function analyzeUserCategories() {
  console.log('🔍 Analyzing user categorization patterns...\n')

  try {
    // Get all categories (excluding Income)
    const userCategories = await db
      .select({
        id: categories.id,
        name: categories.name,
        color: categories.color,
        icon: categories.icon,
        transactionCount: count(transactions.id)
      })
      .from(categories)
      .leftJoin(transactions, eq(categories.id, transactions.categoryId))
      .where(ne(categories.name, 'Income'))
      .groupBy(categories.id, categories.name, categories.color, categories.icon)
      .orderBy(desc(count(transactions.id)))

    console.log('📊 User Categories (excluding Income):')
    userCategories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.name} (${cat.color}, ${cat.icon}) - ${cat.transactionCount} transactions`)
    })

    // Get detailed transaction patterns for each category
    console.log('\n🏷️  Transaction patterns by category:')
    
    for (const category of userCategories.filter(c => c.transactionCount > 0)) {
      console.log(`\n--- ${category.name.toUpperCase()} ---`)
      
      const categoryTransactions = await db
        .select({
          description: transactions.description,
          merchant: transactions.merchant,
          amount: transactions.amount,
          transactionCount: count()
        })
        .from(transactions)
        .where(eq(transactions.categoryId, category.id))
        .groupBy(transactions.description, transactions.merchant, transactions.amount)
        .orderBy(desc(count()))
        .limit(10)

      categoryTransactions.forEach((tx, idx) => {
        const amount = parseFloat(tx.amount)
        const amountStr = amount < 0 ? `-$${Math.abs(amount).toFixed(2)}` : `$${amount.toFixed(2)}`
        console.log(`  ${idx + 1}. "${tx.description.substring(0, 50)}..." | ${tx.merchant} | ${amountStr} | ${tx.transactionCount}x`)
      })
      
      // Extract merchant patterns
      const merchantPatterns = await db
        .select({
          merchant: transactions.merchant,
          transactionCount: count()
        })
        .from(transactions)
        .where(eq(transactions.categoryId, category.id))
        .groupBy(transactions.merchant)
        .orderBy(desc(count()))
        .limit(5)

      console.log(`  Top merchants: ${merchantPatterns.map(m => `${m.merchant} (${m.transactionCount}x)`).join(', ')}`)
    }

    // Look for specific patterns that could improve categorization
    console.log('\n💡 Suggested categorization improvements:')
    
    // Find Costco transactions
    const costcoTransactions = await db
      .select({
        description: transactions.description,
        merchant: transactions.merchant,
        categoryName: categories.name,
        transactionCount: count()
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(sql`lower(${transactions.description}) LIKE '%costco%' OR lower(${transactions.merchant}) LIKE '%costco%'`)
      .groupBy(transactions.description, transactions.merchant, categories.name)
      .orderBy(desc(count()))

    if (costcoTransactions.length > 0) {
      console.log('\n🛒 Costco transactions found:')
      costcoTransactions.forEach(tx => {
        console.log(`   "${tx.description}" -> Currently: ${tx.categoryName} (${tx.transactionCount}x)`)
      })
    }

    // Find frequent merchants that might need better categorization
    const frequentMerchants = await db
      .select({
        merchant: transactions.merchant,
        categoryName: categories.name,
        description: sql<string>`string_agg(DISTINCT substring(${transactions.description}, 1, 30), ', ')`,
        transactionCount: count()
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(isNotNull(transactions.merchant))
      .groupBy(transactions.merchant, categories.name)
      .having(sql`count(*) > 2`)
      .orderBy(desc(count()))
      .limit(20)

    console.log('\n🏪 Frequent merchants and their categories:')
    frequentMerchants.forEach(merchant => {
      console.log(`   ${merchant.merchant} -> ${merchant.categoryName} (${merchant.transactionCount}x)`)
      console.log(`      Sample: ${merchant.description}`)
    })

  } catch (error) {
    console.error('❌ Error analyzing user categories:', error)
    process.exit(1)
  }
}

analyzeUserCategories()