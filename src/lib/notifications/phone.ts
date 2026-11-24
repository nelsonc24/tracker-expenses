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

/**
 * Tidy what a person typed: strip spaces, dashes, dots and brackets ("+61 412-345 678"), turn an
 * Australian national number (0412 345 678) into +61412345678, and "00" international prefixes into "+".
 * Anything else is returned cleaned but otherwise unchanged, so validation can reject it.
 */
export function normalizePhoneInput(value: string): string {
  const cleaned = value.trim().replace(/[\s\-().]/g, '')
  if (/^0[2-478]\d{8}$/.test(cleaned)) return `+61${cleaned.slice(1)}`
  if (/^00\d+$/.test(cleaned)) return `+${cleaned.slice(2)}`
  return cleaned
}
