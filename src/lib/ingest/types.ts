import type { BankFormat } from '@/lib/csv-processing'

/** Where a file came from. Stored on `import_sessions.source`. */
export type IngestSource = 'upload' | 'email' | 'watcher' | 'api'

/** Normalised transaction shape shared by every parser and the import step. */
export interface TransactionData {
  date: string // YYYY-MM-DD
  description: string
  amount: number // negative = money out
  category: string // category *name*; resolved to an id at save time
  account: string
  merchant?: string
  reference?: string
  balance?: number | null
  receiptNumber?: string | null
  transactionId?: string | null // bank's own unique id when the bank provides one
  isTransfer?: boolean
  type?: 'debit' | 'credit'
}

export interface IngestRowError {
  row?: number
  field?: string
  message: string
}

export interface SkippedTransaction {
  description: string
  date: string
  amount: number
  reason: string
}

export interface ParsedFile {
  kind: 'csv' | 'pdf' | 'json'
  transactions: TransactionData[]
  /** Statement details for PDFs (balances, due date, ...). */
  metadata?: Record<string, unknown>
  /** CSV only: the format that was used (detected or supplied). */
  bankFormat?: string
  errors: IngestRowError[]
}

export interface IngestResult {
  sessionId: string | null
  inserted: number
  duplicates: number
  needsReview: number
  errors: IngestRowError[]
  totalProcessed: number
  /** Rows that were skipped, with the reason (duplicate / zero amount). */
  skipped: SkippedTransaction[]
  /** The rows that were written (needed by the upload route's response). */
  insertedRows: Array<Record<string, unknown>>
}

export interface IngestFileInfo {
  fileName: string
  fileSize: number
  fileType: string // 'csv' | 'pdf' | 'json'
  bankFormat?: string | null
}

export interface IngestParams {
  userId: string
  accountId: string
  source: IngestSource
  fileName: string
  mimeType?: string
  buffer: ArrayBuffer | Uint8Array | Buffer
  /** Key of `bankFormats`. Omit (or 'auto') to auto-detect for CSV files. */
  bankFormat?: string
}

export class IngestError extends Error {
  constructor(
    message: string,
    public readonly code: 'invalid_account' | 'unsupported_file' | 'parse_failed' | 'invalid_input',
    public readonly rowErrors: IngestRowError[] = []
  ) {
    super(message)
    this.name = 'IngestError'
  }
}

export type { BankFormat }
