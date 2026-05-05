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
  getRecurringTransactionsSummary,
} from '@/lib/db-utils'
import { db } from '@/db'
import { goals, categories as categoriesTable, transactions as transactionsTable } from '@/db/schema'
import { eq, and, desc, sql, count, gte, lte } from 'drizzle-orm'
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

function getPreviousPeriodRange(period: string): { startDate: Date; endDate: Date; label: string } {
  const now = new Date()
  switch (period) {
    case '7d':
      return { startDate: subDays(now, 14), endDate: subDays(now, 7), label: 'Previous 7 days' }
    case '30d':
      return { startDate: subDays(now, 60), endDate: subDays(now, 30), label: 'Previous 30 days' }
    case '3m':
      return { startDate: subMonths(now, 6), endDate: subMonths(now, 3), label: 'Previous 3 months' }
    case '6m':
      return { startDate: subMonths(now, 12), endDate: subMonths(now, 6), label: 'Previous 6 months' }
    case '1y':
      return { startDate: subMonths(now, 24), endDate: subMonths(now, 12), label: 'Previous year' }
    case 'this_month': {
      const lastMonth = subMonths(now, 1)
      return { startDate: startOfMonth(lastMonth), endDate: endOfMonth(lastMonth), label: format(lastMonth, 'MMMM yyyy') }
    }
    case 'last_month': {
      const twoMonthsAgo = subMonths(now, 2)
      return { startDate: startOfMonth(twoMonthsAgo), endDate: endOfMonth(twoMonthsAgo), label: format(twoMonthsAgo, 'MMMM yyyy') }
    }
    case 'ytd': {
      const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
      const lastYearSameDay = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      return { startDate: lastYearStart, endDate: lastYearSameDay, label: `YTD ${now.getFullYear() - 1}` }
    }
    default:
      return { startDate: subDays(now, 60), endDate: subDays(now, 30), label: 'Previous 30 days' }
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

  // Require the user's own Gemini API key — no shared system key fallback
  if (!dbUser?.geminiApiKey) {
    return Response.json(
      { error: 'no_api_key', message: 'Please add your Gemini API key in Settings to use the AI assistant.' },
      { status: 402 }
    )
  }

  let googleApiKey: string
  try {
    googleApiKey = decrypt(dbUser.geminiApiKey)
  } catch {
    return Response.json(
      { error: 'decrypt_failed', message: 'Your Gemini API key could not be decrypted. Please re-enter it in Settings.' },
      { status: 400 }
    )
  }

  const googleClient = createGoogleGenerativeAI({ apiKey: googleApiKey })

  const { messages } = await req.json()

  // Convert UIMessages (from @ai-sdk/react useChat) to ModelMessages for streamText
  const modelMessages = await convertToModelMessages(messages)

  const geminiModel = (dbUser?.preferences as Record<string, string> | null)?.geminiModel ?? 'gemini-2.5-flash'

  const result = streamText({
    model: googleClient(geminiModel),
    system: `You are a smart, friendly personal finance assistant for a budgeting and expense tracking app called ExpenseTracker.
The user's preferred currency is ${currency}.
Today is ${format(new Date(), 'EEEE, d MMMM yyyy')}.

Your role:
- Answer questions about the user's spending, income, budgets, debts, goals, and accounts
- Identify spending trends, anomalies, and savings opportunities
- Provide concise, data-driven, actionable insights — not generic advice

Data rules:
- ALWAYS fetch live data with tools before answering — never invent numbers
- When showing lists, show top 5 unless the user asks for more
- Default to "this_month" for general spending questions unless specified

Period keys: 7d, 30d, 3m, 6m, 1y, this_month, last_month, ytd

Tool selection guide:
- General financial summary → getTransactionSummary (also returns savings rate)
- Category breakdown → getCategoryBreakdown (call listCategories first when looking for a specific category)
- Month-over-month or trend comparison → getSpendingTrends
- Top shops/merchants → getTopMerchants
- Budget tracking → getBudgetStatus (includes projected end-of-period spending)
- Savings goals → getGoalsSummary (includes monthly savings required)
- Debt overview → getDebtSummary
- Account balances/net worth → getAccountsSummary
- Recurring bills/subscriptions → getRecurringExpenses
- Recent or specific transactions → getRecentTransactions

Proactive insights to offer:
- Savings rate = (income − expenses) / income × 100. Flag if ≥ 20% (healthy) or < 10% (needs attention)
- Flag overspent budgets and categories tracking high vs last month
- Highlight goal progress — especially ones close to completion or falling behind
- Point out large single transactions or merchants that dominate spending

Format guidelines:
- Use ${currency} for all monetary values (e.g. $1,234.56)
- Bold key figures using **markdown**
- Use bullet points for lists, tables for comparisons
- Keep responses focused — lead with the most important insight`,

    messages: modelMessages,
    stopWhen: stepCountIs(10),

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
          const savingsRate =
            summary.totalIncome > 0
              ? parseFloat(((summary.netAmount / summary.totalIncome) * 100).toFixed(1))
              : null
          return {
            period,
            startDate: format(startDate, 'dd MMM yyyy'),
            endDate: format(endDate, 'dd MMM yyyy'),
            ...summary,
            savingsRate: savingsRate !== null ? savingsRate + '%' : 'N/A',
          }
        },
      }),

      getCategoryBreakdown: tool({
        description:
          'Get spending broken down by category for a given period. Use this to answer questions like "what did I spend most on?" or "how much did I spend on groceries?" or "how much on utilities?". When the user asks about a specific category, provide the categorySearch param to filter results to that category (partial, case-insensitive match).',
        inputSchema: z.object({
          period: z
            .enum(['7d', '30d', '3m', '6m', '1y', 'this_month', 'last_month', 'ytd'])
            .describe('The time period to query.'),
          topN: z
            .number()
            .int()
            .min(1)
            .max(50)
            .optional()
            .describe('Return only the top N categories by spending. Defaults to 10. Ignored when categorySearch is provided.'),
          categorySearch: z
            .string()
            .optional()
            .describe('Filter to categories whose name contains this string (case-insensitive). Use this when the user asks about a specific category like "utilities", "rent", "groceries".'),
        }),
        execute: async ({ period, topN = 10, categorySearch }) => {
          const { startDate, endDate } = parseDateRange(period)
          const allCategories = await getCategorySpending(userId, startDate, endDate)

          let filtered = allCategories
          if (categorySearch) {
            const search = categorySearch.toLowerCase()
            filtered = allCategories.filter(
              (c) => c.categoryName?.toLowerCase().includes(search)
            )
          }

          const top = (categorySearch ? filtered : filtered.slice(0, topN)).map((c) => ({
            category: c.categoryName ?? 'Uncategorised',
            amount: parseFloat(c.totalAmount ?? '0'),
            transactions: c.transactionCount,
          }))
          const totalAll = allCategories.reduce((s, c) => s + parseFloat(c.totalAmount ?? '0'), 0)
          return {
            period,
            startDate: format(startDate, 'dd MMM yyyy'),
            endDate: format(endDate, 'dd MMM yyyy'),
            categories: top.map((c) => ({
              ...c,
              percentage: totalAll > 0 ? ((c.amount / totalAll) * 100).toFixed(1) + '%' : '0%',
            })),
            totalSpending: top.reduce((s, c) => s + c.amount, 0),
            matchedSearch: categorySearch ?? null,
            notFound: categorySearch && filtered.length === 0
              ? `No transactions found for a category matching "${categorySearch}" in this period. Try calling listCategories to see available category names.`
              : null,
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
              // Project end-of-period spending based on daily run rate
              const msPerDay = 86_400_000
              const daysTotal = Math.max(1, Math.round((periodEnd.getTime() - periodStart.getTime()) / msPerDay))
              const daysElapsed = Math.max(1, Math.round((now.getTime() - periodStart.getTime()) / msPerDay))
              const dailyRate = spent / daysElapsed
              const projectedTotal = parseFloat((dailyRate * daysTotal).toFixed(2))
              const projectedStatus =
                projectedTotal > allocated * 1.1 ? 'will_exceed' : projectedTotal > allocated ? 'at_risk' : 'on_track'
              return {
                name: budget.name,
                period: budget.period,
                allocated,
                spent,
                remaining,
                percentUsed: percentUsed + '%',
                daysElapsed,
                daysTotal,
                projectedTotal,
                projectedStatus,
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

          const now = new Date()
          return {
            totalGoals: userGoals.length,
            goals: userGoals.map((g) => {
              const current = parseFloat(g.currentAmount ?? '0')
              const target = parseFloat(g.targetAmount)
              const progress = target > 0 ? ((current / target) * 100).toFixed(1) + '%' : '0%'
              const remaining = Math.max(0, target - current)
              let monthlyRequired: number | null = null
              if (g.targetDate && remaining > 0 && g.status === 'active') {
                const msLeft = new Date(g.targetDate).getTime() - now.getTime()
                const monthsLeft = Math.max(0, msLeft / (30.44 * 24 * 60 * 60 * 1000))
                monthlyRequired = monthsLeft > 0 ? parseFloat((remaining / monthsLeft).toFixed(2)) : remaining
              }
              return {
                name: g.name,
                type: g.type,
                targetAmount: target,
                currentAmount: current,
                progress,
                status: g.status,
                targetDate: g.targetDate ? format(new Date(g.targetDate), 'dd MMM yyyy') : null,
                remaining,
                monthlyRequired,
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

      listCategories: tool({
        description:
          'List all category names available for this user. Call this first when the user asks about a specific category to discover the exact name before searching. Also shows spending amount for the current month for each category.',
        inputSchema: z.object({}),
        execute: async () => {
          // Get all user categories
          const userCategories = await db
            .select({ id: categoriesTable.id, name: categoriesTable.name })
            .from(categoriesTable)
            .where(eq(categoriesTable.userId, userId))
            .orderBy(categoriesTable.name)

          // Get this month spending for each category
          const { startDate, endDate } = parseDateRange('this_month')
          const spending = await getCategorySpending(userId, startDate, endDate)
          const spendingMap = Object.fromEntries(
            spending.map((s) => [s.categoryName?.toLowerCase() ?? '', parseFloat(s.totalAmount ?? '0')])
          )

          return {
            totalCategories: userCategories.length,
            categories: userCategories.map((c) => ({
              name: c.name,
              spentThisMonth: spendingMap[c.name.toLowerCase()] ?? 0,
            })),
          }
        },
      }),

      getSpendingTrends: tool({
        description:
          'Compare spending and income between the current period and the previous equivalent period. Use this when the user asks "how does my spending compare to last month?", "am I spending more than usual?", "show me my spending trends", or for month-over-month analysis.',
        inputSchema: z.object({
          period: z
            .enum(['7d', '30d', '3m', '6m', '1y', 'this_month', 'last_month', 'ytd'])
            .describe('The current period to analyse. The tool automatically compares it against the prior equivalent period.'),
        }),
        execute: async ({ period }) => {
          const { startDate: currentStart, endDate: currentEnd } = parseDateRange(period)
          const { startDate: prevStart, endDate: prevEnd, label: prevLabel } = getPreviousPeriodRange(period)

          const [currentSummary, prevSummary, currentCategories, prevCategories] = await Promise.all([
            getTransactionSummary(userId, currentStart, currentEnd),
            getTransactionSummary(userId, prevStart, prevEnd),
            getCategorySpending(userId, currentStart, currentEnd),
            getCategorySpending(userId, prevStart, prevEnd),
          ])

          const pct = (curr: number, prev: number) =>
            prev > 0 ? `${curr >= prev ? '+' : ''}${(((curr - prev) / prev) * 100).toFixed(1)}%` : 'N/A'

          const prevCategoryMap = new Map(
            prevCategories.map((c) => [c.categoryName?.toLowerCase() ?? '', parseFloat(c.totalAmount ?? '0')])
          )
          const categoryComparison = currentCategories.slice(0, 10).map((c) => {
            const curr = parseFloat(c.totalAmount ?? '0')
            const prev = prevCategoryMap.get(c.categoryName?.toLowerCase() ?? '') ?? 0
            return {
              category: c.categoryName ?? 'Uncategorised',
              current: curr,
              previous: prev,
              change: pct(curr, prev),
              trend: curr > prev * 1.1 ? 'increasing' : curr < prev * 0.9 ? 'decreasing' : 'stable',
            }
          })

          const savingsRateFor = (s: { totalIncome: number; netAmount: number }) =>
            s.totalIncome > 0 ? parseFloat(((s.netAmount / s.totalIncome) * 100).toFixed(1)) + '%' : 'N/A'

          return {
            currentPeriod: {
              label: period === 'this_month' ? format(currentStart, 'MMMM yyyy') : period,
              startDate: format(currentStart, 'dd MMM yyyy'),
              endDate: format(currentEnd, 'dd MMM yyyy'),
              totalIncome: currentSummary.totalIncome,
              totalExpenses: currentSummary.totalExpenses,
              netAmount: currentSummary.netAmount,
              savingsRate: savingsRateFor(currentSummary),
            },
            previousPeriod: {
              label: prevLabel,
              startDate: format(prevStart, 'dd MMM yyyy'),
              endDate: format(prevEnd, 'dd MMM yyyy'),
              totalIncome: prevSummary.totalIncome,
              totalExpenses: prevSummary.totalExpenses,
              netAmount: prevSummary.netAmount,
              savingsRate: savingsRateFor(prevSummary),
            },
            changes: {
              expenses: pct(currentSummary.totalExpenses, prevSummary.totalExpenses),
              income: pct(currentSummary.totalIncome, prevSummary.totalIncome),
              netAmountDiff: currentSummary.netAmount - prevSummary.netAmount,
            },
            categoryComparison,
          }
        },
      }),

      getTopMerchants: tool({
        description:
          'Get the top merchants or places where the user spends money in a given period. Use this when asked "where do I spend most?", "which shops do I visit most?", "what are my biggest purchases?", or "where does my money go?".',
        inputSchema: z.object({
          period: z
            .enum(['7d', '30d', '3m', '6m', '1y', 'this_month', 'last_month', 'ytd'])
            .describe('The time period to analyse.'),
          topN: z
            .number()
            .int()
            .min(1)
            .max(20)
            .optional()
            .describe('Number of top merchants to return. Defaults to 10.'),
        }),
        execute: async ({ period, topN = 10 }) => {
          const { startDate, endDate } = parseDateRange(period)
          const merchants = await db
            .select({
              name: sql<string>`COALESCE(NULLIF(${transactionsTable.merchant}, ''), ${transactionsTable.description})`,
              total: sql<string>`abs(sum(${transactionsTable.amount}))`,
              visits: count(),
            })
            .from(transactionsTable)
            .where(
              and(
                eq(transactionsTable.userId, userId),
                eq(transactionsTable.type, 'debit'),
                eq(transactionsTable.isTransfer, false),
                gte(transactionsTable.transactionDate, startDate),
                lte(transactionsTable.transactionDate, endDate),
              )
            )
            .groupBy(sql`COALESCE(NULLIF(${transactionsTable.merchant}, ''), ${transactionsTable.description})`)
            .orderBy(desc(sql`abs(sum(${transactionsTable.amount}))`))
            .limit(topN)

          const totalSpend = merchants.reduce((s, m) => s + parseFloat(m.total), 0)
          return {
            period,
            startDate: format(startDate, 'dd MMM yyyy'),
            endDate: format(endDate, 'dd MMM yyyy'),
            merchants: merchants.map((m) => ({
              name: m.name,
              total: parseFloat(m.total),
              visits: m.visits,
              shareOfSpend: totalSpend > 0 ? ((parseFloat(m.total) / totalSpend) * 100).toFixed(1) + '%' : '0%',
              avgPerVisit: m.visits > 0 ? parseFloat((parseFloat(m.total) / m.visits).toFixed(2)) : 0,
            })),
          }
        },
      }),

      getRecurringExpenses: tool({
        description:
          'Get a summary of the user\'s recurring expenses and subscriptions including their monthly cost. Use this when asked about bills, subscriptions, recurring payments, or fixed monthly costs.',
        inputSchema: z.object({}),
        execute: async () => {
          return await getRecurringTransactionsSummary(userId)
        },
      }),
    },
  })

  return result.toUIMessageStreamResponse()
}
