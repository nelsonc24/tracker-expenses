import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import crypto from 'crypto'
import { db } from '@/db'
import { transactions as transactionsTable, accounts as accountsTable, categories as categoriesTable } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

// Types for transaction processing
interface TransactionData {
  date: string
  description: string
  amount: number
  category: string
  account: string
  merchant?: string
  reference?: string
  balance?: number
  receiptNumber?: string  // Added receipt number field
  transactionId?: string  // Added bank transaction ID
}

// Generate a consistent hash for duplicate detection
function generateTransactionHash(tx: TransactionData, userId: string): string {
  // Use transaction ID as primary identifier if available, otherwise fall back to composite hash
  if (tx.transactionId) {
    return crypto.createHash('sha256').update(`${userId}-${tx.transactionId}`).digest('hex').substring(0, 16)
  }
  
  // Fallback to composite hash for banks that don't provide unique transaction IDs
  const hashInput = `${userId}-${tx.date}-${tx.description}-${tx.amount}-${tx.account}`
  return crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 16)
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { transactions: transactionData, uploadId, accountId } = body

    // Validate request data
    if (!transactionData || !Array.isArray(transactionData)) {
      return NextResponse.json({ error: 'Invalid transactions data' }, { status: 400 })
    }

    // Validate account selection
    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 })
    }

    // Verify the account belongs to the user
    const userAccount = await db
      .select()
      .from(accountsTable)
      .where(and(eq(accountsTable.id, accountId), eq(accountsTable.userId, userId)))
      .limit(1)

    if (userAccount.length === 0) {
      return NextResponse.json({ error: 'Invalid account or account does not belong to user' }, { status: 403 })
    }

    // Get existing transaction hashes from database to check for duplicates
    const existingHashes = await db
      .select({ hash: transactionsTable.duplicateCheckHash })
      .from(transactionsTable)
      .where(eq(transactionsTable.userId, userId))
    
    const existingTransactionHashes = new Set<string>(
      existingHashes.map(row => row.hash).filter((hash): hash is string => Boolean(hash))
    )

    // Get or create default category for imports (we still need this for categorization)
    const defaultCategory = await getOrCreateDefaultCategory(userId)

    // Process transactions and check for duplicates
    const newTransactions: any[] = []
    const duplicateTransactions: any[] = []

    for (const tx of transactionData) {
      const transactionHash = generateTransactionHash(tx, userId)
      
      if (existingTransactionHashes.has(transactionHash)) {
        duplicateTransactions.push({
          ...tx,
          hash: transactionHash,
          reason: 'Duplicate transaction already exists'
        })
      } else {
        newTransactions.push({
          id: crypto.randomUUID(),
          userId,
          accountId: accountId, // Use the selected account ID
          categoryId: defaultCategory.id,
          amount: parseFloat(tx.amount.toString()).toFixed(2),
          description: tx.description.trim(),
          merchant: tx.merchant || extractMerchant(tx.description),
          reference: tx.reference || null,
          receiptNumber: tx.receiptNumber || null,
          transactionDate: new Date(tx.date),
          type: parseFloat(tx.amount.toString()) < 0 ? 'debit' : 'credit',
          status: 'cleared',
          duplicateCheckHash: transactionHash,
          originalData: tx,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        
        // Add to existing set to prevent duplicates within the same batch
        existingTransactionHashes.add(transactionHash)
      }
    }

    // Save transactions to database
    if (newTransactions.length > 0) {
      await db.insert(transactionsTable).values(newTransactions)
    }
    
    // For now, simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500))

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${newTransactions.length} transactions${duplicateTransactions.length > 0 ? `, skipped ${duplicateTransactions.length} duplicates` : ''}`,
      importedCount: newTransactions.length,
      skippedCount: duplicateTransactions.length,
      totalProcessed: transactionData.length,
      newTransactions,
      duplicateTransactions: duplicateTransactions.map(tx => ({
        description: tx.description,
        date: tx.date,
        amount: tx.amount,
        reason: tx.reason
      }))
    })

  } catch (error) {
    console.error('Transaction import error:', error)
    return NextResponse.json(
      { error: 'Failed to import transactions' }, 
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const uploadId = searchParams.get('uploadId')

    // TODO: In Phase 4B, replace with actual database query
    // const uploads = await db.select().from(csvUploads).where(eq(csvUploads.userId, userId))
    
    // For now, return mock data
    const mockUploads = [
      {
        id: 'upload_1',
        filename: 'bank_statements_june.csv',
        uploadDate: new Date('2024-06-01'),
        status: 'completed',
        totalRows: 150,
        validRows: 148,
        errorRows: 2,
        importedRows: 148
      },
      {
        id: 'upload_2', 
        filename: 'bank_statements_may.csv',
        uploadDate: new Date('2024-05-01'),
        status: 'completed',
        totalRows: 132,
        validRows: 132,
        errorRows: 0,
        importedRows: 132
      }
    ]

    return NextResponse.json({
      uploads: uploadId 
        ? mockUploads.filter(upload => upload.id === uploadId)
        : mockUploads
    })

  } catch (error) {
    console.error('Upload history fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch upload history' }, 
      { status: 500 }
    )
  }
}

// Helper functions to get or create default account and category
async function getOrCreateDefaultAccount(userId: string) {
  // Try to get existing account
  const existingAccounts = await db.select().from(accountsTable).where(eq(accountsTable.userId, userId)).limit(1)
  
  if (existingAccounts.length === 0) {
    // Create default account
    const insertedAccounts = await db.insert(accountsTable).values({
      userId,
      name: 'Primary Account',
      institution: 'Imported Data',
      accountNumber: 'IMPORTED',
      accountType: 'checking',
      balance: '0.00',
      currency: 'AUD',
      isActive: true
    }).returning()
    
    return (insertedAccounts as any[])[0]
  }
  
  return existingAccounts[0]
}

async function getOrCreateDefaultCategory(userId: string) {
  // Try to get existing category
  const existingCategories = await db.select().from(categoriesTable).where(eq(categoriesTable.userId, userId)).limit(1)
  
  if (existingCategories.length === 0) {
    // Create default category
    const insertedCategories = await db.insert(categoriesTable).values({
      userId,
      name: 'General',
      color: '#6B7280',
      icon: '💳',
      isDefault: true
    }).returning()
    
    return (insertedCategories as any[])[0]
  }
  
  return existingCategories[0]
}

// Helper function to extract merchant name from description
function extractMerchant(description: string): string {
  // Remove common transaction prefixes and clean up
  const cleaned = description
    .replace(/^(EFTPOS|CARD|ATM|TRANSFER|DIRECT DEBIT|DD)\s*/i, '')
    .replace(/\s+\d{2}\/\d{2}.*$/, '') // Remove dates at the end
    .replace(/\s+\d{4}.*$/, '') // Remove years at the end
    .replace(/\s+AUS.*$/, '') // Remove country codes
    .trim()
  
  // Take first few words as merchant name
  return cleaned.split(' ').slice(0, 3).join(' ') || 'Unknown Merchant'
}
