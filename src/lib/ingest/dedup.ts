import crypto from 'crypto'
import type { TransactionData } from './types'

/**
 * Hash used to detect duplicate transactions.
 *
 * - Bank-supplied `transactionId` wins when present.
 * - Otherwise a composite of user, account, date, normalised description and amount.
 */
export function generateTransactionHash(tx: TransactionData, userId: string, accountId: string): string {
  if (tx.transactionId) {
    return crypto.createHash('sha256').update(`${userId}-${accountId}-${tx.transactionId}`).digest('hex').substring(0, 16)
  }

  // Normalise description to lowercase for case-insensitive duplicate detection.
  // accountId (not the CSV's account name) keeps the hash stable.
  const normalizedDescription = tx.description.toLowerCase().trim()
  const hashInput = `${userId}-${accountId}-${tx.date}-${normalizedDescription}-${tx.amount}`
  return crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 16)
}

export interface HashedTransaction<T extends TransactionData = TransactionData> {
  tx: T
  hash: string
  duplicate: boolean
  reason?: string
}

/**
 * Decide, for each transaction, whether it is new or a duplicate.
 * `existingHashes` is mutated: accepted hashes are added so later rows in the same batch collide.
 */
export function assignHashes<T extends TransactionData>(
  transactions: T[],
  userId: string,
  accountId: string,
  existingHashes: Set<string>
): HashedTransaction<T>[] {
  return transactions.map(tx => {
    const amount = parseFloat(tx.amount.toString())
    if (amount === 0) {
      return { tx, hash: '', duplicate: true, reason: 'Transaction has zero amount' }
    }

    const hash = generateTransactionHash(tx, userId, accountId)
    if (existingHashes.has(hash)) {
      return { tx, hash, duplicate: true, reason: 'Duplicate transaction already exists' }
    }

    existingHashes.add(hash)
    return { tx, hash, duplicate: false }
  })
}
