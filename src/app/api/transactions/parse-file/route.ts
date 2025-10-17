import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { parseCreditCardPDF, creditCardStatementToTransactions } from '@/lib/pdf-processing'

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

    let transactions: Array<{
      date: string
      description: string
      amount: number
      category: string
      account: string
      type: 'debit' | 'credit'
    }> = []

    // Handle different file types
    if (fileType === 'pdf' || file.name.endsWith('.pdf')) {
      // Parse PDF file
      const arrayBuffer = await file.arrayBuffer()
      const statement = await parseCreditCardPDF(arrayBuffer)
      transactions = creditCardStatementToTransactions(statement, accountId)

      return NextResponse.json({
        success: true,
        message: 'PDF parsed successfully',
        transactions,
        metadata: {
          statementDate: statement.statementDate,
          accountNumber: statement.accountNumber,
          openingBalance: statement.openingBalance,
          closingBalance: statement.closingBalance,
          creditLimit: statement.creditLimit,
          availableCredit: statement.availableCredit,
          minimumPayment: statement.minimumPayment,
          dueDate: statement.dueDate
        }
      })
    } else if (fileType === 'json' || file.name.endsWith('.json')) {
      // Parse JSON file
      const text = await file.text()
      const data = JSON.parse(text)

      // Validate JSON structure
      if (!Array.isArray(data) && !data.transactions) {
        return NextResponse.json(
          { error: 'Invalid JSON format. Expected an array of transactions or an object with a transactions array.' },
          { status: 400 }
        )
      }

      const transactionsArray = Array.isArray(data) ? data : data.transactions

      // Map JSON to transaction format
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transactions = transactionsArray.map((t: any) => ({
        date: t.date || t.transaction_date || t.transactionDate,
        description: t.description || t.merchant || t.name,
        amount: parseFloat(t.amount),
        category: t.category || 'Uncategorized',
        account: accountId,
        type: (parseFloat(t.amount) >= 0 ? 'credit' : 'debit') as 'debit' | 'credit'
      }))

      return NextResponse.json({
        success: true,
        message: 'JSON parsed successfully',
        transactions
      })
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a PDF, CSV, or JSON file.' },
        { status: 400 }
      )
    }
  } catch (error) {
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
