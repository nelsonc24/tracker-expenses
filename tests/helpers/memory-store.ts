import type { IngestStore, NewImportSessionRow, NewTransactionRow } from '@/lib/ingest/store'

/** In-memory IngestStore for tests. State persists across calls, like a real database. */
export function createMemoryStore(options: { accountIds?: string[]; userId?: string } = {}) {
  const userId = options.userId ?? 'user_1'
  const accountIds = new Set(options.accountIds ?? ['acc_1'])
  const transactions: NewTransactionRow[] = []
  const sessions: NewImportSessionRow[] = []

  const categories = new Map<string, string>([
    ['groceries', 'cat_groceries'],
    ['general', 'cat_general'],
    ['transfer', 'cat_transfer'],
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
    async insertTransactions(rows) {
      transactions.push(...rows)
    },
    async createImportSession(row) {
      sessions.push(row)
      return `session_${sessions.length}`
    },
  }

  return { store, transactions, sessions, userId }
}
