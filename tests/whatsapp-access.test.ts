import { describe, expect, test } from 'vitest'
import {
  isWhatsAppAllowedUser,
  parseAllowedUserIds,
  TEST_LIMITS,
  testRateLimitExceeded,
} from '@/lib/notifications/whatsapp-access'

describe('WhatsApp allow-list', () => {
  test('unset or blank allows everyone', () => {
    expect(parseAllowedUserIds(undefined)).toBeNull()
    expect(parseAllowedUserIds(' , ')).toBeNull()
    expect(isWhatsAppAllowedUser('user_a', undefined)).toBe(true)
  })

  test('only listed users are allowed', () => {
    expect(isWhatsAppAllowedUser('user_a', 'user_a, user_b')).toBe(true)
    expect(isWhatsAppAllowedUser('user_b', 'user_a, user_b')).toBe(true)
    expect(isWhatsAppAllowedUser('user_c', 'user_a, user_b')).toBe(false)
  })
})

describe('test message rate limit', () => {
  test('allows under both limits', () => {
    expect(testRateLimitExceeded(0, 0)).toBeNull()
    expect(testRateLimitExceeded(TEST_LIMITS.perHour - 1, TEST_LIMITS.perDay - 1)).toBeNull()
  })

  test('blocks at the hourly limit', () => {
    expect(testRateLimitExceeded(TEST_LIMITS.perHour, TEST_LIMITS.perHour)).toMatch(/per hour/)
  })

  test('blocks at the daily limit', () => {
    expect(testRateLimitExceeded(0, TEST_LIMITS.perDay)).toMatch(/per day/)
  })
})
