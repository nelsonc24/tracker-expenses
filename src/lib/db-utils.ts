import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { users, accounts, categories, transactions, budgets, budgetPeriods, recurringTransactions } from '@/db/schema'
import { eq, and, desc, asc, count, sum, gte, lte, like, or, sql, inArray } from 'drizzle-orm'

// Type helpers for better TypeScript support
type SelectUser = typeof users.$inferSelect
type SelectAccount = typeof accounts.$inferSelect
type SelectCategory = typeof categories.$inferSelect
type InsertTransaction = typeof transactions.$inferInsert
type SelectTransaction = typeof transactions.$inferSelect
type SelectBudget = typeof budgets.$inferSelect
type SelectBudgetPeriod = typeof budgetPeriods.$inferSelect
type InsertBudgetPeriod = typeof budgetPeriods.$inferInsert

// User utilities
export async function getCurrentUser(): Promise<SelectUser | null> {
  const { userId } = await auth()
  if (!userId) return null

  try {
    const result = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    return (result as SelectUser[])?.[0] || null
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export async function createOrUpdateUser(userData: {
  id: string // Clerk user ID
  email: string
  firstName?: string
  lastName?: string
  imageUrl?: string
}): Promise<SelectUser | null> {
  try {
    // Check if user exists by the provided Clerk ID
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.id, userData.id))
      .limit(1)
    
    const existingUser = existingUsers[0]
    
    if (existingUser) {
      // Update existing user
      const result = await db
        .update(users)
        .set({
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          imageUrl: userData.imageUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userData.id))
        .returning()
      return (result as SelectUser[])?.[0] || null
    } else {
      // Create new user with Clerk ID
      const result = await db
        .insert(users)
        .values({
          id: userData.id, // Use Clerk ID directly
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          imageUrl: userData.imageUrl,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()
      return (result as SelectUser[])?.[0] || null
    }
  } catch (error) {
    console.error('Error creating/updating user:', error)
    return null
  }
}

// Account utilities
export async function getUserAccounts(userId: string): Promise<SelectAccount[]> {
  try {
    const result = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, userId))
      .orderBy(asc(accounts.name))
    return result as SelectAccount[]
  } catch (error) {
    console.error('Error getting user accounts:', error)
    return []
  }
}

export async function createAccount(accountData: {
  userId: string
  name: string
  institution: string
  accountType: string
  accountNumber?: string
  bsb?: string
  balance?: string
  metadata?: any
}): Promise<SelectAccount | null> {
  try {
    const result = await db
      .insert(accounts)
      .values({
        ...accountData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()
    return (result as SelectAccount[])?.[0] || null
  } catch (error) {
    console.error('Error creating account:', error)
    return null
  }
}

export async function updateAccount(
  accountId: string,
  userId: string,
  updateData: {
    name?: string
    institution?: string
    accountType?: string
    accountNumber?: string
    bsb?: string
    balance?: string
    isActive?: boolean
    metadata?: any
  }
): Promise<SelectAccount | null> {
  try {
    const result = await db
      .update(accounts)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
      .returning()
    return (result as SelectAccount[])?.[0] || null
  } catch (error) {
    console.error('Error updating account:', error)
    return null
  }
}

export async function deleteAccount(accountId: string, userId: string): Promise<boolean> {
  try {
    // First check if account has transactions
    const transactionCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(eq(transactions.accountId, accountId))
    
    const hasTransactions = transactionCount[0]?.count > 0

    if (hasTransactions) {
      // Don't delete account with transactions, just deactivate it
      const result = await db
        .update(accounts)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
        .returning()
      return result.length > 0
    } else {
      // Safe to delete account with no transactions
      const result = await db
        .delete(accounts)
        .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
        .returning()
      return result.length > 0
    }
  } catch (error) {
    console.error('Error deleting account:', error)
    return false
  }
}

export async function getAccountById(accountId: string, userId: string): Promise<SelectAccount | null> {
  try {
    const result = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
      .limit(1)
    return (result as SelectAccount[])?.[0] || null
  } catch (error) {
    console.error('Error getting account by ID:', error)
    return null
  }
}

// Category utilities
export async function getUserCategories(userId: string): Promise<SelectCategory[]> {
  try {
    const result = await db
      .select()
      .from(categories)
      .where(eq(categories.userId, userId))
      .orderBy(asc(categories.sortOrder), asc(categories.name))
    return result as SelectCategory[]
  } catch (error) {
    console.error('Error getting user categories:', error)
    return []
  }
}

export async function createCategory(categoryData: {
  userId: string
  name: string
  description?: string
  color?: string
  icon?: string
  customIconUrl?: string
  parentId?: string
}): Promise<SelectCategory | null> {
  try {
    const result = await db
      .insert(categories)
      .values({
        ...categoryData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()
    return (result as SelectCategory[])?.[0] || null
  } catch (error) {
    console.error('Error creating category:', error)
    return null
  }
}

export async function createDefaultCategories(userId: string): Promise<SelectCategory[]> {
  const defaultCategories = [
    { name: 'Income', color: '#22c55e', icon: 'dollar-sign' },
    { name: 'Groceries', color: '#16a34a', icon: 'shopping-cart' },
    { name: 'Entertainment', color: '#8b5cf6', icon: 'music' },
    { name: 'Transport', color: '#3b82f6', icon: 'car' },
    { name: 'Dining', color: '#f59e0b', icon: 'utensils' },
    { name: 'Shopping', color: '#ec4899', icon: 'shopping-bag' },
    { name: 'Utilities', color: '#06b6d4', icon: 'zap' },
    { name: 'Healthcare', color: '#ef4444', icon: 'heart' },
    { name: 'Other', color: '#6b7280', icon: 'more-horizontal' },
  ]

  const createdCategories: SelectCategory[] = []
  for (const categoryData of defaultCategories) {
    const category = await createCategory({
      userId,
      ...categoryData,
    })
    if (category) {
      createdCategories.push(category)
    }
  }
  
  return createdCategories
}

export async function getCategoryById(categoryId: string): Promise<SelectCategory | null> {
  try {
    const result = await db.select().from(categories).where(eq(categories.id, categoryId)).limit(1)
    return (result as SelectCategory[])?.[0] || null
  } catch (error) {
    console.error('Error fetching category by ID:', error)
    return null
  }
}

export async function updateCategory(
  categoryId: string, 
  updates: {
    name?: string
    color?: string
    icon?: string
    customIconUrl?: string
    parentId?: string | null
  }
): Promise<SelectCategory | null> {
  try {
    const updateData: any = {}
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.color !== undefined) updateData.color = updates.color
    if (updates.icon !== undefined) updateData.icon = updates.icon
    if (updates.customIconUrl !== undefined) updateData.customIconUrl = updates.customIconUrl
    if (updates.parentId !== undefined) updateData.parentId = updates.parentId
    
    // Always update the updatedAt timestamp
    updateData.updatedAt = new Date()

    // Generate slug from name if name is being updated
    if (updates.name) {
      updateData.slug = updates.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    }

    const result = await db
      .update(categories)
      .set(updateData)
      .where(eq(categories.id, categoryId))
      .returning()
    
    return (result as SelectCategory[])?.[0] || null
  } catch (error) {
    console.error('Error updating category:', error)
    return null
  }
}

export async function deleteCategory(categoryId: string): Promise<boolean> {
  try {
    // First, update any child categories to have no parent
    await db
      .update(categories)
      .set({ parentId: null })
      .where(eq(categories.parentId, categoryId))

    // Delete the category
    const result = await db.delete(categories).where(eq(categories.id, categoryId))
    return true
  } catch (error) {
    console.error('Error deleting category:', error)
    return false
  }
}

// Transaction utilities
export async function getUserTransactions(
  userId: string,
  options: {
    accountId?: string
    categoryId?: string
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
    search?: string
    sortBy?: 'date' | 'amount' | 'description'
    sortOrder?: 'asc' | 'desc'
  } = {}
): Promise<Array<{
  transaction: SelectTransaction
  account: SelectAccount | null
  category: SelectCategory | null
}>> {
  const { 
    accountId, 
    categoryId, 
    startDate, 
    endDate, 
    limit = 50, 
    offset = 0, 
    search,
    sortBy = 'date',
    sortOrder = 'desc'
  } = options

  try {
    // Build where conditions
    const conditions = [eq(transactions.userId, userId)]
    
    if (accountId) {
      conditions.push(eq(transactions.accountId, accountId))
    }
    
    if (categoryId) {
      conditions.push(eq(transactions.categoryId, categoryId))
    }
    
    if (startDate) {
      conditions.push(gte(transactions.transactionDate, startDate))
    }
    
    if (endDate) {
      conditions.push(lte(transactions.transactionDate, endDate))
    }
    
    if (search) {
      const searchConditions = [
        like(transactions.description, `%${search}%`),
        like(transactions.merchant, `%${search}%`),
        like(transactions.reference, `%${search}%`)
      ]
      
      if (searchConditions.length > 0) {
        conditions.push(or(...searchConditions)!)
      }
    }

    // Build order by
    const sortColumn = {
      date: transactions.transactionDate,
      amount: transactions.amount,
      description: transactions.description,
    }[sortBy]

    const orderBy = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn)

    const result = await db
      .select({
        transaction: transactions,
        account: accounts,
        category: categories,
      })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset)

    return result as Array<{
      transaction: SelectTransaction
      account: SelectAccount | null
      category: SelectCategory | null
    }>
  } catch (error) {
    console.error('Error getting user transactions:', error)
    return []
  }
}

export async function createTransaction(transactionData: {
  userId: string
  accountId: string
  categoryId?: string
  amount: string
  description: string
  merchant?: string
  reference?: string
  receiptNumber?: string
  transactionDate: Date
  type: 'debit' | 'credit' | 'transfer'
  tags?: string[]
  notes?: string
  isTransfer?: boolean
}): Promise<SelectTransaction | null> {
  try {
    const result = await db
      .insert(transactions)
      .values({
        ...transactionData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()
    return (result as SelectTransaction[])?.[0] || null
  } catch (error) {
    console.error('Error creating transaction:', error)
    return null
  }
}

export async function updateTransaction(
  transactionId: string, 
  userId: string, 
  updates: Partial<InsertTransaction>
): Promise<SelectTransaction | null> {
  try {
    const result = await db
      .update(transactions)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
      .returning()
    return (result as SelectTransaction[])?.[0] || null
  } catch (error) {
    console.error('Error updating transaction:', error)
    return null
  }
}

export async function deleteTransaction(transactionId: string, userId: string): Promise<SelectTransaction | null> {
  try {
    const result = await db
      .delete(transactions)
      .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
      .returning()
    return (result as SelectTransaction[])?.[0] || null
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return null
  }
}

// Budget utilities
export async function getUserBudgets(userId: string): Promise<SelectBudget[]> {
  try {
    const result = await db
      .select()
      .from(budgets)
      .where(eq(budgets.userId, userId))
      .orderBy(desc(budgets.createdAt))
    return result as SelectBudget[]
  } catch (error) {
    console.error('Error getting user budgets:', error)
    return []
  }
}

export async function createBudget(budgetData: {
  userId: string
  name: string
  description?: string
  amount: string
  period: string
  startDate: Date
  endDate?: Date
  categoryIds?: string[]
  accountIds?: string[]
  autoResetEnabled?: boolean
  resetDay?: number
  rolloverUnused?: boolean
  rolloverStrategy?: string
  rolloverPercentage?: number
  rolloverLimit?: string
}): Promise<SelectBudget | null> {
  try {
    // Calculate initial period dates
    const currentPeriodStart = budgetData.startDate
    const currentPeriodEnd = budgetData.endDate || calculateNextResetDate(
      budgetData.startDate,
      budgetData.period as 'weekly' | 'monthly' | 'quarterly' | 'yearly',
      budgetData.resetDay
    )
    const nextResetDate = calculateNextResetDate(
      budgetData.startDate,
      budgetData.period as 'weekly' | 'monthly' | 'quarterly' | 'yearly',
      budgetData.resetDay
    )

    const result = await db
      .insert(budgets)
      .values({
        ...budgetData,
        currentPeriodStart,
        currentPeriodEnd,
        nextResetDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()
    
    const newBudget = (result as SelectBudget[])?.[0] || null
    
    // Create initial budget period
    if (newBudget) {
      await db.insert(budgetPeriods).values({
        budgetId: newBudget.id,
        userId: newBudget.userId,
        periodStart: currentPeriodStart,
        periodEnd: currentPeriodEnd,
        allocatedAmount: budgetData.amount,
        rolloverAmount: '0.00',
        totalBudget: budgetData.amount,
        spentAmount: '0.00',
        status: 'active',
        periodLabel: generatePeriodLabel(currentPeriodStart, currentPeriodEnd, budgetData.period),
        createdAt: new Date()
      })
    }
    
    return newBudget
  } catch (error) {
    console.error('Error creating budget:', error)
    return null
  }
}

export async function updateBudget(
  budgetId: string, 
  userId: string, 
  budgetData: {
    name?: string
    description?: string
    amount?: string
    period?: string
    startDate?: Date
    endDate?: Date
    categoryIds?: string[]
    accountIds?: string[]
    isActive?: boolean
  }
): Promise<SelectBudget | null> {
  try {
    const result = await db
      .update(budgets)
      .set({
        ...budgetData,
        updatedAt: new Date(),
      })
      .where(and(eq(budgets.id, budgetId), eq(budgets.userId, userId)))
      .returning()
    return (result as SelectBudget[])?.[0] || null
  } catch (error) {
    console.error('Error updating budget:', error)
    return null
  }
}

export async function deleteBudget(budgetId: string, userId: string): Promise<boolean> {
  try {
    const result = await db
      .delete(budgets)
      .where(and(eq(budgets.id, budgetId), eq(budgets.userId, userId)))
      .returning()
    return result.length > 0
  } catch (error) {
    console.error('Error deleting budget:', error)
    return false
  }
}

// Analytics utilities
export async function getTransactionSummary(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalTransactions: number
  totalIncome: number
  totalExpenses: number
  netAmount: number
}> {
  try {
    const conditions = [eq(transactions.userId, userId)]
    
    if (startDate) {
      conditions.push(gte(transactions.transactionDate, startDate))
    }
    
    if (endDate) {
      conditions.push(lte(transactions.transactionDate, endDate))
    }

    const summaryResult = await db
      .select({
        totalTransactions: count(),
        totalAmount: sum(transactions.amount),
      })
      .from(transactions)
      .where(and(...conditions))

    // Get expense total separately - exclude transfers to avoid double counting
    const expenseResult = await db
      .select({
        totalExpenses: sum(transactions.amount),
      })
      .from(transactions)
      .where(and(...conditions, lte(transactions.amount, '0'), eq(transactions.isTransfer, false)))

    // Get income total separately - exclude transfers to avoid double counting
    const incomeResult = await db
      .select({
        totalIncome: sum(transactions.amount),
      })
      .from(transactions)
      .where(and(...conditions, gte(transactions.amount, '0'), eq(transactions.isTransfer, false)))

    return {
      totalTransactions: Number(summaryResult?.[0]?.totalTransactions || 0),
      totalIncome: Number(incomeResult?.[0]?.totalIncome || 0),
      totalExpenses: Math.abs(Number(expenseResult?.[0]?.totalExpenses || 0)),
      netAmount: Number(incomeResult?.[0]?.totalIncome || 0) - Math.abs(Number(expenseResult?.[0]?.totalExpenses || 0)),
    }
  } catch (error) {
    console.error('Error getting transaction summary:', error)
    return {
      totalTransactions: 0,
      totalIncome: 0,
      totalExpenses: 0,
      netAmount: 0,
    }
  }
}

export async function getCategorySpending(
  userId: string,
  startDate?: Date,
  endDate?: Date,
  accountId?: string
): Promise<Array<{
  categoryId: string | null
  categoryName: string | null
  categoryColor: string | null
  totalAmount: string | null
  transactionCount: number
}>> {
  try {
    const conditions = [
      eq(transactions.userId, userId),
      eq(transactions.isTransfer, false) // Exclude transfers from category spending
    ]
    
    if (startDate) {
      conditions.push(gte(transactions.transactionDate, startDate))
    }
    
    if (endDate) {
      conditions.push(lte(transactions.transactionDate, endDate))
    }

    if (accountId) {
      conditions.push(eq(transactions.accountId, accountId))
    }

    const result = await db
      .select({
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        totalAmount: sql<string>`abs(sum(${transactions.amount}))`,
        transactionCount: count(),
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(...conditions))
      .groupBy(transactions.categoryId, categories.name, categories.color)
      .orderBy(desc(sql`abs(sum(${transactions.amount}))`))

    return result as Array<{
      categoryId: string | null
      categoryName: string | null
      categoryColor: string | null
      totalAmount: string | null
      transactionCount: number
    }>
  } catch (error) {
    console.error('Error getting category spending:', error)
    return []
  }
}

// Recurring transactions utilities
export async function getUserRecurringTransactions(userId: string): Promise<any[]> {
  try {
    const result = await db
      .select({
        recurringTransaction: recurringTransactions,
        account: accounts,
        category: categories,
      })
      .from(recurringTransactions)
      .leftJoin(accounts, eq(recurringTransactions.accountId, accounts.id))
      .leftJoin(categories, eq(recurringTransactions.categoryId, categories.id))
      .where(eq(recurringTransactions.userId, userId))
      .orderBy(desc(recurringTransactions.createdAt))

    return result
  } catch (error) {
    console.error('Error getting user recurring transactions:', error)
    return []
  }
}

export async function getRecurringTransactionsSummary(userId: string): Promise<{
  total: number
  active: number
  due: number
  monthlyTotal: number
}> {
  try {
    const result = await db
      .select({
        id: recurringTransactions.id,
        amount: recurringTransactions.amount,
        isActive: recurringTransactions.isActive,
        nextDate: recurringTransactions.nextDate,
        frequency: recurringTransactions.frequency,
      })
      .from(recurringTransactions)
      .where(eq(recurringTransactions.userId, userId))

    const now = new Date()
    const dueTransactions = result.filter(rt => 
      rt.isActive && new Date(rt.nextDate) <= now
    )

    // Calculate monthly equivalent amounts
    const frequencyMultipliers = {
      daily: 30,
      weekly: 4.33,
      biweekly: 2.17,
      monthly: 1,
      quarterly: 0.33,
      yearly: 0.083
    }

    const monthlyTotal = result
      .filter(rt => rt.isActive)
      .reduce((sum, rt) => {
        const multiplier = frequencyMultipliers[rt.frequency as keyof typeof frequencyMultipliers] || 1
        return sum + (parseFloat(rt.amount) * multiplier)
      }, 0)

    return {
      total: result.length,
      active: result.filter(rt => rt.isActive).length,
      due: dueTransactions.length,
      monthlyTotal
    }
  } catch (error) {
    console.error('Error getting recurring transactions summary:', error)
    return { total: 0, active: 0, due: 0, monthlyTotal: 0 }
  }
}

// Calculate actual account balance from initial balance plus transactions
export async function calculateAccountBalance(accountId: string): Promise<number> {
  try {
    // Get the account's initial balance
    const accountResult = await db
      .select({ balance: accounts.balance })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1)

    const initialBalance = parseFloat(accountResult[0]?.balance || '0')

    // Get all transactions for this account
    const transactionsResult = await db
      .select({ amount: transactions.amount })
      .from(transactions)
      .where(eq(transactions.accountId, accountId))

    const transactionsTotal = transactionsResult.reduce((sum, tx) => {
      return sum + parseFloat(tx.amount || '0')
    }, 0)

    // Return initial balance plus transactions total
    return initialBalance + transactionsTotal
  } catch (error) {
    console.error('Error calculating account balance:', error)
    return 0
  }
}

// Get accounts with calculated balances
export async function getUserAccountsWithBalance(userId: string): Promise<(SelectAccount & { calculatedBalance: number })[]> {
  try {
    const userAccounts = await getUserAccounts(userId)
    
    const accountsWithBalance = await Promise.all(
      userAccounts.map(async (account) => {
        const calculatedBalance = await calculateAccountBalance(account.id)
        return {
          ...account,
          calculatedBalance
        }
      })
    )

    return accountsWithBalance
  } catch (error) {
    console.error('Error getting user accounts with balance:', error)
    return []
  }
}

// Clear all transaction data for a user
export async function clearAllTransactions(userId: string): Promise<number> {
  try {
    console.log(`Starting to clear all transactions for user: ${userId}`)
    
    // First, count how many transactions exist
    const countResult = await db
      .select({ count: count() })
      .from(transactions)
      .where(eq(transactions.userId, userId))
    
    const existingCount = countResult[0]?.count || 0
    console.log(`Found ${existingCount} transactions to delete for user: ${userId}`)
    
    if (existingCount === 0) {
      console.log(`No transactions found for user: ${userId}`)
      return 0
    }
    
    // Delete all transactions for the user
    const result = await db
      .delete(transactions)
      .where(eq(transactions.userId, userId))
    
    console.log(`Delete operation completed. Result:`, result)
    
    // Verify deletion by counting remaining transactions
    const remainingCountResult = await db
      .select({ count: count() })
      .from(transactions)
      .where(eq(transactions.userId, userId))
    
    const remainingCount = remainingCountResult[0]?.count || 0
    console.log(`Remaining transactions after deletion: ${remainingCount}`)
    
    return existingCount
  } catch (error) {
    console.error('Error clearing all transactions:', error)
    throw error
  }
}

// ============================================================================
// Budget Period Management Utilities
// ============================================================================

/**
 * Calculate next reset date based on period type and reset day
 */
export function calculateNextResetDate(
  currentDate: Date,
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly',
  resetDay?: number
): Date {
  const next = new Date(currentDate)
  
  switch (period) {
    case 'weekly':
      next.setDate(next.getDate() + 7)
      break
    case 'monthly':
      next.setMonth(next.getMonth() + 1)
      if (resetDay) {
        next.setDate(Math.min(resetDay, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()))
      }
      break
    case 'quarterly':
      next.setMonth(next.getMonth() + 3)
      next.setDate(1)
      break
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1)
      next.setMonth(0)
      next.setDate(1)
      break
  }
  
  return next
}

/**
 * Generate human-readable period label
 */
export function generatePeriodLabel(
  startDate: Date,
  endDate: Date,
  period: string
): string {
  const start = new Date(startDate)
  
  switch (period) {
    case 'weekly':
      return `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    case 'monthly':
      return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    case 'quarterly':
      const quarter = Math.floor(start.getMonth() / 3) + 1
      return `Q${quarter} ${start.getFullYear()}`
    case 'yearly':
      return start.getFullYear().toString()
    default:
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }
}

/**
 * Find budgets that need to be reset
 */
export async function findBudgetsNeedingReset(): Promise<SelectBudget[]> {
  const now = new Date()
  
  try {
    const result = await db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.isActive, true),
          eq(budgets.autoResetEnabled, true),
          lte(budgets.nextResetDate as any, now)
        )
      )
    
    return result as SelectBudget[]
  } catch (error) {
    console.error('Error finding budgets needing reset:', error)
    return []
  }
}

/**
 * Calculate total spending for a budget in a period
 */
export async function calculateBudgetSpending(
  budgetId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  try {
    const budget = await db
      .select()
      .from(budgets)
      .where(eq(budgets.id, budgetId))
      .limit(1)
    
    if (budget.length === 0) return 0
    
    const categoryIds = budget[0].categoryIds || []
    if (categoryIds.length === 0) return 0
    
    const txns = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, budget[0].userId),
          sql`${transactions.categoryId} = ANY(${categoryIds})`,
          gte(transactions.transactionDate, startDate),
          lte(transactions.transactionDate, endDate)
        )
      )
    
    return txns.reduce((sum, t) => {
      const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount
      return sum + Math.abs(amount)
    }, 0)
  } catch (error) {
    console.error('Error calculating budget spending:', error)
    return 0
  }
}

/**
 * Reset a budget for a new period
 */
export async function resetBudgetPeriod(budget: SelectBudget): Promise<void> {
  const now = new Date()
  
  try {
    // 1. Get current active period
    const currentPeriodResult = await db
      .select()
      .from(budgetPeriods)
      .where(
        and(
          eq(budgetPeriods.budgetId, budget.id),
          eq(budgetPeriods.status, 'active')
        )
      )
      .limit(1)
    
    if (currentPeriodResult.length === 0) {
      console.log(`No active period found for budget ${budget.id}, skipping reset`)
      return
    }
    
    const period = currentPeriodResult[0]
    
    // 2. Calculate spending for ending period
    const spentAmount = await calculateBudgetSpending(
      budget.id,
      period.periodStart,
      period.periodEnd
    )
    
    const totalBudgetNum = parseFloat(period.totalBudget.toString())
    const remaining = totalBudgetNum - spentAmount
    
    // 3. Calculate rollover amount
    let rolloverAmount = 0
    if (budget.rolloverUnused && remaining > 0) {
      switch (budget.rolloverStrategy) {
        case 'full':
          rolloverAmount = remaining
          break
        case 'partial':
          rolloverAmount = remaining * ((budget.rolloverPercentage || 0) / 100)
          break
        case 'capped':
          rolloverAmount = Math.min(remaining, parseFloat(budget.rolloverLimit?.toString() || '0'))
          break
      }
    }
    
    // 4. Complete current period
    await db
      .update(budgetPeriods)
      .set({
        status: 'completed',
        spentAmount: spentAmount.toString(),
        remainingAmount: remaining.toString(),
        utilizationPercentage: ((spentAmount / totalBudgetNum) * 100).toFixed(2),
        completedAt: now
      })
      .where(eq(budgetPeriods.id, period.id))
    
    // 5. Create new period
    const newPeriodStart = new Date(budget.nextResetDate as Date)
    const newPeriodEnd = calculateNextResetDate(newPeriodStart, budget.period as any, budget.resetDay || 1)
    const newBudgetAmount = parseFloat(budget.amount.toString())
    
    await db.insert(budgetPeriods).values({
      budgetId: budget.id,
      userId: budget.userId,
      periodStart: newPeriodStart,
      periodEnd: newPeriodEnd,
      allocatedAmount: newBudgetAmount.toString(),
      rolloverAmount: rolloverAmount.toString(),
      totalBudget: (newBudgetAmount + rolloverAmount).toString(),
      spentAmount: '0.00',
      status: 'active',
      periodLabel: generatePeriodLabel(newPeriodStart, newPeriodEnd, budget.period),
      createdAt: now
    })
    
    // 6. Update budget with new dates
    const nextResetDate = calculateNextResetDate(newPeriodStart, budget.period as any, budget.resetDay || 1)
    
    await db
      .update(budgets)
      .set({
        currentPeriodStart: newPeriodStart,
        currentPeriodEnd: newPeriodEnd,
        nextResetDate: nextResetDate,
        updatedAt: now
      })
      .where(eq(budgets.id, budget.id))
    
    console.log(`Successfully reset budget ${budget.id} for new period starting ${newPeriodStart.toISOString()}`)
  } catch (error) {
    console.error(`Error resetting budget ${budget.id}:`, error)
    throw error
  }
}

/**
 * Get all periods for a budget
 */
export async function getBudgetPeriods(budgetId: string): Promise<SelectBudgetPeriod[]> {
  try {
    const result = await db
      .select()
      .from(budgetPeriods)
      .where(eq(budgetPeriods.budgetId, budgetId))
      .orderBy(desc(budgetPeriods.periodStart))
    
    return result as SelectBudgetPeriod[]
  } catch (error) {
    console.error('Error getting budget periods:', error)
    return []
  }
}

/**
 * Get current active period for a budget
 */
export async function getCurrentBudgetPeriod(budgetId: string): Promise<SelectBudgetPeriod | null> {
  try {
    const result = await db
      .select()
      .from(budgetPeriods)
      .where(
        and(
          eq(budgetPeriods.budgetId, budgetId),
          eq(budgetPeriods.status, 'active')
        )
      )
      .limit(1)
    
    return (result as SelectBudgetPeriod[])?.[0] || null
  } catch (error) {
    console.error('Error getting current budget period:', error)
    return null
  }
}

/**
 * Get bills summary for dashboard
 */
export async function getBillsSummary(userId: string) {
  try {
    const { bills } = await import('@/db/schema')
    
    // Get all active bills
    const activeBills = await db
      .select()
      .from(bills)
      .where(
        and(
          eq(bills.userId, userId),
          eq(bills.isActive, true)
        )
      )
    
    if (activeBills.length === 0) {
      return {
        totalBills: 0,
        activeBills: 0,
        upcomingDue: 0,
        monthlyTotal: 0,
        nextBillAmount: 0,
        nextBillDate: null,
        nextBillName: null
      }
    }

    // Calculate monthly total based on frequency
    const frequencyMultipliers = {
      weekly: 4.33,
      biweekly: 2.17,
      monthly: 1,
      quarterly: 0.33,
      yearly: 0.083
    }

    const monthlyTotal = activeBills.reduce((sum, bill) => {
      const multiplier = frequencyMultipliers[bill.frequency as keyof typeof frequencyMultipliers] || 1
      return sum + (parseFloat(bill.amount) * multiplier)
    }, 0)

    // Find next due bill
    const now = new Date()
    const billsWithDates = activeBills
      .filter(bill => bill.dueDate)
      .map(bill => ({
        ...bill,
        dueDateObj: new Date(bill.dueDate!)
      }))
      .filter(bill => bill.dueDateObj >= now)
      .sort((a, b) => a.dueDateObj.getTime() - b.dueDateObj.getTime())

    const nextBill = billsWithDates[0]

    // Count bills due in the next 7 days
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const upcomingDue = billsWithDates.filter(bill => bill.dueDateObj <= nextWeek).length

    return {
      totalBills: activeBills.length,
      activeBills: activeBills.length,
      upcomingDue,
      monthlyTotal,
      nextBillAmount: nextBill ? parseFloat(nextBill.amount) : 0,
      nextBillDate: nextBill?.dueDate || null,
      nextBillName: nextBill?.name || null
    }
  } catch (error) {
    console.error('Error getting bills summary:', error)
    return {
      totalBills: 0,
      activeBills: 0,
      upcomingDue: 0,
      monthlyTotal: 0,
      nextBillAmount: 0,
      nextBillDate: null,
      nextBillName: null
    }
  }
}

/**
 * Get debts summary for dashboard
 */
export async function getDebtsSummary(userId: string) {
  try {
    const { debts } = await import('@/db/schema')
    
    // Get all active debts
    const activeDebts = await db
      .select()
      .from(debts)
      .where(
        and(
          eq(debts.userId, userId),
          eq(debts.status, 'active')
        )
      )
    
    if (activeDebts.length === 0) {
      return {
        totalDebts: 0,
        totalBalance: 0,
        monthlyPayments: 0,
        avgInterestRate: 0,
        highestInterestDebt: null,
        totalInterestPaidYTD: 0
      }
    }

    // Calculate totals
    const totalBalance = activeDebts.reduce((sum, debt) => {
      return sum + parseFloat(debt.currentBalance)
    }, 0)

    const monthlyPayments = activeDebts.reduce((sum, debt) => {
      return sum + parseFloat(debt.minimumPayment || '0')
    }, 0)

    // Calculate average interest rate (weighted by balance)
    const totalInterest = activeDebts.reduce((sum, debt) => {
      return sum + (parseFloat(debt.currentBalance) * parseFloat(debt.interestRate))
    }, 0)
    const avgInterestRate = totalBalance > 0 ? totalInterest / totalBalance : 0

    // Find highest interest debt
    const highestInterestDebt = activeDebts.reduce((highest, debt) => {
      const rate = parseFloat(debt.interestRate)
      const highestRate = highest ? parseFloat(highest.interestRate) : 0
      return rate > highestRate ? debt : highest
    }, activeDebts[0])

    // Calculate interest paid YTD (simplified - would need payment history)
    // TODO: Calculate from payment history when available
    const totalInterestPaidYTD = 0

    return {
      totalDebts: activeDebts.length,
      totalBalance,
      monthlyPayments,
      avgInterestRate,
      highestInterestDebt: highestInterestDebt ? {
        name: highestInterestDebt.name,
        balance: parseFloat(highestInterestDebt.currentBalance),
        rate: parseFloat(highestInterestDebt.interestRate)
      } : null,
      totalInterestPaidYTD
    }
  } catch (error) {
    console.error('Error getting debts summary:', error)
    return {
      totalDebts: 0,
      totalBalance: 0,
      monthlyPayments: 0,
      avgInterestRate: 0,
      highestInterestDebt: null,
      totalInterestPaidYTD: 0
    }
  }
}
