import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { isValid, parse } from 'date-fns'
import { z } from 'zod'
import { keywordCategory } from '@/lib/categorise'
import { extractMerchant } from '@/lib/csv-processing'
import type { TransactionData } from './types'

export interface GeminiConfig {
  apiKey: string
  model: string
}

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash'

export const aiStatementSchema = z.object({
  statementDate: z.string().describe('Statement date as YYYY-MM-DD'),
  accountNumberLast4: z.string().describe('Last 4 digits of the account or card number, or empty string'),
  openingBalance: z.number().describe('Opening balance exactly as printed, as a plain number'),
  closingBalance: z.number().describe('Closing balance exactly as printed, as a plain number'),
  transactions: z
    .array(
      z.object({
        date: z.string().describe('Transaction date as YYYY-MM-DD'),
        description: z.string(),
        amount: z
          .number()
          .describe('Negative for money out (purchases, fees, interest, withdrawals); positive for money in (payments, refunds, deposits)'),
      })
    )
    .describe('Every transaction line on the statement, in order'),
})

export type AiStatement = z.infer<typeof aiStatementSchema>

export interface BalanceCheck {
  ok: boolean
  /** Which sign convention reconciled: card/loan statements (balance owed) or deposit accounts. */
  convention: 'liability' | 'asset' | null
  openingBalance: number
  closingBalance: number
  transactionTotal: number
  /** Smallest absolute gap between the closing balance and either convention. */
  difference: number
  reason?: string
}

const toCents = (n: number) => Math.round(n * 100)

/**
 * openingBalance + sum(transactions) should equal closingBalance (±0.01).
 *
 * Amounts use the app's sign (negative = money out). A credit card statement prints the balance
 * *owed*, so spending raises it: closing = opening - sum. A deposit account is the opposite:
 * closing = opening + sum. Either convention reconciling counts as a pass.
 */
export function checkStatementBalance(statement: Pick<AiStatement, 'openingBalance' | 'closingBalance' | 'transactions'>): BalanceCheck {
  const total = statement.transactions.reduce((sum, t) => sum + toCents(t.amount), 0)
  const opening = toCents(statement.openingBalance)
  const closing = toCents(statement.closingBalance)

  const asset = Math.abs(opening + total - closing)
  const liability = Math.abs(opening - total - closing)
  const best = Math.min(asset, liability)
  const ok = best <= 1

  return {
    ok,
    convention: ok ? (liability <= asset ? 'liability' : 'asset') : null,
    openingBalance: statement.openingBalance,
    closingBalance: statement.closingBalance,
    transactionTotal: total / 100,
    difference: best / 100,
    reason: ok ? undefined : `Opening balance and transactions do not add up to the closing balance (off by ${(best / 100).toFixed(2)})`,
  }
}

export type GenerateStatement = (args: { config: GeminiConfig; pdf: Uint8Array }) => Promise<AiStatement>

const PROMPT = `Extract the data from this bank or credit card statement PDF.
- Include every transaction line, nothing else (no totals, no balance carried forward rows).
- Dates must be YYYY-MM-DD. Statements are Australian: dates are day/month/year.
- amount: negative for money leaving the account or increasing a card balance (purchases, fees, interest); positive for money coming in (payments, refunds, deposits).
- openingBalance and closingBalance: copy the printed values as plain numbers. Do not change their sign.`

const generateWithGemini: GenerateStatement = async ({ config, pdf }) => {
  const google = createGoogleGenerativeAI({ apiKey: config.apiKey })
  const { object } = await generateObject({
    model: google(config.model),
    schema: aiStatementSchema,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: PROMPT },
          { type: 'file', data: pdf, mediaType: 'application/pdf' },
        ],
      },
    ],
  })
  return object
}

export interface AiParseResult {
  transactions: TransactionData[]
  statement: AiStatement
  balanceCheck: BalanceCheck
  /** Rows the model returned with an unusable date; dropped from `transactions`. */
  droppedRows: number
}

const isIsoDate = (value: string) => isValid(parse(value, 'yyyy-MM-dd', new Date()))

/**
 * Parse an arbitrary statement PDF with Gemini and verify the result against the printed balances.
 * When the balance check fails every row is flagged `needsReview`.
 */
export async function parseStatementWithAI(
  pdf: Uint8Array,
  accountId: string,
  config: GeminiConfig,
  generate: GenerateStatement = generateWithGemini
): Promise<AiParseResult> {
  const statement = await generate({ config, pdf })

  const balanceCheck = checkStatementBalance(statement)
  const usable = statement.transactions.filter(t => isIsoDate(t.date) && Number.isFinite(t.amount))
  const droppedRows = statement.transactions.length - usable.length
  if (droppedRows > 0) {
    balanceCheck.ok = false
    balanceCheck.convention = null
    balanceCheck.reason = `${droppedRows} row(s) had an unreadable date or amount`
  }

  const needsReview = !balanceCheck.ok
  const transactions: TransactionData[] = usable.map(t => {
    const description = t.description.trim()
    const merchant = extractMerchant(description)
    return {
      date: t.date,
      description,
      amount: t.amount,
      category: keywordCategory(description, merchant, t.amount),
      account: accountId,
      merchant,
      type: t.amount < 0 ? 'debit' : 'credit',
      needsReview,
    }
  })

  return { transactions, statement, balanceCheck, droppedRows }
}
