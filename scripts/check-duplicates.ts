/**
 * Check for duplicate transactions in the database
 */

import { db } from '../src/db/index'
import { transactions } from '../src/db/schema'
import { sql } from 'drizzle-orm'

async function checkDuplicates() {
  try {
    console.log('🔍 Checking for Duplicate Transactions\n')
    
    // Find transactions with the same hash
    const duplicatesByHash = await db.execute(sql`
      SELECT 
        duplicate_check_hash,
        COUNT(*) as count,
        array_agg(id) as transaction_ids,
        array_agg(description) as descriptions,
        array_agg(amount::text) as amounts,
        array_agg(transaction_date::text) as dates
      FROM transactions
      WHERE duplicate_check_hash IS NOT NULL
      GROUP BY duplicate_check_hash
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 20
    `)
    
    console.log(`Found ${duplicatesByHash.rows.length} duplicate hash groups\n`)
    
    if (duplicatesByHash.rows.length > 0) {
      duplicatesByHash.rows.forEach((row: any, index) => {
        console.log(`\n${index + 1}. Hash: ${row.duplicate_check_hash}`)
        console.log(`   Count: ${row.count} duplicates`)
        console.log(`   IDs: ${row.transaction_ids.slice(0, 3).join(', ')}...`)
        console.log(`   Description: ${row.descriptions[0]}`)
        console.log(`   Amount: ${row.amounts[0]}`)
        console.log(`   Dates: ${row.dates.slice(0, 3).join(', ')}`)
      })
    }
    
    // Also check for transactions with same date, description, and amount but different hashes
    const semanticDuplicates = await db.execute(sql`
      SELECT 
        transaction_date::text as date,
        description,
        amount::text,
        COUNT(*) as count,
        array_agg(id) as transaction_ids,
        array_agg(duplicate_check_hash) as hashes
      FROM transactions
      GROUP BY transaction_date, description, amount
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 20
    `)
    
    console.log(`\n\n📊 Found ${semanticDuplicates.rows.length} semantic duplicate groups (same date/desc/amount)\n`)
    
    if (semanticDuplicates.rows.length > 0) {
      semanticDuplicates.rows.forEach((row: any, index) => {
        console.log(`\n${index + 1}. ${row.description.substring(0, 50)}`)
        console.log(`   Date: ${row.date}`)
        console.log(`   Amount: ${row.amount}`)
        console.log(`   Count: ${row.count} instances`)
        console.log(`   Hashes: ${row.hashes.slice(0, 3).join(', ')}`)
      })
    }
    
    // Check transactions with NULL hash
    const nullHashCount = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM transactions
      WHERE duplicate_check_hash IS NULL
    `)
    
    console.log(`\n\n⚠️  Transactions with NULL hash: ${nullHashCount.rows[0].count}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    process.exit(0)
  }
}

checkDuplicates()
