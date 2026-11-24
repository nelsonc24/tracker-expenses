import type { CategoryRuleLike } from '@/lib/categorise'
import type { GeminiConfig } from '@/lib/ingest/ai-pdf'
import type { IngestStore, NewImportSessionRow, NewTransactionRow } from '@/lib/ingest/store'

/** In-memory IngestStore for tests. State persists across calls, like a real database. */
export function createMemoryStore(
  options: {
    accountIds?: string[]
    userId?: string
    gemini?: GeminiConfig | null
    rules?: CategoryRuleLike[]
    /** Extra categories as [lower-cased name, id]. */
    categories?: Array<[string, string]>
  } = {}
) {
  const userId = options.userId ?? 'user_1'
  const accountIds = new Set(options.accountIds ?? ['acc_1'])
  const transactions: NewTransactionRow[] = []
  const sessions: NewImportSessionRow[] = []
  const rules: CategoryRuleLike[] = [...(options.rules ?? [])]

  const categories = new Map<string, string>([
    ['groceries', 'cat_groceries'],
    ['general', 'cat_general'],
    ['transfer', 'cat_transfer'],
    ...(options.categories ?? []),
  ])

  const store: IngestStore = {
    async accountBelongsToUser(uid, accountId) {
      return uid === userId && accountIds.has(accountId)
    },
    async getExistingHashes(uid) {
      return new Set(
        transactions.filter(t => t.userId === uid && t.duplicateCheckHash).map(t => t.duplicateCheckHash as string)
      )
    },
    async getCategories() {
      return { defaultCategoryId: 'cat_general', byName: new Map(categories) }
    },
    async getCategoryRules() {
      return rules
    },
    async getAccountName(uid, accountId) {
      return uid === userId && accountIds.has(accountId) ? `Account ${accountId}` : null
    },
    async insertTransactions(rows) {
      transactions.push(...rows)
    },
    async createImportSession(row) {
      sessions.push(row)
      return `session_${sessions.length}`
    },
    async getGeminiConfig() {
      return options.gemini ?? null
    },
  }

  return { store, transactions, sessions, rules, userId }
}
