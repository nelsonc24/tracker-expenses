import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { transactions, accounts, categories, budgets, recurringTransactions, users } from '@/db/schema'
import { eq, and, gte, lte, desc, asc } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      format = 'csv', // csv, json, xlsx
      dataType = 'transactions', // transactions, budgets, recurring, all
      startDate,
      endDate,
      categoryIds = [],
      accountIds = [],
      includeMetadata = true
    } = body

    // Validate format
    if (!['csv', 'json', 'xlsx'].includes(format)) {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
    }

    // Validate date range
    let startDateFilter: Date | undefined
    let endDateFilter: Date | undefined

    if (startDate) {
      startDateFilter = new Date(startDate)
      if (isNaN(startDateFilter.getTime())) {
        return NextResponse.json({ error: 'Invalid start date' }, { status: 400 })
      }
    }

    if (endDate) {
      endDateFilter = new Date(endDate)
      if (isNaN(endDateFilter.getTime())) {
        return NextResponse.json({ error: 'Invalid end date' }, { status: 400 })
      }
    }

    const exportData: any = {}

    // Export transactions
    if (dataType === 'transactions' || dataType === 'all') {
      const transactionConditions = [eq(transactions.userId, userId)]
      
      if (startDateFilter) {
        transactionConditions.push(gte(transactions.transactionDate, startDateFilter))
      }
      
      if (endDateFilter) {
        transactionConditions.push(lte(transactions.transactionDate, endDateFilter))
      }

      if (categoryIds.length > 0) {
        // Note: This would need to be implemented with an OR condition for multiple categories
        // For now, we'll filter client-side
      }

      if (accountIds.length > 0) {
        // Note: This would need to be implemented with an OR condition for multiple accounts
        // For now, we'll filter client-side
      }

      const transactionData = await db
        .select({
          transaction: transactions,
          account: accounts,
          category: categories,
        })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(and(...transactionConditions))
        .orderBy(desc(transactions.transactionDate))

      // Filter by category and account if specified
      let filteredTransactions = transactionData
      
      if (categoryIds.length > 0) {
        filteredTransactions = filteredTransactions.filter(t => 
          t.transaction.categoryId && categoryIds.includes(t.transaction.categoryId)
        )
      }

      if (accountIds.length > 0) {
        filteredTransactions = filteredTransactions.filter(t => 
          t.transaction.accountId && accountIds.includes(t.transaction.accountId)
        )
      }

      // Format transactions for export
      exportData.transactions = filteredTransactions.map(({ transaction, account, category }) => {
        const baseData = {
          id: transaction.id,
          date: transaction.transactionDate.toISOString().split('T')[0],
          description: transaction.description,
          amount: parseFloat(transaction.amount),
          currency: transaction.currency,
          type: parseFloat(transaction.amount) >= 0 ? 'Income' : 'Expense',
          account_name: account?.name || 'Unknown',
          account_institution: account?.institution || '',
          category_name: category?.name || 'Uncategorized',
          tags: transaction.tags || [],
        }

        if (includeMetadata) {
          return {
            ...baseData,
            merchant: transaction.merchant || '',
            reference: transaction.reference || '',
            account_id: transaction.accountId,
            category_id: transaction.categoryId,
            posting_date: transaction.postingDate?.toISOString() || '',
            balance: parseFloat(transaction.balance || '0'),
            status: transaction.status,
            type: transaction.type,
            location: transaction.location,
            original_data: transaction.originalData,
            notes: transaction.notes,
            reconciled: transaction.reconciled,
            created_at: transaction.createdAt.toISOString(),
            updated_at: transaction.updatedAt.toISOString(),
          }
        }

        return baseData
      })
    }

    // Export budgets
    if (dataType === 'budgets' || dataType === 'all') {
      const budgetData = await db
        .select({
          budget: budgets,
        })
        .from(budgets)
        .where(eq(budgets.userId, userId))
        .orderBy(desc(budgets.createdAt))

      exportData.budgets = budgetData.map(({ budget }) => {
        const baseData = {
          id: budget.id,
          name: budget.name,
          description: budget.description,
          amount: parseFloat(budget.amount),
          currency: budget.currency,
          period: budget.period,
          start_date: budget.startDate.toISOString().split('T')[0],
          end_date: budget.endDate?.toISOString().split('T')[0] || '',
          category_ids: budget.categoryIds || [],
          account_ids: budget.accountIds || [],
          alert_threshold: parseFloat(budget.alertThreshold || '80'),
          is_active: budget.isActive,
        }

        if (includeMetadata) {
          return {
            ...baseData,
            metadata: budget.metadata,
            created_at: budget.createdAt.toISOString(),
            updated_at: budget.updatedAt.toISOString(),
          }
        }

        return baseData
      })
    }

    // Export recurring transactions
    if (dataType === 'recurring' || dataType === 'all') {
      const recurringData = await db
        .select({
          recurring: recurringTransactions,
          account: accounts,
          category: categories,
        })
        .from(recurringTransactions)
        .leftJoin(accounts, eq(recurringTransactions.accountId, accounts.id))
        .leftJoin(categories, eq(recurringTransactions.categoryId, categories.id))
        .where(eq(recurringTransactions.userId, userId))
        .orderBy(desc(recurringTransactions.createdAt))

      exportData.recurringTransactions = recurringData.map(({ recurring, account, category }) => {
        const baseData = {
          id: recurring.id,
          name: recurring.name,
          description: recurring.description,
          amount: parseFloat(recurring.amount),
          currency: recurring.currency,
          frequency: recurring.frequency,
          start_date: recurring.startDate.toISOString().split('T')[0],
          end_date: recurring.endDate?.toISOString().split('T')[0] || '',
          next_date: recurring.nextDate.toISOString().split('T')[0],
          last_processed: recurring.lastProcessed?.toISOString().split('T')[0] || '',
          is_active: recurring.isActive,
          auto_process: recurring.autoProcess,
          account_name: account?.name || 'Unknown',
          category_name: category?.name || 'Uncategorized',
          tags: recurring.tags || [],
        }

        if (includeMetadata) {
          return {
            ...baseData,
            account_id: recurring.accountId,
            category_id: recurring.categoryId,
            created_at: recurring.createdAt.toISOString(),
            updated_at: recurring.updatedAt.toISOString(),
          }
        }

        return baseData
      })
    }

    // Add summary metadata
    if (includeMetadata) {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

      exportData.metadata = {
        export_date: new Date().toISOString(),
        export_format: format,
        data_type: dataType,
        date_range: {
          start_date: startDateFilter?.toISOString() || null,
          end_date: endDateFilter?.toISOString() || null,
        },
        filters: {
          category_ids: categoryIds,
          account_ids: accountIds,
        },
        user: {
          id: userId,
          email: user[0]?.email || '',
          export_count: (exportData.transactions?.length || 0) + 
                       (exportData.budgets?.length || 0) + 
                       (exportData.recurringTransactions?.length || 0),
        },
      }
    }

    // Return appropriate format
    if (format === 'json') {
      const headers = new Headers({
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="expense-tracker-export-${new Date().toISOString().split('T')[0]}.json"`,
      })

      return new Response(JSON.stringify(exportData, null, 2), {
        headers,
        status: 200,
      })
    }

    if (format === 'csv') {
      // Convert to CSV format (focusing on transactions for simplicity)
      const csvData = exportData.transactions || []
      
      if (csvData.length === 0) {
        return NextResponse.json({ error: 'No data to export' }, { status: 400 })
      }

      // Generate CSV headers from first row
      const headers = Object.keys(csvData[0])
      let csvContent = headers.join(',') + '\n'

      // Add data rows
      csvData.forEach((row: any) => {
        const values = headers.map(header => {
          let value = row[header]
          
          // Handle special cases
          if (Array.isArray(value)) {
            value = value.join(';') // Join arrays with semicolon
          } else if (typeof value === 'object' && value !== null) {
            value = JSON.stringify(value) // Stringify objects
          } else if (typeof value === 'string' && value.includes(',')) {
            value = `"${value}"` // Quote strings with commas
          }
          
          return value || ''
        })
        csvContent += values.join(',') + '\n'
      })

      const responseHeaders = new Headers({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="expense-tracker-export-${new Date().toISOString().split('T')[0]}.csv"`,
      })

      return new Response(csvContent, {
        headers: responseHeaders,
        status: 200,
      })
    }

    // For now, XLSX format returns JSON with instruction
    if (format === 'xlsx') {
      return NextResponse.json({
        message: 'XLSX format coming soon. For now, use JSON format and convert using Excel.',
        data: exportData
      })
    }

    return NextResponse.json({ error: 'Unsupported format' }, { status: 400 })

  } catch (error) {
    console.error('Error generating export:', error)
    return NextResponse.json(
      { error: 'Failed to generate export' },
      { status: 500 }
    )
  }
}
