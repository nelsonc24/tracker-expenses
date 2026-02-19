import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { transactions } from '@/db/schema'
import { and, eq, or } from 'drizzle-orm'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

const linkTransfersSchema = z.object({
  transactionId1: z.string().uuid('Invalid transaction ID'),
  transactionId2: z.string().uuid('Invalid transaction ID'),
}).refine(
  (data) => data.transactionId1 !== data.transactionId2,
  {
    message: 'Cannot link a transaction to itself',
    path: ['transactionId2'],
  }
)

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = linkTransfersSchema.parse(body)

    // Fetch both transactions and verify they belong to the user
    const [transaction1, transaction2] = await Promise.all([
      db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.id, validatedData.transactionId1),
            eq(transactions.userId, userId)
          )
        )
        .limit(1),
      db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.id, validatedData.transactionId2),
            eq(transactions.userId, userId)
          )
        )
        .limit(1),
    ])

    if (transaction1.length === 0) {
      return NextResponse.json(
        { error: 'First transaction not found or does not belong to user' },
        { status: 404 }
      )
    }

    if (transaction2.length === 0) {
      return NextResponse.json(
        { error: 'Second transaction not found or does not belong to user' },
        { status: 404 }
      )
    }

    const tx1 = transaction1[0]
    const tx2 = transaction2[0]

    // Validate that both transactions are transfers
    if (!tx1.isTransfer || !tx2.isTransfer) {
      return NextResponse.json(
        { error: 'Both transactions must be marked as transfers' },
        { status: 400 }
      )
    }

    // Validate that transactions are not already linked
    if (tx1.transferPairId || tx2.transferPairId) {
      return NextResponse.json(
        { error: 'One or both transactions are already linked to another transfer' },
        { status: 400 }
      )
    }

    // Validate that transactions have opposite signs (one positive, one negative)
    const amount1 = parseFloat(tx1.amount)
    const amount2 = parseFloat(tx2.amount)
    
    if ((amount1 > 0 && amount2 > 0) || (amount1 < 0 && amount2 < 0)) {
      return NextResponse.json(
        { error: 'Transactions must have opposite signs (one income, one expense)' },
        { status: 400 }
      )
    }

    // Validate that transactions are from different accounts
    if (tx1.accountId === tx2.accountId) {
      return NextResponse.json(
        { error: 'Transactions must be from different accounts' },
        { status: 400 }
      )
    }

    // Generate a unique transfer pair ID
    const transferPairId = uuidv4()

    // Update both transactions with the transfer pair ID
    await db
      .update(transactions)
      .set({ transferPairId })
      .where(
        or(
          eq(transactions.id, validatedData.transactionId1),
          eq(transactions.id, validatedData.transactionId2)
        )
      )

    return NextResponse.json({
      success: true,
      message: 'Transfers linked successfully',
      transferPairId,
      transactionIds: [validatedData.transactionId1, validatedData.transactionId2],
    })
  } catch (error) {
    console.error('Error linking transfers:', error)

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
