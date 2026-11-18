import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { decrypt } from '@/lib/encryption'
import type { CategoryLookup, CategoryRuleLike } from '@/lib/categorise'
import { DEFAULT_GEMINI_MODEL, type GeminiConfig } from './ai-pdf'
import { IngestError } from './types'
import {
  accounts as accountsTable,
  categories as categoriesTable,
  categoryRules as categoryRulesTable,
  importSessions as importSessionsTable,
  transactions as transactionsTable,
  users as usersTable,
} from '@/db/schema'

export type NewTransactionRow = typeof transactionsTable.$inferInsert
export type NewImportSessionRow = typeof importSessionsTable.$inferInsert

export type { CategoryLookup }

/**
 * Everything `ingest()` needs from the database. Keeping it behind an interface
 * lets the pipeline be unit-tested with an in-memory store.
 */
export interface IngestStore {
  accountBelongsToUser(userId: string, accountId: string): Promise<boolean>
  getExistingHashes(userId: string): Promise<Set<string>>
  getCategories(userId: string): Promise<CategoryLookup>
  /** The user's category rules (any order; the categoriser sorts by priority). */
  getCategoryRules(userId: string): Promise<CategoryRuleLike[]>
  /** Display name of the account, for the import summary notification. */
  getAccountName(userId: string, accountId: string): Promise<string | null>
  insertTransactions(rows: NewTransactionRow[]): Promise<void>
  createImportSession(row: NewImportSessionRow): Promise<string>
  /** The user's own Gemini key + model, or null when they haven't set one. */
  getGeminiConfig(userId: string): Promise<GeminiConfig | null>
}

async function getOrCreateDefaultCategory(userId: string) {
  const existing = await db.select().from(categoriesTable).where(eq(categoriesTable.userId, userId)).limit(1)
  if (existing.length > 0) return existing[0]

  const inserted = await db
    .insert(categoriesTable)
    .values({ userId, name: 'General', color: '#6B7280', icon: '💳', isDefault: true })
    .returning()
  return inserted[0]
}

export const drizzleStore: IngestStore = {
  async accountBelongsToUser(userId, accountId) {
    const rows = await db
      .select({ id: accountsTable.id })
      .from(accountsTable)
      .where(and(eq(accountsTable.id, accountId), eq(accountsTable.userId, userId)))
      .limit(1)
    return rows.length > 0
  },

  async getExistingHashes(userId) {
    const rows = await db
      .select({ hash: transactionsTable.duplicateCheckHash })
      .from(transactionsTable)
      .where(eq(transactionsTable.userId, userId))
    return new Set<string>(rows.map(r => r.hash).filter((h): h is string => Boolean(h)))
  },

  async getCategories(userId) {
    // Fallback category for rows whose category name doesn't match any of the user's categories
    const defaultCategory = await getOrCreateDefaultCategory(userId)
    const userCategories = await db
      .select({ id: categoriesTable.id, name: categoriesTable.name })
      .from(categoriesTable)
      .where(eq(categoriesTable.userId, userId))

    return {
      defaultCategoryId: defaultCategory.id,
      byName: new Map<string, string>(userCategories.map(c => [c.name.toLowerCase(), c.id])),
    }
  },

  async getCategoryRules(userId) {
    return db
      .select({
        id: categoryRulesTable.id,
        matchType: categoryRulesTable.matchType,
        pattern: categoryRulesTable.pattern,
        categoryId: categoryRulesTable.categoryId,
        priority: categoryRulesTable.priority,
        createdAt: categoryRulesTable.createdAt,
      })
      .from(categoryRulesTable)
      .where(eq(categoryRulesTable.userId, userId))
  },

  async getAccountName(userId, accountId) {
    const [row] = await db
      .select({ name: accountsTable.name })
      .from(accountsTable)
      .where(and(eq(accountsTable.id, accountId), eq(accountsTable.userId, userId)))
      .limit(1)
    return row?.name ?? null
  },

  async insertTransactions(rows) {
    if (rows.length === 0) return
    await db.insert(transactionsTable).values(rows)
  },

  async createImportSession(row) {
    const [created] = await db.insert(importSessionsTable).values(row).returning({ id: importSessionsTable.id })
    return created.id
  },
  async getGeminiConfig(userId) {
    const [user] = await db
      .select({ geminiApiKey: usersTable.geminiApiKey, preferences: usersTable.preferences })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1)
    if (!user?.geminiApiKey) return null

    try {
      return {
        apiKey: decrypt(user.geminiApiKey),
        model: user.preferences?.geminiModel ?? DEFAULT_GEMINI_MODEL,
      }
    } catch {
      throw new IngestError('Your Gemini API key could not be decrypted. Please re-enter it in Settings.', 'parse_failed')
    }
  },
}
