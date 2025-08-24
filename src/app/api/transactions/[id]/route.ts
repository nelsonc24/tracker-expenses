import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { transactions, categories, accounts } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

// Schema for updating a transaction
const updateTransactionSchema = z.object({
  description: z.string().optional(),
  amount: z.number().optional(),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  transactionDate: z.string().datetime().optional(),
  merchant: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: transactionId } = await params
    const body = await request.json()
    const validatedData = updateTransactionSchema.parse(body)

    // Check if transaction exists and belongs to user
    const existingTransaction = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.id, transactionId),
          eq(transactions.userId, userId)
        )
      )
      .limit(1)

    if (existingTransaction.length === 0) {
      return NextResponse.json(
        { error: 'Transaction not found or does not belong to user' },
        { status: 404 }
      )
    }

    // Validate category if provided
    if (validatedData.categoryId) {
      const category = await db
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(
            eq(categories.id, validatedData.categoryId),
            eq(categories.userId, userId)
          )
        )
        .limit(1)

      if (category.length === 0) {
        return NextResponse.json(
          { error: 'Category not found or does not belong to user' },
          { status: 404 }
        )
      }
    }

    // Validate account if provided
    if (validatedData.accountId) {
      const account = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(
          and(
            eq(accounts.id, validatedData.accountId),
            eq(accounts.userId, userId)
          )
        )
        .limit(1)

      if (account.length === 0) {
        return NextResponse.json(
          { error: 'Account not found or does not belong to user' },
          { status: 404 }
        )
      }
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date()
    }

    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description
    }
    if (validatedData.amount !== undefined) {
      updateData.amount = validatedData.amount.toString()
    }
    if (validatedData.categoryId !== undefined) {
      updateData.categoryId = validatedData.categoryId
    }
    if (validatedData.accountId !== undefined) {
      updateData.accountId = validatedData.accountId
    }
    if (validatedData.transactionDate !== undefined) {
      updateData.transactionDate = new Date(validatedData.transactionDate)
    }
    if (validatedData.merchant !== undefined) {
      updateData.merchant = validatedData.merchant
    }
    if (validatedData.reference !== undefined) {
      updateData.reference = validatedData.reference
    }
    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes
    }
    if (validatedData.tags !== undefined) {
      updateData.tags = validatedData.tags
    }

    // Update the transaction
    await db
      .update(transactions)
      .set(updateData)
      .where(
        and(
          eq(transactions.id, transactionId),
          eq(transactions.userId, userId)
        )
      )

    // Get the updated transaction with related data
    const updatedTransaction = await db
      .select({
        id: transactions.id,
        description: transactions.description,
        amount: transactions.amount,
        categoryId: transactions.categoryId,
        accountId: transactions.accountId,
        transactionDate: transactions.transactionDate,
        merchant: transactions.merchant,
        reference: transactions.reference,
        notes: transactions.notes,
        tags: transactions.tags,
        type: transactions.type,
        categoryName: categories.name,
        accountName: accounts.name,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          eq(transactions.id, transactionId),
          eq(transactions.userId, userId)
        )
      )
      .limit(1)

    if (updatedTransaction.length === 0) {
      return NextResponse.json(
        { error: 'Failed to retrieve updated transaction' },
        { status: 500 }
      )
    }

    const result = updatedTransaction[0]

    return NextResponse.json({
      success: true,
      message: 'Transaction updated successfully',
      transaction: {
        id: result.id,
        description: result.description,
        amount: parseFloat(result.amount),
        category: result.categoryName || 'Uncategorized',
        categoryId: result.categoryId,
        account: result.accountName || 'Unknown Account',
        accountId: result.accountId,
        date: result.transactionDate.toISOString().split('T')[0],
        merchant: result.merchant,
        reference: result.reference,
        notes: result.notes,
        tags: result.tags,
        type: result.type,
      }
    })

  } catch (error) {
    console.error('Update transaction error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: transactionId } = await params

    // Check if transaction exists and belongs to user
    const existingTransaction = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.id, transactionId),
          eq(transactions.userId, userId)
        )
      )
      .limit(1)

    if (existingTransaction.length === 0) {
      return NextResponse.json(
        { error: 'Transaction not found or does not belong to user' },
        { status: 404 }
      )
    }

    // Delete the transaction
    await db
      .delete(transactions)
      .where(
        and(
          eq(transactions.id, transactionId),
          eq(transactions.userId, userId)
        )
      )

    return NextResponse.json({
      success: true,
      message: 'Transaction deleted successfully'
    })

  } catch (error) {
    console.error('Delete transaction error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
