import crypto from 'crypto'
import { API_TOKEN_PREFIX, parseBearerToken } from './bearer'

export { API_TOKEN_PREFIX, hasApiTokenBearer, parseBearerToken } from './bearer'

/**
 * Personal API tokens (used by the folder watcher and other scripts to call
 * POST /api/ingest).
 *
 * Format: `trk_` + 43 chars of base64url (32 crypto-random bytes = 256 bits).
 * The prefix makes leaked tokens easy to recognise (e.g. by secret scanners)
 * and lets us reject obviously wrong values before touching the database.
 *
 * Only `sha256(token)` is stored. A plain (unsalted) SHA-256 is fine here:
 * the token has 256 bits of entropy, so it can't be brute-forced from the hash,
 * and a deterministic hash lets us look the token up by an indexed column.
 *
 * This file has no database imports so it can be unit-tested on its own.
 */

const TOKEN_BYTES = 32
// base64url of 32 bytes, no padding
const TOKEN_PATTERN = /^trk_[A-Za-z0-9_-]{43}$/

export const MAX_TOKEN_NAME_LENGTH = 100
export const MAX_ACTIVE_TOKENS_PER_USER = 20

export interface GeneratedApiToken {
  /** Show this to the user once. Never store or log it. */
  token: string
  /** Store this. */
  hash: string
}

export function generateApiToken(): GeneratedApiToken {
  const token = API_TOKEN_PREFIX + crypto.randomBytes(TOKEN_BYTES).toString('base64url')
  return { token, hash: hashApiToken(token) }
}

export function hashApiToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex')
}

/** Cheap shape check, done before any hashing or database lookup. */
export function isWellFormedApiToken(value: string): boolean {
  return TOKEN_PATTERN.test(value)
}

/** Constant-time comparison of a presented token against a stored hash. */
export function verifyApiToken(token: string, storedHash: string): boolean {
  if (!isWellFormedApiToken(token)) return false
  const presented = Buffer.from(hashApiToken(token), 'hex')
  const stored = Buffer.from(storedHash, 'hex')
  if (presented.length !== stored.length || stored.length === 0) return false
  return crypto.timingSafeEqual(presented, stored)
}

// ─── Bearer authentication ──────────────────────────────────────────────────

export interface StoredApiToken {
  id: string
  userId: string
  tokenHash: string
  revokedAt: Date | null
}

/** What the bearer-auth helper needs from the database. */
export interface ApiTokenLookup {
  findByHash(tokenHash: string): Promise<StoredApiToken | null>
  markUsed(tokenId: string): Promise<void>
}

export type BearerAuthResult =
  | { ok: true; userId: string; tokenId: string }
  | { ok: false; reason: 'missing' | 'malformed' | 'unknown' | 'revoked' }

/**
 * Authenticate an `Authorization: Bearer trk_...` header.
 * On success the token's `lastUsedAt` is updated (a failure to update is logged, not fatal).
 */
export async function authenticateBearer(
  authorizationHeader: string | null | undefined,
  lookup: ApiTokenLookup
): Promise<BearerAuthResult> {
  const token = parseBearerToken(authorizationHeader)
  if (!token) return { ok: false, reason: 'missing' }
  if (!isWellFormedApiToken(token)) return { ok: false, reason: 'malformed' }

  const row = await lookup.findByHash(hashApiToken(token))
  if (!row || !verifyApiToken(token, row.tokenHash)) return { ok: false, reason: 'unknown' }
  if (row.revokedAt) return { ok: false, reason: 'revoked' }

  try {
    await lookup.markUsed(row.id)
  } catch (error) {
    // Never include the token itself in logs
    console.error('Failed to update api token lastUsedAt:', error instanceof Error ? error.message : error)
  }

  return { ok: true, userId: row.userId, tokenId: row.id }
}
