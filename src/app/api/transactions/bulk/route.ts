import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { transactions, categories, accounts } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { createHash } from 'crypto'

// Validation schemas for bulk operations
const bulkDeleteSchema = z.object({
  operation: z.literal('delete'),
  transactionIds: z.array(z.string()).min(1, 'At least one transaction ID is required'),
})

const bulkCategorizeSchema = z.object({
  operation: z.literal('categorize'),
  transactionIds: z.array(z.string()).min(1, 'At least one transaction ID is required'),
  categoryId: z.string().min(1, 'Category ID is required'),
})

const bulkUpdateAccountSchema = z.object({
  operation: z.literal('update_account'),
  transactionIds: z.array(z.string()).min(1, 'At least one transaction ID is required'),
  accountId: z.string().min(1, 'Account ID is required'),
})

const bulkUpdateNotesSchema = z.object({
  operation: z.literal('update_notes'),
  transactionIds: z.array(z.string()).min(1, 'At least one transaction ID is required'),
  notes: z.record(z.string(), z.any()),
  appendNotes: z.boolean().optional().default(false),
})

const bulkDuplicateSchema = z.object({
  operation: z.literal('duplicate'),
  transactionIds: z.array(z.string()).min(1, 'At least one transaction ID is required'),
  modifications: z.object({
    descriptionRaw: z.string().optional(),
    amountMinor: z.number().optional(),
    postedAt: z.string().optional(),
    categoryId: z.string().optional(),
    accountId: z.string().optional(),
  }).optional(),
})

const bulkOperationSchema = z.discriminatedUnion('operation', [
  bulkDeleteSchema,
  bulkCategorizeSchema,
  bulkUpdateAccountSchema,
  bulkUpdateNotesSchema,
  bulkDuplicateSchema,
])

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = bulkOperationSchema.parse(body)

    // Verify all transactions belong to the user
    const userTransactions = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          inArray(transactions.id, validatedData.transactionIds)
        )
      )

    if (userTransactions.length !== validatedData.transactionIds.length) {
      return NextResponse.json(
        { error: 'Some transactions not found or do not belong to user' },
        { status: 404 }
      )
    }

    let result: any = { success: false, message: '', affectedCount: 0 }

    switch (validatedData.operation) {
      case 'delete':
        await db
          .delete(transactions)
          .where(
            and(
              eq(transactions.userId, userId),
              inArray(transactions.id, validatedData.transactionIds)
            )
          )
        
        result = {
          success: true,
          message: `Successfully deleted ${validatedData.transactionIds.length} transactions`,
          affectedCount: validatedData.transactionIds.length,
          operation: 'delete'
        }
        break

      case 'categorize':
        // Verify category exists and belongs to user
        const category = await db
          .select()
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

        await db
          .update(transactions)
          .set({ 
            categoryId: validatedData.categoryId,
            updatedAt: new Date()
          })
          .where(
            and(
              eq(transactions.userId, userId),
              inArray(transactions.id, validatedData.transactionIds)
            )
          )

        result = {
          success: true,
          message: `Successfully updated category for ${validatedData.transactionIds.length} transactions`,
          affectedCount: validatedData.transactionIds.length,
          operation: 'categorize',
          categoryName: category[0].name
        }
        break

      case 'update_account':
        // Verify account exists and belongs to user
        const account = await db
          .select()
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

        await db
          .update(transactions)
          .set({ 
            accountId: validatedData.accountId,
            updatedAt: new Date()
          })
          .where(
            and(
              eq(transactions.userId, userId),
              inArray(transactions.id, validatedData.transactionIds)
            )
          )

        result = {
          success: true,
          message: `Successfully updated account for ${validatedData.transactionIds.length} transactions`,
          affectedCount: validatedData.transactionIds.length,
          operation: 'update_account',
          accountName: account[0].name
        }
        break

      case 'update_notes':
        if (validatedData.appendNotes) {
          // Get current transactions to append notes
          const transactionsWithNotes = await db
            .select({ id: transactions.id, notes: transactions.notes })
            .from(transactions)
            .where(
              and(
                eq(transactions.userId, userId),
                inArray(transactions.id, validatedData.transactionIds)
              )
            )

          // Append notes to each transaction
          for (const transaction of transactionsWithNotes) {
            const currentNotes = transaction.notes || {}
            const updatedNotes = { ...currentNotes, ...validatedData.notes }
            
            await db
              .update(transactions)
              .set({ 
                notes: updatedNotes,
                updatedAt: new Date()
              })
              .where(eq(transactions.id, transaction.id))
          }
        } else {
          // Replace notes
          await db
            .update(transactions)
            .set({ 
              notes: validatedData.notes,
              updatedAt: new Date()
            })
            .where(
              and(
                eq(transactions.userId, userId),
                inArray(transactions.id, validatedData.transactionIds)
              )
            )
        }

        result = {
          success: true,
          message: `Successfully updated notes for ${validatedData.transactionIds.length} transactions`,
          affectedCount: validatedData.transactionIds.length,
          operation: 'update_notes',
          append: validatedData.appendNotes
        }
        break

      case 'duplicate':
        // Get transactions to duplicate
        const transactionsToDuplicate = await db
          .select()
          .from(transactions)
          .where(
            and(
              eq(transactions.userId, userId),
              inArray(transactions.id, validatedData.transactionIds)
            )
          )

        const duplicatedTransactions = []
        for (const transaction of transactionsToDuplicate) {
          const modifications = validatedData.modifications || {}
          
          // Create a hash for deduplication
          const duplicatePrefix = 'Copy of '
          const newDescription = modifications.descriptionRaw || `${duplicatePrefix}${transaction.descriptionRaw}`
          const newAmount = modifications.amountMinor || transaction.amountMinor
          const newDate = modifications.postedAt ? new Date(modifications.postedAt) : transaction.postedAt
          
          const hashString = `${userId}-${newDescription}-${newAmount}-${newDate.toISOString()}`
          const hashDedupe = createHash('sha256').update(hashString).digest('hex')
          
          const duplicatedTransaction = {
            userId: transaction.userId,
            accountId: modifications.accountId || transaction.accountId,
            connectionId: transaction.connectionId,
            postedAt: newDate,
            effectiveAt: transaction.effectiveAt,
            descriptionRaw: newDescription,
            descriptionClean: transaction.descriptionClean ? `Copy of ${transaction.descriptionClean}` : null,
            merchantName: transaction.merchantName,
            amountMinor: newAmount,
            currency: transaction.currency,
            categoryId: modifications.categoryId || transaction.categoryId,
            hashDedupe: hashDedupe,
            isTransfer: transaction.isTransfer,
            isRecurring: false, // Duplicated transactions shouldn't be recurring
            transferPairId: null, // Don't duplicate transfer pairs
            bankCategory: transaction.bankCategory,
            paymentType: transaction.paymentType,
            receiptNumber: transaction.receiptNumber,
            bankTransactionId: null, // Clear bank transaction ID for duplicates
            fromAccount: transaction.fromAccount,
            toAccount: transaction.toAccount,
            notes: transaction.notes ? { ...transaction.notes, duplicatedFrom: transaction.id } : { duplicatedFrom: transaction.id },
            updatedByRuleId: null,
            manualCategoryLocked: transaction.manualCategoryLocked,
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          const [inserted] = await db
            .insert(transactions)
            .values(duplicatedTransaction)
            .returning()

          duplicatedTransactions.push(inserted)
        }

        result = {
          success: true,
          message: `Successfully duplicated ${validatedData.transactionIds.length} transactions`,
          affectedCount: duplicatedTransactions.length,
          operation: 'duplicate',
          duplicatedIds: duplicatedTransactions.map(t => t.id)
        }
        break

      default:
        return NextResponse.json(
          { error: 'Unsupported bulk operation' },
          { status: 400 }
        )
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Bulk operations error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.issues.map(e => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
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

    // Return available bulk operations and their descriptions
    const availableOperations = {
      delete: {
        name: 'Delete Transactions',
        description: 'Permanently delete selected transactions',
        icon: 'Trash2',
        destructive: true
      },
      categorize: {
        name: 'Change Category',
        description: 'Update the category for selected transactions',
        icon: 'Tag',
        destructive: false
      },
      update_account: {
        name: 'Change Account',
        description: 'Move selected transactions to a different account',
        icon: 'CreditCard',
        destructive: false
      },
      update_notes: {
        name: 'Update Notes',
        description: 'Add or replace notes for selected transactions',
        icon: 'FileText',
        destructive: false
      },
      duplicate: {
        name: 'Duplicate Transactions',
        description: 'Create copies of selected transactions',
        icon: 'Copy',
        destructive: false
      }
    }

    return NextResponse.json({ operations: availableOperations })

  } catch (error) {
    console.error('Get bulk operations error:', error)
    return NextResponse.json(
      { error: 'Failed to get bulk operations' },
      { status: 500 }
    )
  }
}
