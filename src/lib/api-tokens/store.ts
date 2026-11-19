import { and, count, desc, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { apiTokens } from '@/db/schema'
import type { ApiTokenLookup } from './tokens'

/** Columns that are safe to send to the browser (no hash). */
export const publicTokenColumns = {
  id: apiTokens.id,
  name: apiTokens.name,
  tokenPrefix: apiTokens.tokenPrefix,
  createdAt: apiTokens.createdAt,
  lastUsedAt: apiTokens.lastUsedAt,
}

export const apiTokenLookup: ApiTokenLookup = {
  async findByHash(tokenHash) {
    const rows = await db
      .select({
        id: apiTokens.id,
        userId: apiTokens.userId,
        tokenHash: apiTokens.tokenHash,
        revokedAt: apiTokens.revokedAt,
      })
      .from(apiTokens)
      .where(eq(apiTokens.tokenHash, tokenHash))
      .limit(1)
    return rows[0] ?? null
  },

  async markUsed(tokenId) {
    await db.update(apiTokens).set({ lastUsedAt: new Date() }).where(eq(apiTokens.id, tokenId))
  },
}

export async function listActiveTokens(userId: string) {
  return db
    .select(publicTokenColumns)
    .from(apiTokens)
    .where(and(eq(apiTokens.userId, userId), isNull(apiTokens.revokedAt)))
    .orderBy(desc(apiTokens.createdAt))
}

export async function countActiveTokens(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(apiTokens)
    .where(and(eq(apiTokens.userId, userId), isNull(apiTokens.revokedAt)))
  return row?.value ?? 0
}

export async function insertToken(userId: string, name: string, tokenHash: string, tokenPrefix: string) {
  const [row] = await db.insert(apiTokens).values({ userId, name, tokenHash, tokenPrefix }).returning(publicTokenColumns)
  return row
}

/** Soft-revoke: keeps the row (for auditing) but the token stops working. Returns false if not found. */
export async function revokeToken(userId: string, tokenId: string): Promise<boolean> {
  const rows = await db
    .update(apiTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiTokens.id, tokenId), eq(apiTokens.userId, userId), isNull(apiTokens.revokedAt)))
    .returning({ id: apiTokens.id })
  return rows.length > 0
}
