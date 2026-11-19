import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import {
  MIN_DETECTION_CONFIDENCE,
  detectBankFormat,
  detectBankFormatFromText,
} from '@/lib/csv-processing'

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', 'csv', name), 'utf8')

describe('detectBankFormatFromText', () => {
  test.each([
    ['commonwealth.csv', 'commonwealth'],
    ['westpac.csv', 'westpac'],
    ['anz.csv', 'anz'],
    ['nab.csv', 'nab'],
    ['ubank.csv', 'ubank'],
    ['latitude.csv', 'latitud'],
  ])('%s is detected as %s with high confidence', (file, expected) => {
    const result = detectBankFormatFromText(fixture(file))
    expect(result.format).toBe(expected)
    expect(result.confidence).toBeGreaterThanOrEqual(MIN_DETECTION_CONFIDENCE)
  })

  test('handles CRLF line endings', () => {
    const result = detectBankFormatFromText(fixture('ubank.csv').replace(/\n/g, '\r\n'))
    expect(result.format).toBe('ubank')
  })

  test('the generic Date,Description,Amount layout is low confidence', () => {
    const result = detectBankFormatFromText(fixture('creditcard.csv'))
    expect(result.format).toBe('creditcard')
    expect(result.confidence).toBeLessThan(MIN_DETECTION_CONFIDENCE)
  })

  test('unknown headers give no format', () => {
    expect(detectBankFormatFromText(fixture('unknown.csv'))).toEqual({ format: null, confidence: 0 })
  })

  test('empty input gives no format', () => {
    expect(detectBankFormatFromText('')).toEqual({ format: null, confidence: 0 })
  })
})

describe('detectBankFormat (headerless CommBank)', () => {
  const row = ['12/09/2025', '-508.02', 'Direct Debit', '+586.72']

  test('a single data row is detected with moderate-high confidence', () => {
    const result = detectBankFormat(row, [])
    expect(result.format).toBe('commonwealth')
    expect(result.confidence).toBeGreaterThanOrEqual(MIN_DETECTION_CONFIDENCE)
  })

  test('rows that break the shape lower the confidence', () => {
    const result = detectBankFormat(row, [['not a date', 'x', 'y']])
    expect(result.confidence).toBeLessThan(MIN_DETECTION_CONFIDENCE)
  })
})
