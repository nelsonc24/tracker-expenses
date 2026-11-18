import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createMemoryStore } from './helpers/memory-store'

// The real store talks to Neon; tests use the in-memory store instead.
vi.mock('@/db', () => ({ db: {} }))

const mockParsePdf = vi.hoisted(() => vi.fn())
vi.mock('@/lib/pdf-processing', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/pdf-processing')>()),
  parseCreditCardPDF: mockParsePdf,
}))

import { IngestError, ingest } from '@/lib/ingest'

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', 'csv', name))

function params(fileName: string, buffer: Buffer | Uint8Array, extra: Record<string, unknown> = {}) {
  return { userId: 'user_1', accountId: 'acc_1', source: 'upload' as const, fileName, buffer, ...extra }
}

describe('ingest()', () => {
  let ctx: ReturnType<typeof createMemoryStore>

  beforeEach(() => {
    ctx = createMemoryStore()
    mockParsePdf.mockReset()
  })

  test('imports a CommBank CSV (header-less, auto-detected)', async () => {
    const result = await ingest(params('commbank.csv', fixture('commonwealth.csv')), ctx.store)

    expect(result.inserted).toBe(3)
    expect(result.duplicates).toBe(0)
    expect(result.needsReview).toBe(ctx.transactions.filter(t => t.needsReview).length)
    expect(result.sessionId).toBe('session_1')
    expect(ctx.transactions).toHaveLength(3)

    const salary = ctx.transactions.find(t => t.description.includes('Salary'))!
    expect(salary.amount).toBe('2500.00')
    expect(salary.type).toBe('credit')
    expect(salary.accountId).toBe('acc_1')

    const debit = ctx.transactions.find(t => t.description.includes('Cafe'))!
    expect(debit.amount).toBe('-4.80')
    expect(debit.type).toBe('debit')
  })

  test('writes an import session with source, format and counts', async () => {
    await ingest(params('commbank.csv', fixture('commonwealth.csv'), { source: 'email' }), ctx.store)

    expect(ctx.sessions).toHaveLength(1)
    expect(ctx.sessions[0]).toMatchObject({
      userId: 'user_1',
      fileName: 'commbank.csv',
      fileType: 'csv',
      bankFormat: 'commonwealth',
      source: 'email',
      status: 'completed',
      totalRows: 3,
      successfulRows: 3,
      failedRows: 0,
      needsReviewCount: ctx.transactions.filter(t => t.needsReview).length,
    })
  })

  test.each([
    ['ubank.csv', 'ubank', 2],
    ['latitude.csv', 'latitud', 2],
    ['anz.csv', 'anz', 2],
    ['nab.csv', 'nab', 2],
  ])('imports %s as %s', async (file, format, count) => {
    const result = await ingest(params(file, fixture(file)), ctx.store)
    expect(result.errors).toEqual([])
    expect(result.inserted).toBe(count)
    expect(ctx.sessions[0].bankFormat).toBe(format)
  })

  test('an explicit bankFormat overrides detection', async () => {
    const result = await ingest(params('x.csv', fixture('latitude.csv'), { bankFormat: 'latitud' }), ctx.store)
    expect(result.inserted).toBe(2)
  })

  test('uses bank transaction ids and keeps the UBank receipt number', async () => {
    await ingest(params('ubank.csv', fixture('ubank.csv')), ctx.store)
    const cafe = ctx.transactions.find(t => t.description === 'Example Cafe')!
    expect(cafe.receiptNumber).toBe('R1001')
    expect(cafe.duplicateCheckHash).toBeTruthy()
  })

  test('flags transfers', async () => {
    await ingest(params('nab.csv', fixture('nab.csv')), ctx.store)
    const transfer = ctx.transactions.find(t => t.description.includes('TRANSFER'))!
    expect(transfer.isTransfer).toBe(true)
    expect(ctx.transactions.find(t => t.description.includes('EFTPOS'))!.isTransfer).toBe(false)
  })

  test('maps category names to the user categories, falling back to the default', async () => {
    const json = JSON.stringify([
      { date: '2025-09-01', description: 'Weekly shop', amount: -80, category: 'Groceries' },
      { date: '2025-09-02', description: 'Mystery', amount: -10, category: 'Nonexistent' },
    ])
    await ingest(params('tx.json', Buffer.from(json)), ctx.store)
    expect(ctx.transactions.find(t => t.description === 'Weekly shop')!.categoryId).toBe('cat_groceries')
    expect(ctx.transactions.find(t => t.description === 'Mystery')!.categoryId).toBe('cat_general')
  })

  test('re-importing the same file inserts nothing', async () => {
    const buffer = fixture('commonwealth.csv')
    await ingest(params('commbank.csv', buffer), ctx.store)
    const second = await ingest(params('commbank.csv', buffer), ctx.store)

    expect(second.inserted).toBe(0)
    expect(second.duplicates).toBe(3)
    expect(ctx.transactions).toHaveLength(3)
    expect(second.skipped[0].reason).toMatch(/duplicate/i)
  })

  test('zero-amount rows are skipped', async () => {
    const json = JSON.stringify([{ date: '2025-09-01', description: 'Free', amount: 0 }])
    const result = await ingest(params('tx.json', Buffer.from(json)), ctx.store)
    expect(result.inserted).toBe(0)
    expect(result.skipped[0].reason).toBe('Transaction has zero amount')
  })

  test('rejects an account that is not the user’s', async () => {
    await expect(
      ingest({ ...params('a.csv', fixture('commonwealth.csv')), accountId: 'someone_elses' }, ctx.store)
    ).rejects.toMatchObject({ code: 'invalid_account' })
    expect(ctx.transactions).toHaveLength(0)
  })

  test('refuses CSVs whose bank cannot be detected', async () => {
    await expect(ingest(params('weird.csv', fixture('unknown.csv')), ctx.store)).rejects.toMatchObject({
      code: 'parse_failed',
    })
  })

  test('rejects unsupported file types', async () => {
    await expect(ingest(params('notes.txt.exe', Buffer.from('hi')), ctx.store)).rejects.toBeInstanceOf(IngestError)
  })

  test('PDF statements go through the PDF parser', async () => {
    mockParsePdf.mockResolvedValue({
      statementDate: '2025-09-30',
      accountNumber: '1234',
      openingBalance: 0,
      closingBalance: 54.15,
      // parseLatitudPDF emits purchases as negative amounts
      transactions: [{ date: '2025-09-09', description: 'Woolworths Epping', amount: -54.15, type: 'debit' }],
    })

    const result = await ingest(params('statement.pdf', Buffer.from('%PDF-1.4')), ctx.store)
    expect(mockParsePdf).toHaveBeenCalledOnce()
    expect(result.inserted).toBe(1)
    expect(ctx.sessions[0].fileType).toBe('pdf')
    expect(ctx.transactions[0].categoryId).toBe('cat_groceries')
  })
})
