import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { users, accounts, categories, transactions, budgets } from '@/db/schema'
import { eq, and, desc, asc, count, sum, gte, lte, like, or } from 'drizzle-orm'

// Type helpers for better TypeScript support
type InsertUser = typeof users.$inferInsert
type SelectUser = typeof users.$inferSelect
type InsertAccount = typeof accounts.$inferInsert
type SelectAccount = typeof accounts.$inferSelect
type InsertCategory = typeof categories.$inferInsert
type SelectCategory = typeof categories.$inferSelect
type InsertTransaction = typeof transactions.$inferInsert
type SelectTransaction = typeof transactions.$inferSelect
type InsertBudget = typeof budgets.$inferInsert
type SelectBudget = typeof budgets.$inferSelect

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
  id: string
  email: string
  firstName?: string
  lastName?: string
  imageUrl?: string
}): Promise<SelectUser | null> {
  try {
    const existingUser = await getCurrentUser()
    
    if (existingUser) {
      const result = await db
        .update(users)
        .set({
          ...userData,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userData.id))
        .returning()
      return (result as SelectUser[])?.[0] || null
    } else {
      const result = await db
        .insert(users)
        .values({
          ...userData,
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
        conditions.push(or(...searchConditions))
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
  transactionDate: Date
  type: 'debit' | 'credit' | 'transfer'
  tags?: string[]
  notes?: string
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
}): Promise<SelectBudget | null> {
  try {
    const result = await db
      .insert(budgets)
      .values({
        ...budgetData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()
    return (result as SelectBudget[])?.[0] || null
  } catch (error) {
    console.error('Error creating budget:', error)
    return null
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

    // Get expense total separately
    const expenseResult = await db
      .select({
        totalExpenses: sum(transactions.amount),
      })
      .from(transactions)
      .where(and(...conditions, lte(transactions.amount, '0')))

    // Get income total separately  
    const incomeResult = await db
      .select({
        totalIncome: sum(transactions.amount),
      })
      .from(transactions)
      .where(and(...conditions, gte(transactions.amount, '0')))

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
  endDate?: Date
): Promise<Array<{
  categoryId: string | null
  categoryName: string | null
  categoryColor: string | null
  totalAmount: string | null
  transactionCount: number
}>> {
  try {
    const conditions = [eq(transactions.userId, userId)]
    
    if (startDate) {
      conditions.push(gte(transactions.transactionDate, startDate))
    }
    
    if (endDate) {
      conditions.push(lte(transactions.transactionDate, endDate))
    }

    const result = await db
      .select({
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        totalAmount: sum(transactions.amount),
        transactionCount: count(),
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(...conditions))
      .groupBy(transactions.categoryId, categories.name, categories.color)
      .orderBy(desc(sum(transactions.amount)))

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
