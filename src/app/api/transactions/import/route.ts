import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

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
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { transactions, uploadId } = body

    // Validate request data
    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json({ error: 'Invalid transactions data' }, { status: 400 })
    }

    // Process transactions (in a real app, this would use Drizzle ORM)
    const processedTransactions = transactions.map((tx: TransactionData) => ({
      id: Math.random().toString(36).substr(2, 9),
      userId,
      uploadId,
      date: new Date(tx.date),
      description: tx.description.trim(),
      amount: parseFloat(tx.amount.toString()),
      category: tx.category,
      account: tx.account,
      merchant: tx.merchant || extractMerchant(tx.description),
      reference: tx.reference || null,
      balance: tx.balance ? parseFloat(tx.balance.toString()) : null,
      createdAt: new Date(),
      updatedAt: new Date()
    }))

    // TODO: In Phase 4B, replace with actual database operations using Drizzle ORM
    // await db.insert(transactions).values(processedTransactions)
    
    // For now, simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000))

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${processedTransactions.length} transactions`,
      importedCount: processedTransactions.length,
      transactions: processedTransactions
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
