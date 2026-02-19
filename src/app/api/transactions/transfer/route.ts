import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { transactions, accounts } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

const createTransferSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  date: z.string(),
  description: z.string().optional(),
  fromAccountId: z.string().uuid('Invalid source account ID'),
  toAccountId: z.string().uuid('Invalid destination account ID'),
  fromCategoryId: z.string().uuid().nullable().optional(),
  toCategoryId: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
}).refine(
  (data) => data.fromAccountId !== data.toAccountId,
  {
    message: 'Source and destination accounts must be different',
    path: ['toAccountId'],
  }
)

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createTransferSchema.parse(body)

    // Verify both accounts exist and belong to the user
    const [fromAccount, toAccount] = await Promise.all([
      db
        .select({ id: accounts.id, name: accounts.name })
        .from(accounts)
        .where(and(eq(accounts.id, validatedData.fromAccountId), eq(accounts.userId, userId)))
        .limit(1),
      db
        .select({ id: accounts.id, name: accounts.name })
        .from(accounts)
        .where(and(eq(accounts.id, validatedData.toAccountId), eq(accounts.userId, userId)))
        .limit(1),
    ])

    if (fromAccount.length === 0) {
      return NextResponse.json(
        { error: 'Source account not found or does not belong to user' },
        { status: 404 }
      )
    }

    if (toAccount.length === 0) {
      return NextResponse.json(
        { error: 'Destination account not found or does not belong to user' },
        { status: 404 }
      )
    }

    // Generate a unique transfer pair ID to link both transactions
    const transferPairId = uuidv4()

    // Prepare transaction data
    const transactionDate = new Date(validatedData.date)
    const description = validatedData.description || 'Transfer between accounts'

    // Create both transactions
    const transferOut = {
      userId,
      accountId: validatedData.fromAccountId,
      categoryId: validatedData.fromCategoryId || null,
      amount: (-Math.abs(validatedData.amount)).toString(), // Ensure negative
      description: `${description} (to ${toAccount[0].name})`,
      merchant: null,
      reference: `Transfer out to ${toAccount[0].name}`,
      receiptNumber: null,
      transactionDate,
      postingDate: transactionDate,
      balance: null,
      status: 'cleared',
      type: 'transfer',
      tags: ['transfer'],
      notes: validatedData.notes,
      isTransfer: true,
      transferPairId,
    }

    const transferIn = {
      userId,
      accountId: validatedData.toAccountId,
      categoryId: validatedData.toCategoryId || null,
      amount: Math.abs(validatedData.amount).toString(), // Ensure positive
      description: `${description} (from ${fromAccount[0].name})`,
      merchant: null,
      reference: `Transfer in from ${fromAccount[0].name}`,
      receiptNumber: null,
      transactionDate,
      postingDate: transactionDate,
      balance: null,
      status: 'cleared',
      type: 'transfer',
      tags: ['transfer'],
      notes: validatedData.notes,
      isTransfer: true,
      transferPairId,
    }

    // Insert both transactions
    const result = await db.insert(transactions).values([transferOut, transferIn]).returning({ id: transactions.id })

    return NextResponse.json({
      success: true,
      message: 'Transfer created successfully',
      transferPairId,
      transactionIds: result.map(r => r.id),
      amount: validatedData.amount,
      fromAccount: fromAccount[0].name,
      toAccount: toAccount[0].name,
    })
  } catch (error) {
    console.error('Error creating transfer:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.issues,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
