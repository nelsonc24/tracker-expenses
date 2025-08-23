import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/db'
import { transactions } from '@/db/schema'
import { eq, count } from 'drizzle-orm'

export async function DELETE(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`Clearing all transactions for user: ${user.id}`)
    
    // First, count how many transactions exist
    const countResult = await db
      .select({ count: count() })
      .from(transactions)
      .where(eq(transactions.userId, user.id))
    
    const existingCount = countResult[0]?.count || 0
    console.log(`Found ${existingCount} transactions to delete for user: ${user.id}`)
    
    if (existingCount === 0) {
      console.log(`No transactions found for user: ${user.id}`)
      return NextResponse.json({ 
        success: true, 
        message: 'No transactions to clear.',
        deletedCount: 0
      })
    }
    
    // Delete all transactions for the user
    const result = await db
      .delete(transactions)
      .where(eq(transactions.userId, user.id))
    
    console.log(`Delete operation completed for user: ${user.id}`)
    
    // Verify deletion by counting remaining transactions
    const remainingCountResult = await db
      .select({ count: count() })
      .from(transactions)
      .where(eq(transactions.userId, user.id))
    
    const remainingCount = remainingCountResult[0]?.count || 0
    console.log(`Remaining transactions after deletion: ${remainingCount}`)

    return NextResponse.json({ 
      success: true, 
      message: `All transaction data has been cleared successfully. Deleted ${existingCount} transactions.`,
      deletedCount: existingCount
    })
  } catch (error) {
    console.error('Error clearing transaction data:', error)
    return NextResponse.json({ 
      error: 'Failed to clear transaction data' 
    }, { status: 500 })
  }
}
