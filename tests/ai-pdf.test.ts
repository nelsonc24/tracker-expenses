import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createMemoryStore } from './helpers/memory-store'

vi.mock('@/db', () => ({ db: {} }))

const mockRegexParse = vi.hoisted(() => vi.fn())
vi.mock('@/lib/pdf-processing', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/pdf-processing')>()),
  parseCreditCardPDF: mockRegexParse,
}))

import { checkStatementBalance, ingest } from '@/lib/ingest'
import type { AiStatement } from '@/lib/ingest/ai-pdf'

describe('checkStatementBalance', () => {
  test('credit card: spending raises the balance owed', () => {
    // owe 1000, spend 100 (-100), pay 300 (+300) -> owe 800
    const result = checkStatementBalance({
      openingBalance: 1000,
      closingBalance: 800,
      transactions: [
        { date: '2025-09-01', description: 'Shop', amount: -100 },
        { date: '2025-09-02', description: 'Payment', amount: 300 },
      ],
    })
    expect(result.ok).toBe(true)
    expect(result.convention).toBe('liability')
  })

  test('deposit account: money in raises the balance', () => {
    const result = checkStatementBalance({
      openingBalance: 500,
      closingBalance: 650,
      transactions: [
        { date: '2025-09-01', description: 'Pay', amount: 200 },
        { date: '2025-09-02', description: 'Shop', amount: -50 },
      ],
    })
    expect(result.ok).toBe(true)
    expect(result.convention).toBe('asset')
  })

  test('tolerates one cent of rounding but not more', () => {
    const base = { openingBalance: 100, transactions: [{ date: '2025-09-01', description: 'x', amount: 0.1 + 0.2 }] }
    expect(checkStatementBalance({ ...base, closingBalance: 100.31 }).ok).toBe(true)
    expect(checkStatementBalance({ ...base, closingBalance: 100.5 }).ok).toBe(false)
  })

  test('a missing transaction fails the check and reports the gap', () => {
    const result = checkStatementBalance({
      openingBalance: 1000,
      closingBalance: 800,
      transactions: [{ date: '2025-09-01', description: 'Shop', amount: -100 }],
    })
    expect(result.ok).toBe(false)
    expect(result.convention).toBeNull()
    expect(result.difference).toBeGreaterThan(0)
    expect(result.reason).toMatch(/closing balance/)
  })
})

describe('ingest() PDF fallback', () => {
  const gemini = { apiKey: 'test-key', model: 'gemini-2.5-flash' }
  const pdf = Buffer.from('%PDF-1.4 unsupported bank')
  const emptyStatement = { transactions: [], interestFreeTransactions: [] }

  const good: AiStatement = {
    statementDate: '2025-09-30',
    accountNumberLast4: '4321',
    openingBalance: 1000,
    closingBalance: 945.85,
    transactions: [{ date: '2025-09-09', description: 'Woolworths Epping', amount: -54.15 }],
  }
  // opening 1000 owed + 54.15 spend = 1054.15, so 945.85 is wrong
  const bad: AiStatement = { ...good, closingBalance: 900 }

  const params = (extra: Record<string, unknown> = {}) => ({
    userId: 'user_1',
    accountId: 'acc_1',
    source: 'upload' as const,
    fileName: 'other-bank.pdf',
    buffer: pdf,
    ...extra,
  })

  beforeEach(() => mockRegexParse.mockReset())

  test('the regex parser stays first choice and the AI is not called', async () => {
    mockRegexParse.mockResolvedValue({
      transactions: [{ date: '2025-09-09', description: 'Woolworths', amount: -10, type: 'debit' }],
    })
    const generate = vi.fn()
    const { store } = createMemoryStore({ gemini })

    const result = await ingest(params({ generateStatement: generate }), store)
    expect(result.inserted).toBe(1)
    expect(generate).not.toHaveBeenCalled()
  })

  test('unsupported PDF goes to the AI; a passing balance check imports cleanly', async () => {
    mockRegexParse.mockResolvedValue(emptyStatement)
    const generate = vi.fn().mockResolvedValue({ ...good, closingBalance: 1054.15 })
    const { store, transactions } = createMemoryStore({ gemini })

    const result = await ingest(params({ generateStatement: generate }), store)

    expect(generate).toHaveBeenCalledOnce()
    expect(generate.mock.calls[0][0].config).toEqual(gemini)
    expect(result.inserted).toBe(1)
    expect(result.errors).toEqual([])
    expect(transactions[0].needsReview).toBe(false)
  })

  test('a regex parser failure also falls back to the AI', async () => {
    // Unusable parser output makes the regex path throw inside its try block
    mockRegexParse.mockResolvedValue(undefined)
    const generate = vi.fn().mockResolvedValue({ ...good, closingBalance: 1054.15 })
    const { store } = createMemoryStore({ gemini })

    const result = await ingest(params({ generateStatement: generate }), store)
    expect(result.inserted).toBe(1)
  })

  test('a failing balance check is still saved but flagged visibly', async () => {
    mockRegexParse.mockResolvedValue(emptyStatement)
    const { store, transactions, sessions } = createMemoryStore({ gemini })

    const result = await ingest(params({ generateStatement: vi.fn().mockResolvedValue(bad) }), store)

    expect(result.inserted).toBe(1)
    expect(result.errors[0].message).toMatch(/do not add up/)
    expect(transactions[0].needsReview).toBe(true)
    expect(sessions[0].errors?.[0].message).toMatch(/do not add up/)
  })

  test('rows with an unreadable date are dropped and fail the check', async () => {
    mockRegexParse.mockResolvedValue(emptyStatement)
    const statement: AiStatement = {
      ...good,
      closingBalance: 1054.15,
      transactions: [...good.transactions, { date: 'sometime in Sept', description: 'Mystery', amount: -1 }],
    }
    const { store } = createMemoryStore({ gemini })

    const result = await ingest(params({ generateStatement: vi.fn().mockResolvedValue(statement) }), store)
    expect(result.inserted).toBe(1)
    expect(result.errors[0].message).toMatch(/unreadable/)
  })

  test('without a Gemini key it returns a clear error and imports nothing', async () => {
    mockRegexParse.mockResolvedValue(emptyStatement)
    const generate = vi.fn()
    const { store, transactions } = createMemoryStore({ gemini: null })

    await expect(ingest(params({ generateStatement: generate }), store)).rejects.toMatchObject({
      code: 'parse_failed',
      message: expect.stringMatching(/Gemini API key/),
    })
    expect(generate).not.toHaveBeenCalled()
    expect(transactions).toHaveLength(0)
  })

  test('an AI failure surfaces as a parse error', async () => {
    mockRegexParse.mockResolvedValue(emptyStatement)
    const { store } = createMemoryStore({ gemini })
    await expect(
      ingest(params({ generateStatement: vi.fn(async () => {
          throw new Error('quota exceeded')
        }) }), store)
    ).rejects.toMatchObject({ code: 'parse_failed', message: expect.stringMatching(/quota exceeded/) })
  })
})
