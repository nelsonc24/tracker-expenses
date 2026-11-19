import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { importTransactions, IngestError } from '@/lib/ingest'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { transactions: transactionData, accountId, fileName, fileSize, fileType, bankFormat } = body

    // Validate request data
    if (!transactionData || !Array.isArray(transactionData)) {
      return NextResponse.json({ error: 'Invalid transactions data' }, { status: 400 })
    }

    // Validate account selection
    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 })
    }

    const result = await importTransactions({
      userId,
      accountId,
      source: 'upload',
      file: {
        fileName: typeof fileName === 'string' && fileName ? fileName : 'Manual upload',
        fileSize: typeof fileSize === 'number' ? fileSize : 0,
        fileType: typeof fileType === 'string' && fileType ? fileType : 'csv',
        bankFormat: typeof bankFormat === 'string' ? bankFormat : null,
      },
      transactions: transactionData,
    })

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${result.inserted} transactions${result.duplicates > 0 ? `, skipped ${result.duplicates} duplicates` : ''}`,
      importedCount: result.inserted,
      skippedCount: result.duplicates,
      totalProcessed: result.totalProcessed,
      sessionId: result.sessionId,
      newTransactions: result.insertedRows,
      duplicateTransactions: result.skipped,
    })

  } catch (error) {
    if (error instanceof IngestError && error.code === 'invalid_account') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
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
