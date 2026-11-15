import crypto from 'crypto'
import { isTransferTransaction } from '@/lib/csv-processing'
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
export { generateTransactionHash, assignHashes } from './dedup'
export { drizzleStore, type IngestStore } from './store'

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
 * and record an `import_sessions` row.
 */
export async function importTransactions(
  params: ImportTransactionsParams,
  store: IngestStore = drizzleStore
): Promise<IngestResult> {
  const { userId, accountId, source, file, transactions, parseErrors = [] } = params

  if (!(await store.accountBelongsToUser(userId, accountId))) {
    throw new IngestError('Invalid account or account does not belong to user', 'invalid_account')
  }

  const existingHashes = await store.getExistingHashes(userId)
  const categories = await store.getCategories(userId)

  const hashed = assignHashes(transactions, userId, accountId, existingHashes)

  const rows: NewTransactionRow[] = []
  const skipped: IngestResult['skipped'] = []

  for (const { tx, hash, duplicate, reason } of hashed) {
    if (duplicate) {
      skipped.push({ description: tx.description, date: tx.date, amount: tx.amount, reason: reason ?? 'Duplicate' })
      continue
    }

    const amount = parseFloat(tx.amount.toString())
    const categoryId = tx.category
      ? (categories.byName.get(tx.category.toLowerCase()) ?? categories.defaultCategoryId)
      : categories.defaultCategoryId
    const detectedTransfer = isTransferTransaction(tx.description || '', tx.reference || '')

    rows.push({
      id: crypto.randomUUID(),
      userId,
      accountId,
      categoryId,
      amount: amount.toFixed(2),
      description: tx.description.trim(),
      merchant: tx.merchant || extractMerchant(tx.description),
      reference: tx.reference || null,
      receiptNumber: tx.receiptNumber || null,
      // Same as before: ISO date string -> Date (UTC midnight)
      transactionDate: new Date(tx.date),
      type: amount < 0 ? 'debit' : 'credit',
      status: 'cleared',
      isTransfer: tx.isTransfer === true || detectedTransfer,
      duplicateCheckHash: hash,
      originalData: tx as unknown as Record<string, string | number | boolean | null>,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

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

  const needsReview = 0 // populated by the needs-review flag (plan step 1.6)

  const sessionId = await store.createImportSession({
    ...sessionBase,
    status: 'completed',
    successfulRows: rows.length,
    needsReviewCount: needsReview,
    errors: parseErrors.map(e => ({ row: e.row ?? 0, field: e.field, message: e.message })),
    metadata: { duplicatesFound: skipped.length },
  })

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

/**
 * Turn a file into saved transactions: detect format -> parse -> dedupe ->
 * categorise -> transfer detection -> insert -> import session.
 */
export async function ingest(params: IngestParams, store: IngestStore = drizzleStore): Promise<IngestResult> {
  const parsed = await parseUploadedFile({
    fileName: params.fileName,
    mimeType: params.mimeType,
    buffer: params.buffer,
    accountId: params.accountId,
    bankFormat: params.bankFormat,
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
    store
  )
}
