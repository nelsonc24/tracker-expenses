/**
 * E.164 phone numbers: a leading "+", a country code that doesn't start with 0,
 * and at most 15 digits in total (e.g. +61412345678).
 *
 * Kept free of server-only imports so the settings UI can share it.
 */
export const E164_REGEX = /^\+[1-9]\d{6,14}$/

export function isE164(value: string | null | undefined): value is string {
  return typeof value === 'string' && E164_REGEX.test(value)
}

/** Strip spaces, dashes, dots and brackets people commonly type ("+61 412-345 678"). */
export function normalizePhoneInput(value: string): string {
  return value.replace(/[\s\-().]/g, '')
}
