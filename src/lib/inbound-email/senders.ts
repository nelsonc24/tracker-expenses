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
 * Matched with an iterative two-pointer walk (O(pattern x filename), no backtracking
 * blow-up), not a RegExp: a pattern like `*a*a*a*a*b` compiled to a regex can hang on a long filename.
 */
export function matchesFilenamePattern(pattern: string, filename: string): boolean {
  const p = pattern.trim().toLowerCase()
  const f = filename.toLowerCase()
  let pi = 0
  let fi = 0
  let starPi = -1
  let starFi = 0

  while (fi < f.length) {
    if (pi < p.length && p[pi] === '*') {
      starPi = pi++
      starFi = fi
    } else if (pi < p.length && (p[pi] === '?' || p[pi] === f[fi])) {
      pi++
      fi++
    } else if (starPi !== -1) {
      pi = starPi + 1
      fi = ++starFi
    } else {
      return false
    }
  }
  while (pi < p.length && p[pi] === '*') pi++
  return pi === p.length
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
