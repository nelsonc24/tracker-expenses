import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { format } from 'date-fns'
import { describe, expect, test, vi } from 'vitest'
import { createMemoryStore } from './helpers/memory-store'

vi.mock('@/db', () => ({ db: {} }))

import {
  bankFormats,
  formatHasHeaderRow,
  parseCSVLine,
  parseDate,
  splitCsvLines,
  validateTransactionRow,
  withFormatAliases,
} from '@/lib/csv-processing'
import { ingest } from '@/lib/ingest'

const westpac = bankFormats.westpac
const ymd = (d: Date | null) => (d ? format(d, 'yyyy-MM-dd') : null)

describe('Westpac dates', () => {
  test.each([
    ['15/01/2024', '2024-01-15'], // real exports
    ['5/1/2024', '2024-01-05'],
    ['31/12/2025', '2025-12-31'],
    ['15 Jan 2024', '2024-01-15'], // documented format
    ['01 feb 2025', '2025-02-01'],
  ])('%s parses as %s', (input, expected) => {
    expect(ymd(parseDate(input, westpac.dateFormat))).toBe(expected)
  })

  test.each([['2024-01-15'], ['32/01/2024'], ['15/13/2024'], ['not a date'], ['']])('%j is rejected', input => {
    expect(parseDate(input, westpac.dateFormat)).toBeNull()
  })

  test('a real-shaped Westpac export imports with the right dates', async () => {
    const { store, transactions } = createMemoryStore()
    const result = await ingest(
      {
        userId: 'user_1',
        accountId: 'acc_1',
        source: 'upload',
        fileName: 'westpac.csv',
        buffer: readFileSync(join(__dirname, 'fixtures', 'csv', 'westpac.csv')),
      },
      store,
      { notify: vi.fn() }
    )
    expect(result.errors).toEqual([])
    expect(result.inserted).toBe(2)
    expect(transactions.map(t => [t.description, t.amount, (t.transactionDate as Date).toISOString().slice(0, 10)])).toEqual([
      ['WOOLWORTHS 1234 SYDNEY', '-85.50', '2024-01-15'],
      ['SALARY ACME PTY LTD', '2500.00', '2024-01-16'],
    ])
  })
})

describe('header handling used by the browser preview', () => {
  test('only CommBank (and custom) are header-less', () => {
    expect(formatHasHeaderRow(bankFormats.commonwealth)).toBe(false)
    expect(formatHasHeaderRow(bankFormats.custom)).toBe(false)
    for (const key of ['westpac', 'anz', 'nab', 'ubank', 'latitud', 'creditcard']) {
      expect(formatHasHeaderRow(bankFormats[key])).toBe(true)
    }
  })

  test('the Westpac header row is not treated as a transaction', () => {
    const lines = splitCsvLines(readFileSync(join(__dirname, 'fixtures', 'csv', 'westpac.csv'), 'utf8'))
    const headers = parseCSVLine(lines[0]).map(h => h.trim())
    const rows = lines.slice(1).map((line, i) => {
      const fields = parseCSVLine(line)
      const row = Object.fromEntries(headers.map((h, j) => [h, (fields[j] || '').trim()]))
      return validateTransactionRow(withFormatAliases(row, westpac), westpac, i)
    })
    expect(rows).toHaveLength(2)
    expect(rows.every(r => r.status === 'valid')).toBe(true)
    expect(rows[0]).toMatchObject({ date: '2024-01-15', amount: -85.5 })
  })
})

describe('Westpac two-digit years', () => {
  test('are rejected instead of becoming year 0024', () => {
    expect(parseDate('01/01/24', 'DD MMM YYYY')).toBeNull()
    expect(parseDate('01 Jan 24', 'DD MMM YYYY')).toBeNull()
  })
})
