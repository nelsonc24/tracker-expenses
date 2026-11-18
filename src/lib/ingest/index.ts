import crypto from 'crypto'
import { isTransferTransaction } from '@/lib/csv-processing'
import { createCategoriser, isGenericCategoryName, type CategoryRuleLike } from '@/lib/categorise'
import { suggestCategoriesWithAI, type GenerateSuggestions } from '@/lib/categorise/ai-suggest'
import type { NotificationEvent } from '@/lib/notifications/notifier'
import { assignHashes } from './dedup'
import { parseUploadedFile } from './parse'
import { drizzleStore, type IngestStore, type NewTransactionRow } from './store'
import {
  IngestError,
  type IngestFileInfo,
  type IngestParams,
  type IngestResult,
  type IngestRowError,
  type IngestSource,
  type TransactionData,
} from './types'

export * from './types'
export { parseUploadedFile, detectFileKind } from './parse'
export { parseStatementWithAI, checkStatementBalance, type BalanceCheck, type GeminiConfig } from './ai-pdf'
export { generateTransactionHash, assignHashes } from './dedup'
export { drizzleStore, type IngestStore } from './store'

/** Why a row should be looked at by a human, or null if it looks fine. */
function reviewReason(
  tx: TransactionData,
  categoryConfident: boolean,
  occurrence: number
): 'parser_unsure' | 'low_confidence_category' | 'possible_duplicate' | null {
  if (tx.needsReview) return 'parser_unsure'
  if (!categoryConfident) return 'low_confidence_category'
  // An identical row already appeared (or was already saved): probably a real second purchase, but check
  if (occurrence > 1) return 'possible_duplicate'
  return null
}

// Remove common prefixes / suffixes to get a short merchant name
function extractMerchant(description: string): string {
  const cleaned = description
    .replace(/^(EFTPOS|CARD|ATM|TRANSFER|DIRECT DEBIT|DD)\s*/i, '')
    .replace(/\s+\d{2}\/\d{2}.*$/, '') // dates at the end
    .replace(/\s+\d{4}.*$/, '') // years at the end
    .replace(/\s+AUS.*$/, '') // country codes
    .trim()

  return cleaned.split(' ').slice(0, 3).join(' ') || 'Unknown Merchant'
}

export type { GenerateStatement } from './ai-pdf'

type NotifyFn = (userId: string, event: NotificationEvent) => Promise<unknown>

/** Optional collaborators for `importTransactions` / `ingest` (test seams). */
export interface ImportHooks {
  /** Sends the import summary. Defaults to the real `notify()`. */
  notify?: NotifyFn
  /** Replaces the Gemini call that suggests categories for uncategorised rows. */
  generateCategorySuggestions?: GenerateSuggestions
}

// Loaded lazily so the import pipeline doesn't pull in the email/Telegram clients until needed
const defaultNotify: NotifyFn = async (userId, event) =>
  (await import('@/lib/notifications/notifier')).notify(userId, event)

export interface ImportTransactionsParams {
  userId: string
  accountId: string
  source: IngestSource
  file: IngestFileInfo
  transactions: TransactionData[]
  /** Rows the parser rejected; recorded on the import session. */
  parseErrors?: IngestRowError[]
}

/**
 * Save already-parsed transactions: dedupe, categorise, flag transfers, insert,
 * record an `import_sessions` row and send the import summary.
 */
export async function importTransactions(
  params: ImportTransactionsParams,
  store: IngestStore = drizzleStore,
  hooks: ImportHooks = {}
): Promise<IngestResult> {
  const { userId, accountId, source, file, transactions, parseErrors = [] } = params

  if (!(await store.accountBelongsToUser(userId, accountId))) {
    throw new IngestError('Invalid account or account does not belong to user', 'invalid_account')
  }

  const existingHashes = await store.getExistingHashes(userId)
  const categories = await store.getCategories(userId)
  const categoriser = createCategoriser(await loadRules(store, userId), categories)

  const hashed = assignHashes(transactions, userId, accountId, existingHashes)

  const rows: NewTransactionRow[] = []
  const skipped: IngestResult['skipped'] = []
  // Rows nothing could categorise (candidates for the optional AI suggestion)
  const uncategorised: UncategorisedRow[] = []

  for (const { tx, hash, duplicate, reason, occurrence } of hashed) {
    if (duplicate) {
      skipped.push({ description: tx.description, date: tx.date, amount: tx.amount, reason: reason ?? 'Duplicate' })
      continue
    }

    const amount = parseFloat(tx.amount.toString())
    const merchant = tx.merchant || extractMerchant(tx.description)
    const category = categoriser.categorise({ description: tx.description, merchant, amount, category: tx.category })
    if (category.source === 'default') uncategorised.push({ index: rows.length, description: tx.description, amount })
    const detectedTransfer = isTransferTransaction(tx.description || '', tx.reference || '')

    rows.push({
      id: crypto.randomUUID(),
      userId,
      accountId,
      categoryId: category.categoryId,
      amount: amount.toFixed(2),
      description: tx.description.trim(),
      merchant,
      reference: tx.reference || null,
      receiptNumber: tx.receiptNumber || null,
      // Same as before: ISO date string -> Date (UTC midnight)
      transactionDate: new Date(tx.date),
      type: amount < 0 ? 'debit' : 'credit',
      status: 'cleared',
      isTransfer: tx.isTransfer === true || detectedTransfer,
      needsReview: reviewReason(tx, category.confident, occurrence) !== null,
      duplicateCheckHash: hash,
      originalData: tx as unknown as Record<string, string | number | boolean | null>,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  await applyAiSuggestions(store, userId, categories.byName, rows, uncategorised, hooks.generateCategorySuggestions)

  const sessionBase = {
    userId,
    fileName: file.fileName,
    fileSize: file.fileSize,
    fileType: file.fileType,
    bankFormat: file.bankFormat ?? null,
    source,
    totalRows: transactions.length + parseErrors.length,
    processedRows: transactions.length,
    failedRows: parseErrors.length,
  }

  try {
    await store.insertTransactions(rows)
  } catch (error) {
    // Leave a trace of the failed attempt, then let the caller see the original error
    try {
      await store.createImportSession({
        ...sessionBase,
        status: 'failed',
        successfulRows: 0,
        needsReviewCount: 0,
        errors: [{ row: 0, message: error instanceof Error ? error.message : 'Insert failed' }],
        metadata: { duplicatesFound: skipped.length },
      })
    } catch (sessionError) {
      console.error('Failed to record failed import session:', sessionError)
    }
    throw error
  }

  const needsReview = rows.filter(r => r.needsReview).length

  const sessionId = await store.createImportSession({
    ...sessionBase,
    status: 'completed',
    successfulRows: rows.length,
    needsReviewCount: needsReview,
    errors: parseErrors.map(e => ({ row: e.row ?? 0, field: e.field, message: e.message })),
    metadata: { duplicatesFound: skipped.length },
  })

  await sendImportSummary(store, userId, accountId, rows.length, needsReview, hooks.notify ?? defaultNotify)

  return {
    sessionId,
    inserted: rows.length,
    duplicates: skipped.length,
    needsReview,
    errors: parseErrors,
    totalProcessed: transactions.length,
    skipped,
    insertedRows: rows as unknown as Array<Record<string, unknown>>,
  }
}

interface UncategorisedRow {
  /** Index into the rows about to be inserted. */
  index: number
  description: string
  amount: number
}

/** The user's rules, or none if they can't be loaded (an import must not fail because of rules). */
async function loadRules(store: IngestStore, userId: string): Promise<CategoryRuleLike[]> {
  try {
    return await store.getCategoryRules(userId)
  } catch (error) {
    console.error('Failed to load category rules; importing without them:', error)
    return []
  }
}

/**
 * Ask Gemini (the user's own key) to suggest a category for rows nothing else matched.
 * Those rows keep `needsReview = true`. Skipped without a key; failures are logged, never thrown.
 */
async function applyAiSuggestions(
  store: IngestStore,
  userId: string,
  byName: Map<string, string>,
  rows: NewTransactionRow[],
  uncategorised: UncategorisedRow[],
  generate?: GenerateSuggestions
): Promise<void> {
  if (uncategorised.length === 0) return
  try {
    const config = await store.getGeminiConfig(userId)
    if (!config) return

    const names = [...byName.keys()].filter(name => !isGenericCategoryName(name))
    const suggestions = await suggestCategoriesWithAI(
      uncategorised.map(u => ({ key: u.index, description: u.description, amount: u.amount })),
      names,
      config,
      generate
    )
    for (const [index, name] of suggestions) {
      const categoryId = byName.get(name.toLowerCase())
      if (categoryId && rows[index]) rows[index].categoryId = categoryId
    }
  } catch (error) {
    console.error('AI category suggestion failed; leaving rows uncategorised:', error instanceof Error ? error.message : error)
  }
}

/** Plan 3.2: tell the user what was imported. Never makes the import fail. */
async function sendImportSummary(
  store: IngestStore,
  userId: string,
  accountId: string,
  inserted: number,
  needsReview: number,
  notify: NotifyFn
): Promise<void> {
  try {
    const accountName = (await store.getAccountName(userId, accountId)) ?? 'your account'
    await notify(userId, { type: 'import_summary', accountName, inserted, needsReview })
  } catch (error) {
    console.error('Import summary notification failed:', error instanceof Error ? error.message : error)
  }
}

/**
 * Turn a file into saved transactions: detect format -> parse -> dedupe ->
 * categorise -> transfer detection -> insert -> import session -> summary notification.
 */
export async function ingest(
  params: IngestParams,
  store: IngestStore = drizzleStore,
  hooks: ImportHooks = {}
): Promise<IngestResult> {
  const parsed = await parseUploadedFile({
    fileName: params.fileName,
    mimeType: params.mimeType,
    buffer: params.buffer,
    accountId: params.accountId,
    bankFormat: params.bankFormat,
    aiConfig: () => store.getGeminiConfig(params.userId),
    generateStatement: params.generateStatement,
  })

  return importTransactions(
    {
      userId: params.userId,
      accountId: params.accountId,
      source: params.source,
      file: {
        fileName: params.fileName,
        fileSize: params.buffer.byteLength,
        fileType: parsed.kind,
        bankFormat: parsed.bankFormat ?? null,
      },
      transactions: parsed.transactions,
      parseErrors: parsed.errors,
    },
    store,
    hooks
  )
}
