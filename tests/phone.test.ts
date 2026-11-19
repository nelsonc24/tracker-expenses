import { describe, expect, test } from 'vitest'
import { isE164, normalizePhoneInput } from '@/lib/phone'

describe('isE164', () => {
  test.each(['+61412345678', '+14155552671', '+442071838750'])('accepts %s', n => expect(isE164(n)).toBe(true))
  test.each(['0412345678', '61412345678', '+0412345678', '+61 412 345 678', '+614', 'abc', '', '+6141234567890123'])(
    'rejects %s',
    n => expect(isE164(n)).toBe(false)
  )
})

describe('normalizePhoneInput', () => {
  test('converts an Australian mobile to E.164', () => {
    expect(normalizePhoneInput('0412 345 678')).toBe('+61412345678')
  })
  test('strips spacing and punctuation', () => {
    expect(normalizePhoneInput(' +61 (412) 345-678 ')).toBe('+61412345678')
  })
  test('turns a 00 prefix into +', () => {
    expect(normalizePhoneInput('0061412345678')).toBe('+61412345678')
  })
  test('leaves unrecognised input cleaned but unchanged so validation rejects it', () => {
    expect(normalizePhoneInput('12345')).toBe('12345')
  })
})
