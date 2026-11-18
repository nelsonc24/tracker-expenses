import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createMemoryStore } from './helpers/memory-store'

vi.mock('@/db', () => ({ db: {} }))

import { ingest, importTransactions } from '@/lib/ingest'

const json = (rows: object[]) => Buffer.from(JSON.stringify(rows))
const params = (buffer: Buffer) => ({
  userId: 'user_1',
  accountId: 'acc_1',
  source: 'upload' as const,
  fileName: 't.json',
  buffer,
})

describe('ingest() with category rules', () => {
  test('applies user rules before the parser category', async () => {
    const { store, transactions } = createMemoryStore({
      categories: [['coffee', 'cat_coffee']],
      rules: [{ id: 'r1', matchType: 'contains', pattern: 'cafe', categoryId: 'cat_coffee', priority: 0 }],
    })
    await ingest(
      params(json([{ date: '2025-09-01', description: 'Little Cafe', amount: -5, category: 'Groceries' }])),
      store,
      { notify: vi.fn() }
    )
    expect(transactions[0].categoryId).toBe('cat_coffee')
    expect(transactions[0].needsReview).toBe(false)
  })

  test('an invalid stored regex does not break the import', async () => {
    const { store, transactions } = createMemoryStore({
      rules: [{ id: 'bad', matchType: 'regex', pattern: '(unclosed', categoryId: 'cat_groceries', priority: 0 }],
    })
    const result = await ingest(
      params(json([{ date: '2025-09-01', description: '(unclosed', amount: -5, category: 'Nonexistent' }])),
      store,
      { notify: vi.fn() }
    )
    expect(result.inserted).toBe(1)
    expect(transactions[0].categoryId).toBe('cat_general')
    expect(transactions[0].needsReview).toBe(true)
  })

  test('if rules cannot be loaded the import still runs without them', async () => {
    const { store, transactions } = createMemoryStore()
    store.getCategoryRules = vi.fn().mockRejectedValue(new Error('relation "category_rules" does not exist'))
    const result = await ingest(
      params(json([{ date: '2025-09-01', description: 'Weekly shop', amount: -80, category: 'Groceries' }])),
      store,
      { notify: vi.fn() }
    )
    expect(result.inserted).toBe(1)
    expect(transactions[0].categoryId).toBe('cat_groceries')
  })

  test('uncategorised rows get an AI suggestion when the user has a key, and stay flagged', async () => {
    const { store, transactions } = createMemoryStore({ gemini: { apiKey: 'k', model: 'm' } })
    const generate = vi.fn().mockResolvedValue([{ key: 1, category: 'groceries' }])
    await ingest(
      params(
        json([
          { date: '2025-09-01', description: 'Weekly shop', amount: -80, category: 'Groceries' },
          { date: '2025-09-02', description: 'ACME 42', amount: -10, category: 'Nonexistent' },
        ])
      ),
      store,
      { notify: vi.fn(), generateCategorySuggestions: generate }
    )
    // Only the uncategorised row is sent
    expect(generate).toHaveBeenCalledOnce()
    expect(generate.mock.calls[0][0].items).toEqual([{ key: 1, description: 'ACME 42', amount: -10 }])
    const acme = transactions.find(t => t.description === 'ACME 42')!
    expect(acme.categoryId).toBe('cat_groceries')
    expect(acme.needsReview).toBe(true)
  })

  test('no Gemini key: the AI step is skipped', async () => {
    const { store, transactions } = createMemoryStore()
    const generate = vi.fn()
    await ingest(params(json([{ date: '2025-09-02', description: 'ACME 42', amount: -10, category: 'x' }])), store, {
      notify: vi.fn(),
      generateCategorySuggestions: generate,
    })
    expect(generate).not.toHaveBeenCalled()
    expect(transactions[0].categoryId).toBe('cat_general')
  })

  test('an AI failure leaves rows uncategorised and the import succeeds', async () => {
    const { store, transactions } = createMemoryStore({ gemini: { apiKey: 'k', model: 'm' } })
    const result = await ingest(
      params(json([{ date: '2025-09-02', description: 'ACME 42', amount: -10, category: 'x' }])),
      store,
      { notify: vi.fn(), generateCategorySuggestions: vi.fn().mockRejectedValue(new Error('quota')) }
    )
    expect(result.inserted).toBe(1)
    expect(transactions[0].categoryId).toBe('cat_general')
  })
})

describe('import summary notification', () => {
  let ctx: ReturnType<typeof createMemoryStore>
  beforeEach(() => {
    ctx = createMemoryStore()
  })

  test('is sent after the import with inserted, needs-review and account name', async () => {
    const notify = vi.fn().mockResolvedValue({ sent: [], skipped: [], errors: [] })
    await ingest(
      params(
        json([
          { date: '2025-09-01', description: 'Weekly shop', amount: -80, category: 'Groceries' },
          { date: '2025-09-02', description: 'Mystery', amount: -10, category: 'Nonexistent' },
        ])
      ),
      ctx.store,
      { notify }
    )
    expect(notify).toHaveBeenCalledOnce()
    expect(notify).toHaveBeenCalledWith('user_1', {
      type: 'import_summary',
      accountName: 'Account acc_1',
      inserted: 2,
      needsReview: 1,
    })
  })

  test('is also sent by importTransactions (the upload route path)', async () => {
    const notify = vi.fn()
    await importTransactions(
      {
        userId: 'user_1',
        accountId: 'acc_1',
        source: 'upload',
        file: { fileName: 'x.csv', fileSize: 1, fileType: 'csv' },
        transactions: [{ date: '2025-09-01', description: 'Weekly shop', amount: -80, category: 'Groceries', account: 'acc_1' }],
      },
      ctx.store,
      { notify }
    )
    expect(notify).toHaveBeenCalledWith('user_1', expect.objectContaining({ type: 'import_summary', inserted: 1 }))
  })

  test('a throwing notifier never fails the import', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const notify = vi.fn().mockRejectedValue(new Error('telegram down'))
    const result = await ingest(
      params(json([{ date: '2025-09-01', description: 'Weekly shop', amount: -80, category: 'Groceries' }])),
      ctx.store,
      { notify }
    )
    expect(result.inserted).toBe(1)
    expect(result.sessionId).toBe('session_1')
    expect(ctx.transactions).toHaveLength(1)
    expect(consoleError).toHaveBeenCalledWith('Import summary notification failed:', 'telegram down')
    consoleError.mockRestore()
  })

  test('a failing account-name lookup is swallowed too', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    ctx.store.getAccountName = vi.fn().mockRejectedValue(new Error('db'))
    const notify = vi.fn()
    const result = await ingest(
      params(json([{ date: '2025-09-01', description: 'Weekly shop', amount: -80, category: 'Groceries' }])),
      ctx.store,
      { notify }
    )
    expect(result.inserted).toBe(1)
    expect(notify).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  test('is not sent when the import itself fails', async () => {
    const notify = vi.fn()
    ctx.store.insertTransactions = vi.fn().mockRejectedValue(new Error('insert failed'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(
      ingest(params(json([{ date: '2025-09-01', description: 'x', amount: -1, category: 'Groceries' }])), ctx.store, { notify })
    ).rejects.toThrow('insert failed')
    expect(notify).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })
})
