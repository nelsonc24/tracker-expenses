import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { transactions, categories, accounts, activities, transactionActivities } from '@/db/schema'
import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'

// Individual operation schemas
const bulkDeleteSchema = z.object({
  operation: z.literal('delete'),
  transactionIds: z.array(z.string()).min(1, 'At least one transaction ID is required'),
})

const bulkCategorizeSchema = z.object({
  operation: z.literal('categorize'),
  transactionIds: z.array(z.string()).min(1, 'At least one transaction ID is required'),
  categoryId: z.string(),
})

const bulkUpdateAccountSchema = z.object({
  operation: z.literal('update_account'),
  transactionIds: z.array(z.string()).min(1, 'At least one transaction ID is required'),
  accountId: z.string(),
})

const bulkAssignActivitySchema = z.object({
  operation: z.literal('assign_activity'),
  transactionIds: z.array(z.string()).min(1, 'At least one transaction ID is required'),
  activityId: z.string(),
})

// Union schema for all operations
const bulkOperationSchema = z.union([
  bulkDeleteSchema,
  bulkCategorizeSchema,
  bulkUpdateAccountSchema,
  bulkAssignActivitySchema,
])

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = bulkOperationSchema.parse(body)

    let result: {
      success: boolean
      message: string
      affectedCount: number
      operation: string
      categoryName?: string
      accountName?: string
      activityName?: string
    }

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
          .select({ id: categories.id, name: categories.name })
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
            { 
              error: 'Category not found or does not belong to user',
              operation: {
                type: 'not_found',
                message: 'The selected category could not be found. Please refresh and try again.'
              }
            },
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
          .select({ id: accounts.id, name: accounts.name })
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
            { 
              error: 'Account not found or does not belong to user',
              operation: {
                type: 'not_found',
                message: 'The selected account could not be found. Please refresh and try again.'
              }
            },
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

      case 'assign_activity':
        // Verify activity exists and belongs to user
        const activity = await db
          .select({ id: activities.id, name: activities.name })
          .from(activities)
          .where(
            and(
              eq(activities.id, validatedData.activityId),
              eq(activities.userId, userId)
            )
          )
          .limit(1)

        if (activity.length === 0) {
          return NextResponse.json(
            { 
              error: 'Activity not found or does not belong to user',
              operation: {
                type: 'not_found',
                message: 'The selected activity could not be found. Please refresh and try again.'
              }
            },
            { status: 404 }
          )
        }

        // First, remove any existing activity assignments for these transactions
        // We need to check that the transactions belong to the user
        const userTransactionIds = await db
          .select({ id: transactions.id })
          .from(transactions)
          .where(
            and(
              eq(transactions.userId, userId),
              inArray(transactions.id, validatedData.transactionIds)
            )
          )

        const validTransactionIds = userTransactionIds.map(t => t.id)

        await db
          .delete(transactionActivities)
          .where(
            inArray(transactionActivities.transactionId, validTransactionIds)
          )

        // Then, create new activity assignments
        const activityAssignments = validTransactionIds.map(transactionId => ({
          transactionId,
          activityId: validatedData.activityId,
          assignedAt: new Date(),
          assignedBy: 'user' as const
        }))

        await db.insert(transactionActivities).values(activityAssignments)

        result = {
          success: true,
          message: `Successfully assigned activity "${activity[0].name}" to ${validTransactionIds.length} transactions`,
          affectedCount: validTransactionIds.length,
          operation: 'assign_activity',
          activityName: activity[0].name
        }
        break

      default:
        return NextResponse.json(
          { 
            error: 'Invalid operation',
            operation: {
              type: 'invalid_operation',
              message: 'The requested operation is not supported.'
            }
          },
          { status: 400 }
        )
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Bulk operation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: error.issues,
          operation: {
            type: 'validation_error',
            message: 'Please check your request parameters and try again.',
            errors: error.issues.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          }
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        operation: {
          type: 'server_error',
          message: 'An unexpected error occurred. Please try again later.'
        }
      },
      { status: 500 }
    )
  }
}
