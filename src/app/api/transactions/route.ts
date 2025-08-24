import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { getUserTransactions, createTransaction, updateTransaction, deleteTransaction } from '@/lib/db-utils'

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId') || undefined
    const categoryId = searchParams.get('categoryId') || undefined
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search') || undefined
    const sortBy = (searchParams.get('sortBy') as 'date' | 'amount' | 'description') || 'date'
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'

    const transactions = await getUserTransactions(user.id, {
      accountId,
      categoryId,
      startDate,
      endDate,
      limit,
      offset,
      search,
      sortBy,
      sortOrder
    })

    // Transform for client
    const transformedTransactions = transactions.map(({ transaction, account, category }) => ({
      id: transaction.id,
      description: transaction.description,
      amount: parseFloat(transaction.amount),
      category: category?.name || 'Uncategorized',
      categoryId: category?.id || null,
      date: transaction.transactionDate.toISOString().split('T')[0],
      account: account?.name || 'Unknown Account',
      accountId: account?.id || null,
      type: transaction.type,
      merchant: transaction.merchant,
      reference: transaction.reference,
      receiptNumber: transaction.receiptNumber,
      tags: transaction.tags,
      notes: transaction.notes
    }))

    return NextResponse.json(transformedTransactions)
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      accountId, 
      categoryId, 
      amount, 
      description, 
      merchant, 
      reference, 
      receiptNumber,
      transactionDate, 
      type, 
      tags, 
      notes 
    } = body

    const transaction = await createTransaction({
      userId: user.id,
      accountId,
      categoryId,
      amount: amount.toString(),
      description,
      merchant,
      reference,
      receiptNumber,
      transactionDate: new Date(transactionDate),
      type,
      tags,
      notes
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
    }

    return NextResponse.json({
      id: transaction.id,
      description: transaction.description,
      amount: parseFloat(transaction.amount),
      category: 'Uncategorized', // Will be populated with proper category
      date: transaction.transactionDate.toISOString().split('T')[0],
      account: 'Account', // Will be populated with proper account
      type: transaction.type,
      merchant: transaction.merchant,
      reference: transaction.reference,
      tags: transaction.tags,
      notes: transaction.notes
    })
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
