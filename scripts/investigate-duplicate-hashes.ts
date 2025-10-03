/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Investigate duplicate transaction hashes to understand why duplicates exist
 */

import { db } from '../src/db/index'
import { transactions, accounts } from '../src/db/schema'
import { sql, eq } from 'drizzle-orm'

async function investigateDuplicateHashes() {
  try {
    console.log('🔍 Investigating Duplicate Hash Generation\n')
    
    // Pick one example duplicate and examine it in detail
    const example = await db.execute(sql`
      SELECT 
        t.id,
        t.description,
        t.amount::text,
        t.transaction_date::text as date,
        t.duplicate_check_hash,
        t.account_id,
        a.name as account_name
      FROM transactions t
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE t.description = 'Apple.com/bill Sydney AU'
        AND t.amount = -14.99
        AND t.transaction_date = '2025-09-07'
      ORDER BY t.created_at
    `)
    
    console.log('Example: Apple.com/bill Sydney AU on 2025-09-07 for -14.99\n')
    console.log('Transaction Details:')
    console.log('─'.repeat(100))
    
    example.rows.forEach((row: any, index) => {
      console.log(`\n${index + 1}. Transaction ID: ${row.id}`)
      console.log(`   Account: ${row.account_name} (${row.account_id})`)
      console.log(`   Hash: ${row.duplicate_check_hash}`)
      console.log(`   Date: ${row.date}`)
      console.log(`   Amount: ${row.amount}`)
    })
    
    console.log('\n\n🔑 Hash Generation Logic:')
    console.log('   The hash is generated using: userId + date + description + amount + ACCOUNT')
    console.log('   This means if you import the same transaction to different accounts,')
    console.log('   it will generate DIFFERENT hashes and NOT be detected as a duplicate!')
    
    // Check if duplicates are across different accounts
    const crossAccountDuplicates = await db.execute(sql`
      SELECT 
        description,
        amount::text,
        transaction_date::text as date,
        COUNT(DISTINCT account_id) as account_count,
        COUNT(*) as total_count,
        array_agg(DISTINCT a.name) as accounts
      FROM transactions t
      LEFT JOIN accounts a ON t.account_id = a.id
      GROUP BY description, amount, transaction_date
      HAVING COUNT(*) > 1 AND COUNT(DISTINCT account_id) > 1
      ORDER BY total_count DESC
      LIMIT 10
    `)
    
    console.log('\n\n📊 Cross-Account Duplicates:\n')
    
    if (crossAccountDuplicates.rows.length > 0) {
      console.log('Found transactions duplicated across DIFFERENT accounts:\n')
      crossAccountDuplicates.rows.forEach((row: any, index) => {
        console.log(`${index + 1}. ${row.description.substring(0, 50)}`)
        console.log(`   Date: ${row.date}, Amount: ${row.amount}`)
        console.log(`   Total: ${row.total_count} transactions across ${row.account_count} accounts`)
        console.log(`   Accounts: ${row.accounts.join(', ')}`)
        console.log('')
      })
    } else {
      console.log('No cross-account duplicates found. All duplicates are within the same account.')
    }
    
    // Check if duplicates are within the same account
    const sameAccountDuplicates = await db.execute(sql`
      SELECT 
        description,
        amount::text,
        transaction_date::text as date,
        account_id,
        a.name as account_name,
        COUNT(*) as count
      FROM transactions t
      LEFT JOIN accounts a ON t.account_id = a.id
      GROUP BY description, amount, transaction_date, account_id, a.name
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 10
    `)
    
    console.log('\n📊 Same-Account Duplicates:\n')
    
    if (sameAccountDuplicates.rows.length > 0) {
      console.log('Found transactions duplicated within the SAME account:\n')
      sameAccountDuplicates.rows.forEach((row: any, index) => {
        console.log(`${index + 1}. ${row.description.substring(0, 50)}`)
        console.log(`   Account: ${row.account_name}`)
        console.log(`   Date: ${row.date}, Amount: ${row.amount}`)
        console.log(`   Count: ${row.count} duplicates`)
        console.log('')
      })
    } else {
      console.log('No same-account duplicates found.')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    process.exit(0)
  }
}

investigateDuplicateHashes()
