import { describe, expect, test, vi } from 'vitest'

vi.mock('@/db', () => ({ db: {} }))

import { telegramImportAlertText } from '@/lib/notifications/telegram-service'

describe('telegramImportAlertText', () => {
  test('import summary with items to review', () => {
    const text = telegramImportAlertText({ type: 'import_summary', accountName: 'Everyday', inserted: 14, needsReview: 2 })
    expect(text).toContain('Everyday')
    expect(text).toContain('<b>14</b> new transactions')
    expect(text).toContain('<b>2</b> need review')
  })

  test('import summary without review items omits the review part', () => {
    const text = telegramImportAlertText({ type: 'import_summary', accountName: 'Everyday', inserted: 3, needsReview: 0 })
    expect(text).not.toContain('need review')
  })

  test('statement missing', () => {
    const text = telegramImportAlertText({ type: 'statement_missing', accountName: 'Latitude', daysSinceImport: 40 })
    expect(text).toContain('No statement imported for Latitude in 40 days')
  })

  test('escapes HTML in account names', () => {
    const text = telegramImportAlertText({ type: 'statement_missing', accountName: 'A <b>&</b> B', daysSinceImport: 35 })
    expect(text).toContain('A &lt;b&gt;&amp;&lt;/b&gt; B')
  })
})
