/** Pure helpers for approved-sender matching. Shared by the webhook and the settings API. */

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024 // 10 MB
export const SUPPORTED_EXTENSIONS = ['csv', 'pdf'] as const
export const MAX_FILENAME_PATTERN_LENGTH = 100

export interface SenderRule {
  id: string
  userId: string
  senderEmail: string
  accountId: string
  filenamePattern: string | null
}

const EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]+$/

/** Lower-cased bare address, or null if it isn't one. */
export function normalizeSenderEmail(value: string): string | null {
  const email = value.trim().toLowerCase()
  return EMAIL_RE.test(email) ? email : null
}

/** `"Bank Name" <Statements@Bank.com>` -> `statements@bank.com`. */
export function extractEmailAddress(from: string): string | null {
  const angle = from.match(/<([^<>]+)>\s*$/)
  return normalizeSenderEmail(angle ? angle[1] : from)
}

/** 'csv' | 'pdf' from the filename extension, or null for anything else. */
export function supportedExtension(filename: string): (typeof SUPPORTED_EXTENSIONS)[number] | null {
  const ext = filename.toLowerCase().split('.').pop() ?? ''
  return (SUPPORTED_EXTENSIONS as readonly string[]).includes(ext) && filename.includes('.')
    ? (ext as (typeof SUPPORTED_EXTENSIONS)[number])
    : null
}

/**
 * Case-insensitive glob: `*` = any run of characters, `?` = one character.
 * A glob rather than a user-supplied regex, so a pattern can't be used for ReDoS.
 */
export function matchesFilenamePattern(pattern: string, filename: string): boolean {
  const escaped = pattern
    .trim()
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*+/g, '.*')
    .replace(/\?/g, '.')
  return new RegExp(`^${escaped}$`, 'i').test(filename)
}

/**
 * Which rule decides the account for this attachment: a rule whose pattern
 * matches wins over a catch-all rule (no pattern). Null if none applies.
 */
export function pickSenderRule<T extends SenderRule>(rules: T[], filename: string): T | null {
  const patterned = rules.find(r => r.filenamePattern && matchesFilenamePattern(r.filenamePattern, filename))
  if (patterned) return patterned
  return rules.find(r => !r.filenamePattern) ?? null
}
