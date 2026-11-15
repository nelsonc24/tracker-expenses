/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  MIN_DETECTION_CONFIDENCE,
  bankFormats,
  detectBankFormatFromText,
  parseCSVLine,
  splitCsvLines,
  validateTransactionRow,
  type BankFormat,
} from '@/lib/csv-processing'
import { creditCardStatementToTransactions, parseCreditCardPDF } from '@/lib/pdf-processing'
import { parseStatementWithAI, type GeminiConfig, type GenerateStatement } from './ai-pdf'
import { IngestError, type IngestRowError, type ParsedFile, type TransactionData } from './types'

export type FileKind = 'csv' | 'pdf' | 'json'

export function toArrayBuffer(buffer: ArrayBuffer | Uint8Array | Buffer): ArrayBuffer {
  if (buffer instanceof ArrayBuffer) return buffer
  const copy = new ArrayBuffer(buffer.byteLength)
  new Uint8Array(copy).set(buffer)
  return copy
}

/** Work out the file kind from an explicit hint, the extension, then the mime type. */
export function detectFileKind(fileName: string, mimeType?: string, hint?: string): FileKind | null {
  const candidates = [hint, fileName.split('.').pop(), mimeType?.split('/').pop()]
  for (const candidate of candidates) {
    const value = candidate?.toLowerCase()
    if (value === 'pdf') return 'pdf'
    if (value === 'json') return 'json'
    if (value === 'csv' || value === 'plain') return 'csv'
  }
  return null
}

function parseJson(buffer: ArrayBuffer, accountId: string): ParsedFile {
  const data = JSON.parse(new TextDecoder().decode(buffer))

  if (!Array.isArray(data) && !data.transactions) {
    throw new IngestError(
      'Invalid JSON format. Expected an array of transactions or an object with a transactions array.',
      'invalid_input'
    )
  }

  const items = Array.isArray(data) ? data : data.transactions
  const transactions: TransactionData[] = items.map((t: any) => ({
    date: t.date || t.transaction_date || t.transactionDate,
    description: t.description || t.merchant || t.name,
    amount: parseFloat(t.amount),
    category: t.category || 'Uncategorized',
    account: accountId,
    type: (parseFloat(t.amount) >= 0 ? 'credit' : 'debit') as 'debit' | 'credit',
  }))

  return { kind: 'json', transactions, errors: [] }
}

export type AiConfigSource = GeminiConfig | null | (() => Promise<GeminiConfig | null>)

async function parsePdf(
  buffer: ArrayBuffer,
  accountId: string,
  aiConfig?: AiConfigSource,
  generate?: GenerateStatement
): Promise<ParsedFile> {
  // 1. Deterministic, free parser first (Latitude)
  let regexError: unknown
  try {
    const statement = await parseCreditCardPDF(buffer)
    const count = statement.transactions.length + (statement.interestFreeTransactions?.length ?? 0)
    if (count > 0) {
      return {
        kind: 'pdf',
        parsedBy: 'regex',
        transactions: creditCardStatementToTransactions(statement, accountId),
        metadata: {
          statementDate: statement.statementDate,
          accountNumber: statement.accountNumber,
          openingBalance: statement.openingBalance,
          closingBalance: statement.closingBalance,
          creditLimit: statement.creditLimit,
          availableCredit: statement.availableCredit,
          minimumPayment: statement.minimumPayment,
          dueDate: statement.dueDate,
        },
        errors: [],
      }
    }
  } catch (error) {
    regexError = error
  }

  // 2. Fall back to Gemini, using the user's own key
  const config = typeof aiConfig === 'function' ? await aiConfig() : aiConfig
  if (!config) {
    throw new IngestError(
      'This PDF is not a supported statement format. Add your Gemini API key in Settings to enable AI parsing of other statements.',
      'parse_failed'
    )
  }

  if (regexError) console.warn('Regex PDF parser failed, using AI fallback:', regexError instanceof Error ? regexError.message : regexError)

  let result
  try {
    result = await parseStatementWithAI(new Uint8Array(buffer), accountId, config, generate)
  } catch (error) {
    throw new IngestError(
      `AI parsing of the PDF failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      'parse_failed'
    )
  }

  return {
    kind: 'pdf',
    parsedBy: 'ai',
    transactions: result.transactions,
    balanceCheck: result.balanceCheck,
    metadata: {
      statementDate: result.statement.statementDate,
      accountNumber: result.statement.accountNumberLast4,
      openingBalance: result.statement.openingBalance,
      closingBalance: result.statement.closingBalance,
      parsedBy: 'ai',
      balanceCheck: result.balanceCheck,
    },
    errors: result.balanceCheck.ok
      ? []
      : [{ message: result.balanceCheck.reason ?? 'AI balance check failed; all rows need review' }],
  }
}

/** Case-insensitively copy header values onto the column names a BankFormat expects. */
function withFormatAliases(row: Record<string, string>, format: BankFormat): Record<string, string> {
  const lowerToKey = new Map(Object.keys(row).map(key => [key.toLowerCase(), key]))
  const aliased = { ...row }
  for (const column of format.columns) {
    if (aliased[column] === undefined) {
      const source = lowerToKey.get(column.toLowerCase())
      if (source !== undefined) aliased[column] = row[source]
    }
  }
  return aliased
}

function parseCsv(buffer: ArrayBuffer, accountId: string, requestedFormat?: string): ParsedFile {
  const text = new TextDecoder().decode(buffer).replace(/^﻿/, '')
  const lines = splitCsvLines(text)
  if (lines.length === 0) {
    throw new IngestError('The CSV file is empty', 'parse_failed')
  }

  let formatKey: string
  if (requestedFormat && requestedFormat !== 'auto') {
    if (!bankFormats[requestedFormat]) {
      throw new IngestError(`Unknown bank format: ${requestedFormat}`, 'invalid_input')
    }
    formatKey = requestedFormat
  } else {
    const detection = detectBankFormatFromText(text)
    if (!detection.format || detection.confidence < MIN_DETECTION_CONFIDENCE) {
      throw new IngestError(
        'Could not detect the bank format of this CSV. Please choose the bank format manually.',
        'parse_failed'
      )
    }
    formatKey = detection.format
  }

  const format = bankFormats[formatKey]
  if (format.columns.length === 0) {
    throw new IngestError('The custom format cannot be used for automatic imports', 'invalid_input')
  }

  // Only CommBank has no header row (skipRows is explicitly 0)
  const hasHeader = format.skipRows !== 0
  const headers = hasHeader ? parseCSVLine(lines[0]) : []
  const dataLines = hasHeader ? lines.slice(1) : lines

  const transactions: TransactionData[] = []
  const errors: IngestRowError[] = []

  dataLines.forEach((line, index) => {
    const fields = parseCSVLine(line)
    let rowData: Record<string, string> | string[] = fields
    if (hasHeader) {
      const object: Record<string, string> = {}
      headers.forEach((header, i) => {
        object[header.trim()] = (fields[i] || '').trim()
      })
      rowData = withFormatAliases(object, format)
    }

    const processed = validateTransactionRow(rowData, format, index)
    if (processed.status === 'error') {
      for (const err of processed.errors) {
        errors.push({ row: index + 1 + (hasHeader ? 1 : 0), field: err.field, message: err.message })
      }
      return
    }

    transactions.push({
      date: processed.date,
      description: processed.description,
      amount: processed.amount,
      category: processed.category,
      account: accountId,
      merchant: processed.merchant,
      reference: processed.reference || processed.merchant,
      balance: processed.balance ?? null,
      transactionId: processed.transactionId ?? null,
      receiptNumber: processed.receiptNumber ?? null,
      isTransfer: processed.isTransfer === true,
    })
  })

  return { kind: 'csv', transactions, bankFormat: formatKey, errors }
}

export interface ParseFileParams {
  fileName: string
  mimeType?: string
  /** Optional explicit hint ('pdf' | 'csv' | 'json'), e.g. from the upload form. */
  fileType?: string
  buffer: ArrayBuffer | Uint8Array | Buffer
  accountId: string
  bankFormat?: string
  /** Gemini settings for the PDF fallback; may be resolved lazily so the key is only read when needed. */
  aiConfig?: AiConfigSource
  /** Test seam: replaces the Gemini call. */
  generateStatement?: GenerateStatement
}

/** Detect what kind of file this is and turn it into normalised transactions. */
export async function parseUploadedFile(params: ParseFileParams): Promise<ParsedFile> {
  const kind = detectFileKind(params.fileName, params.mimeType, params.fileType)
  if (!kind) {
    throw new IngestError('Unsupported file type. Please upload a PDF, CSV, or JSON file.', 'unsupported_file')
  }

  const buffer = toArrayBuffer(params.buffer)
  switch (kind) {
    case 'pdf':
      return parsePdf(buffer, params.accountId, params.aiConfig, params.generateStatement)
    case 'json':
      return parseJson(buffer, params.accountId)
    case 'csv':
      return parseCsv(buffer, params.accountId, params.bankFormat)
  }
}
