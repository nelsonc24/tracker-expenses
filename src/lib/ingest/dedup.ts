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
 *
 * Two genuinely separate purchases can look identical (same day, merchant and amount: two
 * coffees). For rows without a bank transaction id we therefore add an occurrence index:
 * within one import, the n-th identical row hashes to `<base>-n`. The first occurrence keeps
 * the bare `<base>` hash, so rows saved before this change still match on re-import.
 *
 * Comparing against existing rows works the same way: a row is a duplicate only if the stored
 * set already holds the hash for *that* occurrence. Importing a file with 3 identical coffees
 * when 2 are already stored adds just the third.
 *
 * `existingHashes` is mutated: accepted hashes are added so later rows in the same batch collide.
 */
export function assignHashes<T extends TransactionData>(
  transactions: T[],
  userId: string,
  accountId: string,
  existingHashes: Set<string>
): HashedTransaction<T>[] {
  const occurrences = new Map<string, number>()

  return transactions.map(tx => {
    const amount = parseFloat(tx.amount.toString())
    if (amount === 0) {
      return { tx, hash: '', duplicate: true, reason: 'Transaction has zero amount' }
    }

    let hash = generateTransactionHash(tx, userId, accountId)

    // Bank-supplied ids are already unique; only the composite hash can collide
    if (!tx.transactionId) {
      const n = (occurrences.get(hash) ?? 0) + 1
      occurrences.set(hash, n)
      if (n > 1) hash = `${hash}-${n}`
    }

    if (existingHashes.has(hash)) {
      return { tx, hash, duplicate: true, reason: 'Duplicate transaction already exists' }
    }

    existingHashes.add(hash)
    return { tx, hash, duplicate: false }
  })
}
