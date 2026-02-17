#!/usr/bin/env node
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'
import { sql, count, desc, eq, isNotNull, and } from 'drizzle-orm'
import { transactions, categories } from '../src/db/schema'

// Load environment variables
config({ path: '.env.local' })

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set in environment variables')
  process.exit(1)
}

const client = neon(process.env.DATABASE_URL)
const db = drizzle(client)

async function analyzeUncategorizedTransactions() {
  console.log('🔍 Analyzing uncategorized transactions for pattern improvement...\n')

  try {
    // Get uncategorized transactions
    const uncategorizedTransactions = await db
      .select({
        description: transactions.description,
        merchant: transactions.merchant,
        amount: transactions.amount,
        transactionCount: count()
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(eq(categories.name, 'Uncategorized'))
      .groupBy(transactions.description, transactions.merchant, transactions.amount)
      .orderBy(desc(count()))
      .limit(50)

    console.log('📝 Most frequent uncategorized transaction patterns:')
    console.log('(These could be added to the categorization logic)\n')

    uncategorizedTransactions.forEach((tx, index) => {
      const amount = parseFloat(tx.amount)
      const amountStr = amount < 0 ? `-$${Math.abs(amount).toFixed(2)}` : `$${amount.toFixed(2)}`
      console.log(`${index + 1}. "${tx.description.substring(0, 60)}..." - ${tx.merchant} - ${tx.transactionCount} transactions - ${amountStr}`)
    })

    // Analyze patterns that could be improved
    console.log('\n💡 Suggested improvements to categorization logic:')
    
    const patterns = [
      { pattern: 'great holds', category: 'Healthcare', reason: 'Appears to be a medical/dental practice' },
      { pattern: 'epping kebab|gozleme', category: 'Dining Out', reason: 'Restaurant/food service' },
      { pattern: 'carwash|car wash', category: 'Transport', reason: 'Vehicle maintenance' },
      { pattern: 'salsa foundation', category: 'Entertainment', reason: 'Dance/fitness classes' },
      { pattern: 'laundromat|laundry', category: 'Housing & Utilities', reason: 'Household services' },
      { pattern: 'post office|australia post', category: 'Fees & Services', reason: 'Postal/shipping services' },
      { pattern: 'petrol|fuel|service station', category: 'Transport', reason: 'Vehicle fuel' },
      { pattern: 'chemist|pharmacy', category: 'Healthcare', reason: 'Medication/health products' }
    ]

    patterns.forEach(({ pattern, category, reason }) => {
      console.log(`   Add "${pattern}" → ${category} (${reason})`)
    })

    // Get category statistics for better insights
    console.log('\n📊 Current category distribution insights:')
    const categoryStats = await db
      .select({
        categoryName: categories.name,
        transactionCount: count(),
        spendAmount: sql<number>`sum(CASE WHEN ${transactions.amount} < 0 THEN ${transactions.amount} ELSE 0 END)`,
        incomeAmount: sql<number>`sum(CASE WHEN ${transactions.amount} > 0 THEN ${transactions.amount} ELSE 0 END)`
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(isNotNull(categories.name))
      .groupBy(categories.name)
      .orderBy(desc(count()))

    categoryStats.forEach(stat => {
      const spend = parseFloat(stat.spendAmount?.toString() || '0')
      const income = parseFloat(stat.incomeAmount?.toString() || '0')
      console.log(`   ${stat.categoryName}: ${stat.transactionCount} transactions, Spend: $${spend.toFixed(2)}, Income: $${income.toFixed(2)}`)
    })

  } catch (error) {
    console.error('❌ Error analyzing uncategorized transactions:', error)
    process.exit(1)
  }
}

// Run the analysis
analyzeUncategorizedTransactions()