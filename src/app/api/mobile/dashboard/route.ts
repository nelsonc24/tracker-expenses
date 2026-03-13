import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { transactions, accounts, budgets, goals } from '@/db/schema'
import { eq, and, gte, desc, sql } from 'drizzle-orm'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)
    const lastMonthStart = startOfMonth(subMonths(now, 1))

    // Get total balance across all accounts
    const accountsData = await db
      .select({
        totalBalance: sql<string>`COALESCE(SUM(CAST(${accounts.balance} AS NUMERIC)), 0)`,
        count: sql<number>`COUNT(*)::int`
      })
      .from(accounts)
      .where(and(
        eq(accounts.userId, userId),
        eq(accounts.isActive, true)
      ))

    // Get current month transactions
    const monthTransactions = await db
      .select({
        amount: transactions.amount,
        type: transactions.type,
        isTransfer: transactions.isTransfer
      })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        gte(transactions.transactionDate, monthStart)
      ))

    // Calculate income, expenses
    let totalIncome = 0
    let totalExpenses = 0

    monthTransactions.forEach(t => {
      const amount = parseFloat(t.amount)
      if (t.isTransfer) return // Skip transfers
      
      if (t.type === 'credit') {
        totalIncome += amount
      } else if (t.type === 'debit') {
        totalExpenses += Math.abs(amount)
      }
    })

    // Get budget progress
    const activeBudgets = await db
      .select()
      .from(budgets)
      .where(and(
        eq(budgets.userId, userId),
        eq(budgets.isActive, true)
      ))

    const budgetProgress = activeBudgets.length > 0 ? {
      total: activeBudgets.reduce((sum, b) => sum + parseFloat(b.amount), 0),
      spent: totalExpenses,
      percentage: activeBudgets.length > 0 
        ? (totalExpenses / activeBudgets.reduce((sum, b) => sum + parseFloat(b.amount), 0)) * 100
        : 0
    } : null

    // Get active goals
    const activeGoals = await db
      .select()
      .from(goals)
      .where(and(
        eq(goals.userId, userId),
        eq(goals.status, 'active')
      ))
      .orderBy(desc(goals.createdAt))
      .limit(3)

    const goalsData = activeGoals.map(g => {
      const current = parseFloat(g.currentAmount ?? '0')
      const target = parseFloat(g.targetAmount)
      return {
        id: g.id,
        name: g.name,
        emoji: g.emoji,
        currentAmount: current,
        targetAmount: target,
        percentage: target > 0 ? (current / target) * 100 : 0,
        color: g.color
      }
    })

    // Get recent transactions
    const recentTransactions = await db
      .select({
        id: transactions.id,
        amount: transactions.amount,
        description: transactions.description,
        date: transactions.transactionDate,
        type: transactions.type,
        accountName: accounts.name,
        isTransfer: transactions.isTransfer
      })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.transactionDate))
      .limit(10)

    return NextResponse.json({
      balance: {
        total: parseFloat(accountsData[0]?.totalBalance || '0'),
        accounts: accountsData[0]?.count || 0
      },
      thisMonth: {
        income: totalIncome,
        expenses: totalExpenses,
        net: totalIncome - totalExpenses
      },
      budgets: budgetProgress,
      goals: goalsData,
      recentTransactions: recentTransactions.map(t => ({
        id: t.id,
        amount: parseFloat(t.amount),
        description: t.description,
        date: t.date,
        type: t.type,
        accountName: t.accountName,
        isTransfer: t.isTransfer
      }))
    })

  } catch (error) {
    console.error('[Mobile Dashboard Error]:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch dashboard data' 
    }, { status: 500 })
  }
}
