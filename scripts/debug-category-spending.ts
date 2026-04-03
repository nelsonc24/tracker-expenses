#!/usr/bin/env node
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'
import { sql, eq, and, isNotNull } from 'drizzle-orm'
import { transactions, categories } from '../src/db/schema'

config({ path: '.env.local' })

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

const client = neon(process.env.DATABASE_URL)
const db = drizzle(client)

async function main() {
  console.log('=== Transaction type breakdown ===\n')

  // Overall breakdown by type
  const typeCounts = await db.execute(sql`
    SELECT type, is_transfer, count(*) as cnt
    FROM transactions
    GROUP BY type, is_transfer
    ORDER BY type, is_transfer
  `)
  console.log('type | is_transfer | count')
  typeCounts.rows.forEach((r: any) => console.log(`${r.type} | ${r.is_transfer} | ${r.cnt}`))

  console.log('\n=== Category spending (category-spending API filter: debit + not transfer) ===\n')

  // Exactly what getCategorySpending does
  const spendingRows = await db.execute(sql`
    SELECT c.name, c.color, abs(sum(t.amount)) as total, count(*) as txn_count
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.is_transfer = false AND t.type = 'debit'
    GROUP BY c.name, c.color
    ORDER BY total DESC
    LIMIT 15
  `)
  console.log('category | total | txn_count')
  spendingRows.rows.forEach((r: any) => console.log(`${r.name || 'Uncategorized'} | $${parseFloat(r.total).toFixed(2)} | ${r.txn_count}`))

  console.log('\n=== Same query WITHOUT the type=debit filter ===\n')

  const allRows = await db.execute(sql`
    SELECT c.name, abs(sum(t.amount)) as total, count(*) as txn_count,
           array_agg(DISTINCT t.type) as types
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.is_transfer = false
    GROUP BY c.name
    ORDER BY total DESC
    LIMIT 15
  `)
  console.log('category | total | txn_count | types')
  allRows.rows.forEach((r: any) => console.log(`${r.name || 'Uncategorized'} | $${parseFloat(r.total).toFixed(2)} | ${r.txn_count} | ${r.types}`))
}

main().catch(console.error)
