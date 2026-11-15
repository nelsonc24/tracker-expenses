import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test, vi } from 'vitest'
import { createMemoryStore } from './helpers/memory-store'

vi.mock('@/db', () => ({ db: {} }))

import { assignHashes, generateTransactionHash, ingest } from '@/lib/ingest'
import type { TransactionData } from '@/lib/ingest'

const coffee = (extra: Partial<TransactionData> = {}): TransactionData => ({
  date: '2025-09-11',
  description: 'EFTPOS Corner Cafe',
  amount: -4.8,
  category: 'General',
  account: 'acc_1',
  ...extra,
})

describe('assignHashes occurrence index', () => {
  test('identical rows in one import get distinct hashes and are all kept', () => {
    const result = assignHashes([coffee(), coffee(), coffee()], 'u', 'a', new Set())
    expect(result.map(r => r.duplicate)).toEqual([false, false, false])
    expect(new Set(result.map(r => r.hash)).size).toBe(3)
  })

  test('the first occurrence keeps the legacy hash so existing rows still match', () => {
    const base = generateTransactionHash(coffee(), 'u', 'a')
    const [first, second] = assignHashes([coffee(), coffee()], 'u', 'a', new Set())
    expect(first.hash).toBe(base)
    expect(second.hash).toBe(`${base}-2`)
  })

  test('only the missing occurrences are inserted against existing rows', () => {
    const base = generateTransactionHash(coffee(), 'u', 'a')
    const existing = new Set([base, `${base}-2`]) // two coffees already stored
    const result = assignHashes([coffee(), coffee(), coffee()], 'u', 'a', existing)
    expect(result.map(r => r.duplicate)).toEqual([true, true, false])
  })

  test('rows that differ in date, amount or description do not share an index', () => {
    const result = assignHashes(
      [coffee(), coffee({ date: '2025-09-12' }), coffee({ amount: -5 }), coffee({ description: 'Other' })],
      'u',
      'a',
      new Set()
    )
    expect(result.every(r => !r.duplicate)).toBe(true)
    expect(result.every(r => !r.hash.includes('-', 16))).toBe(true)
  })

  test('description matching is case-insensitive', () => {
    const result = assignHashes([coffee(), coffee({ description: 'eftpos corner cafe' })], 'u', 'a', new Set())
    expect(result[1].hash).toBe(`${result[0].hash}-2`)
  })

  test('bank transaction ids are unchanged: same id twice is a duplicate', () => {
    const withId = (id: string) => coffee({ transactionId: id })
    const result = assignHashes([withId('T1'), withId('T1'), withId('T2')], 'u', 'a', new Set())
    expect(result.map(r => r.duplicate)).toEqual([false, true, false])
    expect(result[0].hash).toBe(generateTransactionHash(withId('T1'), 'u', 'a'))
  })

  test('zero-amount rows do not consume an occurrence index', () => {
    const result = assignHashes([coffee({ amount: 0 }), coffee(), coffee()], 'u', 'a', new Set())
    expect(result.map(r => r.duplicate)).toEqual([true, false, false])
    expect(result[1].hash).toBe(generateTransactionHash(coffee(), 'u', 'a'))
  })
})

describe('ingest() with identical same-day transactions', () => {
  const file = readFileSync(join(__dirname, 'fixtures', 'csv', 'commonwealth-two-coffees.csv'))
  const params = { userId: 'user_1', accountId: 'acc_1', source: 'upload' as const, fileName: 'cba.csv', buffer: file }

  test('two identical coffees are both inserted, and re-importing inserts 0', async () => {
    const { store, transactions } = createMemoryStore()

    const first = await ingest(params, store)
    expect(first.inserted).toBe(3) // 2 coffees + salary
    expect(transactions.filter(t => t.description.includes('Cafe'))).toHaveLength(2)

    const second = await ingest(params, store)
    expect(second.inserted).toBe(0)
    expect(second.duplicates).toBe(3)
    expect(transactions).toHaveLength(3)
  })

  test('an overlapping file only adds the genuinely new occurrence', async () => {
    const { store, transactions } = createMemoryStore()
    const oneCoffee = Buffer.from(file.toString().split('\n').slice(0, 1).join('\n') + '\n')

    await ingest({ ...params, buffer: oneCoffee }, store)
    expect(transactions).toHaveLength(1)

    const result = await ingest(params, store) // now 2 coffees + salary
    expect(result.inserted).toBe(2)
    expect(transactions.filter(t => t.description.includes('Cafe'))).toHaveLength(2)
  })
})
