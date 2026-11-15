import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { IngestError, drizzleStore, parseUploadedFile } from '@/lib/ingest'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const accountId = formData.get('accountId') as string
    const fileType = formData.get('fileType') as string // 'pdf', 'csv', or 'json'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 })
    }

    const parsed = await parseUploadedFile({
      fileName: file.name,
      mimeType: file.type,
      fileType: fileType || undefined,
      buffer: await file.arrayBuffer(),
      accountId,
      aiConfig: () => drizzleStore.getGeminiConfig(userId),
    })

    return NextResponse.json({
      success: true,
      message: `${parsed.kind.toUpperCase()} parsed successfully`,
      transactions: parsed.transactions,
      parsedBy: parsed.parsedBy,
      balanceCheck: parsed.balanceCheck,
      ...(parsed.metadata ? { metadata: parsed.metadata } : {}),
    })
  } catch (error) {
    if (error instanceof IngestError && (error.code === 'unsupported_file' || error.code === 'invalid_input')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof IngestError && error.code === 'parse_failed') {
      return NextResponse.json({ error: 'Failed to parse file', details: error.message }, { status: 422 })
    }
    console.error('Error parsing file:', error)
    return NextResponse.json(
      { 
        error: 'Failed to parse file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
