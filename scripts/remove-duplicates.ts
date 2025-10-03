/**
 * Remove duplicate transactions from the database
 * Keeps the earliest created transaction and removes later duplicates
 */

import { db } from '../src/db/index'
import { transactions } from '../src/db/schema'
import { sql, inArray } from 'drizzle-orm'

async function removeDuplicates() {
  try {
    console.log('🧹 Removing Duplicate Transactions\n')
    
    // Find duplicate groups (same date, description, amount, account)
    const duplicates = await db.execute(sql`
      WITH duplicate_groups AS (
        SELECT 
          transaction_date,
          description,
          amount,
          account_id,
          array_agg(id ORDER BY created_at) as ids,
          array_agg(created_at ORDER BY created_at) as created_dates,
          COUNT(*) as count
        FROM transactions
        GROUP BY transaction_date, description, amount, account_id
        HAVING COUNT(*) > 1
      )
      SELECT 
        ids,
        created_dates,
        count,
        ids[1] as keep_id,
        ids[2:array_length(ids, 1)] as delete_ids
      FROM duplicate_groups
      ORDER BY count DESC
    `)
    
    console.log(`Found ${duplicates.rows.length} duplicate groups\n`)
    
    if (duplicates.rows.length === 0) {
      console.log('✅ No duplicates found!')
      return
    }
    
    let totalToDelete = 0
    const idsToDelete: string[] = []
    
    duplicates.rows.forEach((row: any, index) => {
      const deleteIds = row.delete_ids
      if (deleteIds && deleteIds.length > 0) {
        totalToDelete += deleteIds.length
        idsToDelete.push(...deleteIds)
        
        if (index < 10) { // Show first 10 examples
          console.log(`${index + 1}. Duplicate group with ${row.count} transactions`)
          console.log(`   Keeping: ${row.keep_id} (created: ${row.created_dates[0]})`)
          console.log(`   Deleting: ${deleteIds.length} duplicate(s)`)
        }
      }
    })
    
    console.log(`\n📊 Summary:`)
    console.log(`   Total duplicate groups: ${duplicates.rows.length}`)
    console.log(`   Total transactions to delete: ${totalToDelete}`)
    console.log(`   Transactions to keep: ${duplicates.rows.length}`)
    
    // Ask for confirmation (in production, you might want to require explicit confirmation)
    console.log(`\n⚠️  About to delete ${totalToDelete} duplicate transactions...`)
    
    if (idsToDelete.length > 0) {
      // Delete the duplicates
      const deleteResult = await db
        .delete(transactions)
        .where(inArray(transactions.id, idsToDelete))
      
      console.log(`\n✅ Successfully deleted ${totalToDelete} duplicate transactions!`)
      console.log(`   Kept ${duplicates.rows.length} original transactions.`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    process.exit(0)
  }
}

removeDuplicates()
