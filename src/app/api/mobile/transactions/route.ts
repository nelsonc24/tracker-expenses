import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserTransactions, createTransaction } from '@/lib/db-utils'
import { z } from 'zod'

const createTransactionSchema = z.object({
  accountId: z.string().uuid('Invalid account ID'),
  categoryId: z.string().uuid().optional(),
  amount: z.string().regex(/^-?\d+\.?\d{0,2}$/, 'Invalid amount format'),
  description: z.string().min(1, 'Description is required'),
  merchant: z.string().optional(),
  transactionDate: z.string().datetime({ offset: true }).or(z.string().date()),
  type: z.enum(['debit', 'credit', 'transfer']),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isTransfer: z.boolean().default(false),
})

// GET /api/mobile/transactions
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId') || undefined
    const categoryId = searchParams.get('categoryId') || undefined
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)
    const search = searchParams.get('search') || undefined

    const results = await getUserTransactions(userId, {
      accountId,
      categoryId,
      startDate,
      endDate,
      limit,
      offset,
      search,
      sortBy: 'date',
      sortOrder: 'desc',
    })

    const formatted = results.map(({ transaction, account, category }) => ({
      id: transaction.id,
      description: transaction.description,
      amount: parseFloat(transaction.amount),
      type: transaction.type,
      date: transaction.transactionDate instanceof Date
        ? transaction.transactionDate.toISOString().split('T')[0]
        : transaction.transactionDate,
      account: account?.name ?? 'Unknown Account',
      accountId: account?.id ?? null,
      category: category?.name ?? 'Uncategorized',
      categoryId: category?.id ?? null,
      categoryColor: category?.color ?? null,
      categoryIcon: category?.icon ?? null,
      merchant: transaction.merchant ?? null,
      reference: transaction.reference ?? null,
      notes: transaction.notes ?? null,
      tags: transaction.tags ?? [],
      isTransfer: transaction.isTransfer ?? false,
      transferPairId: transaction.transferPairId ?? null,
    }))

    return NextResponse.json({
      data: formatted,
      pagination: {
        limit,
        offset,
        hasMore: formatted.length === limit,
      },
    })
  } catch (error) {
    console.error('[Mobile Transactions GET Error]:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}

// POST /api/mobile/transactions
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = createTransactionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const data = validation.data
    const transaction = await createTransaction({
      userId,
      accountId: data.accountId,
      categoryId: data.categoryId,
      amount: data.amount,
      description: data.description,
      merchant: data.merchant,
      transactionDate: new Date(data.transactionDate),
      type: data.type,
      notes: data.notes,
      tags: data.tags,
      isTransfer: data.isTransfer,
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
    }

    return NextResponse.json(
      {
        id: transaction.id,
        description: transaction.description,
        amount: parseFloat(transaction.amount),
        type: transaction.type,
        date: transaction.transactionDate instanceof Date
          ? transaction.transactionDate.toISOString().split('T')[0]
          : transaction.transactionDate,
        accountId: transaction.accountId,
        categoryId: transaction.categoryId ?? null,
        notes: transaction.notes ?? null,
        tags: transaction.tags ?? [],
        isTransfer: transaction.isTransfer ?? false,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Mobile Transactions POST Error]:', error)
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
  }
}
