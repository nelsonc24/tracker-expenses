import { currentUser } from '@clerk/nextjs/server'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText, tool, convertToModelMessages, stepCountIs } from 'ai'
import { decrypt } from '@/lib/encryption'
import { z } from 'zod'
import {
  getUserTransactions,
  getTransactionSummary,
  getCategorySpending,
  getUserBudgets,
  calculateBudgetSpending,
  getDebtsSummary,
  getUserAccountsWithBalance,
  getCurrentUser,
} from '@/lib/db-utils'
import { db } from '@/db'
import { goals } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { subDays, subMonths, startOfMonth, endOfMonth, startOfYear, format } from 'date-fns'

export const maxDuration = 60

function parseDateRange(period: string): { startDate: Date; endDate: Date } {
  const now = new Date()
  switch (period) {
    case '7d':
      return { startDate: subDays(now, 7), endDate: now }
    case '30d':
      return { startDate: subDays(now, 30), endDate: now }
    case '3m':
      return { startDate: subMonths(now, 3), endDate: now }
    case '6m':
      return { startDate: subMonths(now, 6), endDate: now }
    case '1y':
      return { startDate: subMonths(now, 12), endDate: now }
    case 'this_month':
      return { startDate: startOfMonth(now), endDate: endOfMonth(now) }
    case 'last_month': {
      const lastMonth = subMonths(now, 1)
      return { startDate: startOfMonth(lastMonth), endDate: endOfMonth(lastMonth) }
    }
    case 'ytd':
      return { startDate: startOfYear(now), endDate: now }
    default:
      return { startDate: subDays(now, 30), endDate: now }
  }
}

export async function POST(req: Request) {
  const user = await currentUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }
  const userId = user.id

  // Get user preferences (currency) and optionally their personal Gemini API key
  const dbUser = await getCurrentUser()
  const currency = dbUser?.preferences
    ? ((dbUser.preferences as unknown) as Record<string, string>)?.currency ?? 'AUD'
    : 'AUD'

  // Use the user's own Gemini key if stored; fall back to the shared system key
  let googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (dbUser?.geminiApiKey) {
    try {
      googleApiKey = decrypt(dbUser.geminiApiKey)
    } catch {
      // Decryption failed (e.g. key rotation) — continue with system key
    }
  }
  const googleClient = createGoogleGenerativeAI({ apiKey: googleApiKey })

  const { messages } = await req.json()

  // Convert UIMessages (from @ai-sdk/react useChat) to ModelMessages for streamText
  const modelMessages = await convertToModelMessages(messages)

  const result = streamText({
    model: googleClient('gemini-2.0-flash'),
    system: `You are a smart, friendly personal finance assistant for a budgeting and expense tracking app called ExpenseTracker.
The user's preferred currency is ${currency}.

Your role:
- Answer questions about the user's spending, income, budgets, debts, goals, and accounts
- Provide actionable financial insights and suggestions
- Help the user understand their financial health
- Be concise, friendly, and data-driven

Guidelines:
- Always use the available tools to fetch live data before answering financial questions
- Format currency values using ${currency} (e.g. "$1,234.56")
- When showing lists, keep them brief (top 5 max unless asked for more)
- If the user asks about a specific period, use the matching period key: 7d, 30d, 3m, 6m, 1y, this_month, last_month, ytd
- Default to "this_month" for general spending questions unless the user specifies otherwise
- Proactively highlight anomalies, overspending, or savings opportunities
- Do NOT make up data — always fetch it using tools
- Today is ${format(new Date(), 'EEEE, d MMMM yyyy')}`,

    messages: modelMessages,
    stopWhen: stepCountIs(5),

    tools: {
      getTransactionSummary: tool({
        description:
          'Get a summary of the user\'s transactions including total income, total expenses, net amount, and transaction count for a given period. Use this for general financial health questions.',
        inputSchema: z.object({
          period: z
            .enum(['7d', '30d', '3m', '6m', '1y', 'this_month', 'last_month', 'ytd'])
            .describe('The time period to query. Use this_month for current month, last_month for previous month.'),
        }),
        execute: async ({ period }) => {
          const { startDate, endDate } = parseDateRange(period)
          const summary = await getTransactionSummary(userId, startDate, endDate)
          return {
            period,
            startDate: format(startDate, 'dd MMM yyyy'),
            endDate: format(endDate, 'dd MMM yyyy'),
            ...summary,
          }
        },
      }),

      getCategoryBreakdown: tool({
        description:
          'Get spending broken down by category for a given period. Use this to answer questions like "what did I spend most on?" or "how much did I spend on groceries?"',
        inputSchema: z.object({
          period: z
            .enum(['7d', '30d', '3m', '6m', '1y', 'this_month', 'last_month', 'ytd'])
            .describe('The time period to query.'),
          topN: z
            .number()
            .int()
            .min(1)
            .max(20)
            .optional()
            .describe('Return only the top N categories by spending. Defaults to 10.'),
        }),
        execute: async ({ period, topN = 10 }) => {
          const { startDate, endDate } = parseDateRange(period)
          const categories = await getCategorySpending(userId, startDate, endDate)
          const top = categories.slice(0, topN).map((c) => ({
            category: c.categoryName ?? 'Uncategorised',
            amount: parseFloat(c.totalAmount ?? '0'),
            transactions: c.transactionCount,
          }))
          const total = top.reduce((s, c) => s + c.amount, 0)
          return {
            period,
            startDate: format(startDate, 'dd MMM yyyy'),
            endDate: format(endDate, 'dd MMM yyyy'),
            categories: top.map((c) => ({
              ...c,
              percentage: total > 0 ? ((c.amount / total) * 100).toFixed(1) + '%' : '0%',
            })),
            totalSpending: total,
          }
        },
      }),

      getRecentTransactions: tool({
        description:
          'Get a list of recent transactions. Use this when the user asks to see their recent transactions or search for specific purchases.',
        inputSchema: z.object({
          period: z
            .enum(['7d', '30d', '3m', '6m', '1y', 'this_month', 'last_month', 'ytd'])
            .describe('The time period to fetch transactions for.'),
          limit: z
            .number()
            .int()
            .min(1)
            .max(50)
            .optional()
            .describe('Max number of transactions to return. Defaults to 10.'),
          search: z.string().optional().describe('Optional keyword to search descriptions or merchants.'),
        }),
        execute: async ({ period, limit = 10, search }) => {
          const { startDate, endDate } = parseDateRange(period)
          const results = await getUserTransactions(userId, {
            startDate,
            endDate,
            limit,
            search,
            sortBy: 'date',
            sortOrder: 'desc',
          })
          return {
            period,
            count: results.length,
            transactions: results.map(({ transaction: t, category, account }) => ({
              date: format(new Date(t.transactionDate), 'dd MMM yyyy'),
              description: t.description,
              merchant: t.merchant ?? null,
              amount: parseFloat(t.amount),
              type: t.type,
              category: category?.name ?? 'Uncategorised',
              account: account?.name ?? 'Unknown',
            })),
          }
        },
      }),

      getBudgetStatus: tool({
        description:
          'Get the status of the user\'s budgets including how much they\'ve spent vs allocated. Use this to answer questions about budget tracking.',
        inputSchema: z.object({}),
        execute: async () => {
          const now = new Date()
          const userBudgets = await getUserBudgets(userId)
          const activeBudgets = userBudgets.filter((b) => b.isActive !== false)

          const budgetStatuses = await Promise.all(
            activeBudgets.map(async (budget) => {
              const periodStart = budget.currentPeriodStart ?? startOfMonth(now)
              const periodEnd = budget.currentPeriodEnd ?? endOfMonth(now)
              const spent = await calculateBudgetSpending(budget.id, periodStart, periodEnd)
              const allocated = parseFloat(budget.amount)
              const remaining = allocated - spent
              const percentUsed = allocated > 0 ? ((spent / allocated) * 100).toFixed(1) : '0'
              return {
                name: budget.name,
                period: budget.period,
                allocated,
                spent,
                remaining,
                percentUsed: percentUsed + '%',
                status: spent > allocated ? 'over_budget' : spent / allocated >= 0.9 ? 'near_limit' : 'on_track',
              }
            })
          )

          return {
            totalBudgets: budgetStatuses.length,
            budgets: budgetStatuses,
            overBudget: budgetStatuses.filter((b) => b.status === 'over_budget').length,
            nearLimit: budgetStatuses.filter((b) => b.status === 'near_limit').length,
          }
        },
      }),

      getDebtSummary: tool({
        description:
          'Get a summary of the user\'s active debts including total balance, monthly payments, and interest rates. Use this for debt-related questions.',
        inputSchema: z.object({}),
        execute: async () => {
          const summary = await getDebtsSummary(userId)
          return summary
        },
      }),

      getGoalsSummary: tool({
        description:
          'Get a summary of the user\'s savings goals including progress towards each goal. Use this when asked about goals or savings targets.',
        inputSchema: z.object({}),
        execute: async () => {
          const userGoals = await db
            .select()
            .from(goals)
            .where(and(eq(goals.userId, userId)))
            .orderBy(desc(goals.createdAt))
            .limit(20)

          return {
            totalGoals: userGoals.length,
            goals: userGoals.map((g) => {
              const current = parseFloat(g.currentAmount ?? '0')
              const target = parseFloat(g.targetAmount)
              const progress = target > 0 ? ((current / target) * 100).toFixed(1) + '%' : '0%'
              return {
                name: g.name,
                type: g.type,
                targetAmount: target,
                currentAmount: current,
                progress,
                status: g.status,
                targetDate: g.targetDate ? format(new Date(g.targetDate), 'dd MMM yyyy') : null,
                remaining: Math.max(0, target - current),
              }
            }),
          }
        },
      }),

      getAccountsSummary: tool({
        description:
          'Get all the user\'s accounts with their current balances. Use this when asked about account balances or net worth.',
        inputSchema: z.object({}),
        execute: async () => {
          const userAccounts = await getUserAccountsWithBalance(userId)
          const activeAccounts = userAccounts.filter((a) => a.isActive !== false)
          const totalBalance = activeAccounts.reduce((sum, a) => sum + a.calculatedBalance, 0)
          return {
            totalAccounts: activeAccounts.length,
            totalBalance,
            accounts: activeAccounts.map((a) => ({
              name: a.name,
              type: a.accountType,
              institution: a.institution ?? null,
              balance: a.calculatedBalance,
              currency: a.currency ?? currency,
            })),
          }
        },
      }),
    },
  })

  return result.toUIMessageStreamResponse()
}
