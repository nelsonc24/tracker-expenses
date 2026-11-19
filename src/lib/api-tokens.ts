import crypto from 'crypto'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { apiTokens } from '@/db/schema'

export const TOKEN_PREFIX = 'txk_'

/** A new random token. Only the hash is stored; the plain value is shown once. */
export function generateApiToken(): { token: string; tokenHash: string; tokenPrefix: string } {
  const token = `${TOKEN_PREFIX}${crypto.randomBytes(32).toString('base64url')}`
  return { token, tokenHash: hashApiToken(token), tokenPrefix: token.slice(0, TOKEN_PREFIX.length + 4) }
}

/** Tokens are long random strings, so a plain SHA-256 is enough (no need for a slow password hash). */
export function hashApiToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/** Pull the token out of `Authorization: Bearer <token>`. */
export function extractBearerToken(header: string | null | undefined): string | null {
  if (!header) return null
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header)
  return match && match[1].startsWith(TOKEN_PREFIX) ? match[1] : null
}

export interface TokenStore {
  /** Returns the owner's user id for a live (not revoked) token hash, and records the use. */
  findUserByTokenHash(tokenHash: string): Promise<string | null>
}

export const drizzleTokenStore: TokenStore = {
  async findUserByTokenHash(tokenHash) {
    const rows = await db
      .select({ id: apiTokens.id, userId: apiTokens.userId })
      .from(apiTokens)
      .where(and(eq(apiTokens.tokenHash, tokenHash), isNull(apiTokens.revokedAt)))
      .limit(1)
    if (rows.length === 0) return null
    // Best effort: a failure to record the use must not block the request
    try {
      await db.update(apiTokens).set({ lastUsedAt: new Date() }).where(eq(apiTokens.id, rows[0].id))
    } catch (error) {
      console.error('Failed to record API token use:', error)
    }
    return rows[0].userId
  },
}

/** Resolve a bearer header to a user id, or null if missing, malformed, unknown or revoked. */
export async function authenticateBearer(
  header: string | null | undefined,
  store: TokenStore = drizzleTokenStore
): Promise<string | null> {
  const token = extractBearerToken(header)
  if (!token) return null
  return store.findUserByTokenHash(hashApiToken(token))
}
