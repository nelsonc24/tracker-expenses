/**
 * Who may use WhatsApp, and how often the test button can be pressed.
 *
 * Every WhatsApp message is billed to the owner's Meta account, so:
 * - WHATSAPP_ALLOWED_USER_IDS (comma-separated Clerk user ids) limits WhatsApp to those users.
 *   Unset = every user may use it (fine while sign-ups are closed; set it if they are open).
 * - The test endpoint is limited to TEST_LIMITS sends per user.
 */

export function parseAllowedUserIds(raw: string | undefined): Set<string> | null {
  const ids = (raw ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  return ids.length > 0 ? new Set(ids) : null
}

export function isWhatsAppAllowedUser(userId: string, raw = process.env.WHATSAPP_ALLOWED_USER_IDS): boolean {
  const allowed = parseAllowedUserIds(raw)
  return allowed === null || allowed.has(userId)
}

export const TEST_LIMITS = {
  perHour: 3,
  perDay: 10,
} as const

/** Pure check so it can be unit tested; the route supplies the counts from the notifications table. */
export function testRateLimitExceeded(sentLastHour: number, sentLastDay: number): string | null {
  if (sentLastHour >= TEST_LIMITS.perHour) {
    return `Test messages are limited to ${TEST_LIMITS.perHour} per hour. Try again later.`
  }
  if (sentLastDay >= TEST_LIMITS.perDay) {
    return `Test messages are limited to ${TEST_LIMITS.perDay} per day. Try again tomorrow.`
  }
  return null
}

export const WHATSAPP_TEST_NOTIFICATION_TYPE = 'whatsapp_test'
