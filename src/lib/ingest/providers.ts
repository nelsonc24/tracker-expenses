import { format } from 'date-fns'
import { importTransactions } from './index'
import { drizzleStore, type IngestStore } from './store'
import type { IngestResult, TransactionData } from './types'

/**
 * Bank-feed providers (Phase 4): interface only, no implementation.
 *
 * A paid aggregator (e.g. Basiq, Fiskil or Biza.io "openfeed") could plug in
 * here later by implementing `BankFeedProvider`. The owner has decided not to
 * use one for now, and never to screen-scrape or store bank credentials, so a
 * provider must authenticate through the aggregator's own consent flow.
 */

export interface BankFeedAccount {
  /** The provider's id for the account. Matches `TransactionData.account` from `fetchTransactions`. */
  externalId: string
  name: string
  institution?: string
  /** 'checking' | 'savings' | 'credit', same values as `accounts.account_type`. */
  accountType?: string
  currency?: string
}

export interface BankFeedProvider {
  /** Stable key, e.g. 'basiq'. Recorded as the import session's bank format. */
  readonly id: string
  listAccounts(): Promise<BankFeedAccount[]>
  /**
   * Transactions posted on or after `since`, already normalised.
   * `account` must be the provider's `externalId`; amounts are negative for money out;
   * set `transactionId` to the provider's id so dedup stays exact.
   */
  fetchTransactions(since: Date): Promise<TransactionData[]>
}

export interface SyncOptions {
  userId: string
  since: Date
  /** Provider account `externalId` → local `accounts.id`. Unmapped accounts are skipped. */
  accountMap: Record<string, string>
}

export interface SyncAccountResult {
  externalAccountId: string
  accountId: string
  result?: IngestResult
  error?: string
}

export interface SyncResult {
  accounts: SyncAccountResult[]
  /** Provider accounts that had transactions but no entry in `accountMap`. */
  unmappedAccounts: string[]
}

/**
 * Pull transactions from a provider and save them through the ingest pipeline
 * (source 'api'). Uses `importTransactions()`, the save step that `ingest()`
 * runs after parsing, because feed data is already parsed: dedup, categorisation,
 * transfer detection, needs-review and the import session all behave the same.
 * One account failing doesn't stop the others.
 */
export async function sync(
  provider: BankFeedProvider,
  options: SyncOptions,
  store: IngestStore = drizzleStore
): Promise<SyncResult> {
  const transactions = await provider.fetchTransactions(options.since)

  const byAccount = new Map<string, TransactionData[]>()
  for (const tx of transactions) {
    const list = byAccount.get(tx.account) ?? []
    list.push(tx)
    byAccount.set(tx.account, list)
  }

  const result: SyncResult = { accounts: [], unmappedAccounts: [] }

  for (const [externalAccountId, rows] of byAccount) {
    const accountId = options.accountMap[externalAccountId]
    if (!accountId) {
      result.unmappedAccounts.push(externalAccountId)
      continue
    }

    try {
      const imported = await importTransactions(
        {
          userId: options.userId,
          accountId,
          source: 'api',
          file: {
            fileName: `${provider.id} sync since ${format(options.since, 'yyyy-MM-dd')}`,
            fileSize: 0,
            fileType: 'feed',
            bankFormat: provider.id,
          },
          transactions: rows.map(tx => ({ ...tx, account: accountId })),
        },
        store
      )
      result.accounts.push({ externalAccountId, accountId, result: imported })
    } catch (error) {
      result.accounts.push({
        externalAccountId,
        accountId,
        error: error instanceof Error ? error.message : 'Import failed',
      })
    }
  }

  return result
}
