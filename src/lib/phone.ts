/** E.164: "+", country code (no leading 0), up to 15 digits in total. e.g. +614XXXXXXXX */
export const E164_PATTERN = /^\+[1-9]\d{7,14}$/

export function isE164(value: string): boolean {
  return E164_PATTERN.test(value)
}

/**
 * Tidy what a person typed into a phone field: strip spaces, dashes and brackets, and turn an
 * Australian national number (04XX XXX XXX) into +614XXXXXXXX. Anything else is returned cleaned
 * but otherwise unchanged, so validation can reject it.
 */
export function normalizePhoneInput(input: string): string {
  const cleaned = input.trim().replace(/[\s\-().]/g, '')
  if (/^0[2-478]\d{8}$/.test(cleaned)) return `+61${cleaned.slice(1)}`
  if (/^00\d+$/.test(cleaned)) return `+${cleaned.slice(2)}`
  return cleaned
}
