import { describe, expect, test, vi } from 'vitest'
import { createMemoryStore } from './helpers/memory-store'

// The real store talks to Neon; tests use the in-memory store instead.
vi.mock('@/db', () => ({ db: {} }))

import { sync, type BankFeedProvider } from '@/lib/ingest/providers'
import type { TransactionData } from '@/lib/ingest/types'

const tx = (account: string, id: string, amount: number): TransactionData => ({
  date: '2026-11-01',
  description: `Purchase ${id}`,
  amount,
  category: 'Groceries',
  account,
  transactionId: id,
})

function fakeProvider(rows: TransactionData[]): BankFeedProvider {
  return {
    id: 'fake',
    listAccounts: async () => [{ externalId: 'ext_1', name: 'Everyday' }],
    fetchTransactions: vi.fn(async () => rows),
  }
}

describe('sync()', () => {
  test('imports mapped accounts with source "api" and reports unmapped ones', async () => {
    const memory = createMemoryStore({ accountIds: ['acc_1'] })
    const provider = fakeProvider([tx('ext_1', 'a', -10), tx('ext_1', 'b', -5), tx('ext_other', 'c', -1)])

    const since = new Date(2026, 10, 1)
    const result = await sync(provider, { userId: 'user_1', since, accountMap: { ext_1: 'acc_1' } }, memory.store)

    expect(provider.fetchTransactions).toHaveBeenCalledWith(since)
    expect(result.unmappedAccounts).toEqual(['ext_other'])
    expect(result.accounts).toHaveLength(1)
    expect(result.accounts[0].result?.inserted).toBe(2)
    expect(memory.sessions[0]).toMatchObject({ source: 'api', bankFormat: 'fake', fileType: 'feed' })
    expect(memory.transactions.every(t => t.accountId === 'acc_1')).toBe(true)

    // Running again inserts nothing (dedup by transactionId)
    const again = await sync(provider, { userId: 'user_1', since, accountMap: { ext_1: 'acc_1' } }, memory.store)
    expect(again.accounts[0].result?.inserted).toBe(0)
  })

  test('one account failing does not stop the others', async () => {
    const memory = createMemoryStore({ accountIds: ['acc_1'] })
    const provider = fakeProvider([tx('ext_1', 'a', -10), tx('ext_2', 'b', -5)])

    const result = await sync(
      provider,
      { userId: 'user_1', since: new Date(2026, 10, 1), accountMap: { ext_1: 'acc_1', ext_2: 'acc_not_mine' } },
      memory.store
    )

    expect(result.accounts.find(a => a.externalAccountId === 'ext_1')?.result?.inserted).toBe(1)
    expect(result.accounts.find(a => a.externalAccountId === 'ext_2')?.error).toMatch(/does not belong/)
  })
})
