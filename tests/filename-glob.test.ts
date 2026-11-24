import { describe, expect, it } from 'vitest'
import { matchesFilenamePattern } from '@/lib/inbound-email/senders'

describe('matchesFilenamePattern', () => {
  it('matches * and ? case-insensitively against the whole name', () => {
    expect(matchesFilenamePattern('Latitude*.pdf', 'latitude-2026-10.PDF')).toBe(true)
    expect(matchesFilenamePattern('stmt-?.csv', 'stmt-1.csv')).toBe(true)
    expect(matchesFilenamePattern('stmt-?.csv', 'stmt-12.csv')).toBe(false)
    expect(matchesFilenamePattern('*.pdf', 'a.pdf.exe')).toBe(false)
    expect(matchesFilenamePattern('a.b', 'axb')).toBe(false) // '.' is literal
    expect(matchesFilenamePattern('*', '')).toBe(true)
    expect(matchesFilenamePattern('a*b*c', 'xabc')).toBe(false)
    expect(matchesFilenamePattern('a*b*c', 'abbc')).toBe(true)
  })

  it('treats regex metacharacters literally', () => {
    expect(matchesFilenamePattern('(1)+[x].csv', '(1)+[x].csv')).toBe(true)
    expect(matchesFilenamePattern('a|b', 'a')).toBe(false)
  })

  it('stays fast on a pathological pattern and a long filename', () => {
    const start = Date.now()
    expect(matchesFilenamePattern('*a*a*a*a*a*a*a*a*b.pdf', 'a'.repeat(250) + '.pdf')).toBe(false)
    expect(Date.now() - start).toBeLessThan(500)
  })
})
