import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test, vi } from 'vitest'
import { createMemoryStore } from './helpers/memory-store'

vi.mock('@/db', () => ({ db: {} }))

import { ingest } from '@/lib/ingest'

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', 'csv', name))
const json = (rows: object[]) => Buffer.from(JSON.stringify(rows))
const params = (fileName: string, buffer: Buffer) => ({
  userId: 'user_1',
  accountId: 'acc_1',
  source: 'upload' as const,
  fileName,
  buffer,
})

describe('needs-review flag', () => {
  test('a row with a matched, specific category is not flagged', async () => {
    const { store, transactions } = createMemoryStore()
    const result = await ingest(
      params('t.json', json([{ date: '2025-09-01', description: 'Weekly shop', amount: -80, category: 'Groceries' }])),
      store
    )
    expect(transactions[0].needsReview).toBe(false)
    expect(result.needsReview).toBe(0)
  })

  test.each([['Nonexistent'], ['General'], ['Uncategorized']])('low-confidence category %s is flagged', async category => {
    const { store, transactions, sessions } = createMemoryStore()
    const result = await ingest(
      params('t.json', json([{ date: '2025-09-01', description: 'Mystery', amount: -10, category }])),
      store
    )
    expect(transactions[0].needsReview).toBe(true)
    expect(result.needsReview).toBe(1)
    expect(sessions[0].needsReviewCount).toBe(1)
  })

  test('the repeat of an identical row is flagged as a possible duplicate, the first is not', async () => {
    const { store, transactions } = createMemoryStore()
    const row = { date: '2025-09-11', description: 'Cafe', amount: -4.8, category: 'Groceries' }
    const result = await ingest(params('t.json', json([row, row])), store)

    expect(result.inserted).toBe(2)
    expect(transactions.map(t => t.needsReview)).toEqual([false, true])
    expect(result.needsReview).toBe(1)
  })

  test('re-importing flags nothing new (everything is a duplicate)', async () => {
    const { store } = createMemoryStore()
    const buffer = fixture('commonwealth-two-coffees.csv')
    await ingest(params('cba.csv', buffer), store)
    const second = await ingest(params('cba.csv', buffer), store)
    expect(second.inserted).toBe(0)
    expect(second.needsReview).toBe(0)
  })
})
