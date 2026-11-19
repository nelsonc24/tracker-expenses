/**
 * Shared transaction categoriser used by the import pipeline.
 *
 * Order:
 *   1. the user's own category rules (highest priority first)
 *   2. the category the parser suggested, if it is one of the user's (non-generic) categories
 *   3. the built-in keyword fallback (`keywordCategory`)
 *   4. nothing matched: the default category, and the row is flagged for review
 *
 * An optional AI suggestion for rows that end up in step 4 lives in `./ai-suggest.ts`;
 * those rows stay flagged for review.
 */
import { categorizeTransaction, extractMerchant } from '@/lib/csv-processing'
import { compileRules, findMatchingRule, type CategoryRuleLike, type CompiledRule } from './rules'

export * from './rules'

/** Category names that mean "we couldn't tell what this is". */
export const GENERIC_CATEGORY_NAMES = new Set(['', 'general', 'uncategorized', 'uncategorised'])

export const isGenericCategoryName = (name: string | null | undefined) =>
  GENERIC_CATEGORY_NAMES.has((name ?? '').trim().toLowerCase())

/**
 * Built-in keyword categoriser (the fallback when no user rule matches).
 *
 * Wraps the CSV keyword list and keeps the two credit-card statement rules that used to live
 * in `pdf-processing.ts` (card repayments and card fees/interest), so PDF imports don't regress.
 * Returns a category *name*; resolving it to one of the user's categories happens later.
 */
export function keywordCategory(description: string, merchant: string | null | undefined, amount: number): string {
  const desc = description.toLowerCase()

  // Credit card statements: repayments and card charges
  if (amount > 0 && /(payment received|bpay payment|paymentreceived)/.test(desc)) return 'Payment'
  // (\b around "fee" so "coffee" doesn't count; "interest" is safe as a substring on a debit)
  if (amount < 0 && /\bfees?\b|interest/.test(desc)) return 'Fees & Services'

  return categorizeTransaction(description, merchant || extractMerchant(description), amount)
}

export interface CategoryLookup {
  defaultCategoryId: string
  /** lower-cased category name -> id */
  byName: Map<string, string>
}

export interface CategoriseInput {
  description: string
  merchant?: string | null
  amount: number
  /** Category name suggested by the parser (keyword guess, or a name from a JSON import). */
  category?: string | null
}

export type CategorySource = 'rule' | 'parser' | 'keyword' | 'default'

export interface CategoryResolution {
  categoryId: string
  source: CategorySource
  /** True when we're reasonably sure; false means "flag for review". */
  confident: boolean
  ruleId?: string
}

export interface Categoriser {
  categorise(tx: CategoriseInput): CategoryResolution
}

/**
 * Build a categoriser for one import. Rules are compiled once (invalid ones skipped);
 * rules pointing at a category the user no longer has are ignored.
 */
export function createCategoriser(rules: CategoryRuleLike[], categories: CategoryLookup): Categoriser {
  const ownCategoryIds = new Set(categories.byName.values())
  const compiled: CompiledRule[] = compileRules(rules).filter(c => ownCategoryIds.has(c.rule.categoryId))

  const resolveName = (name: string | null | undefined): string | undefined => {
    if (!name || isGenericCategoryName(name)) return undefined
    return categories.byName.get(name.trim().toLowerCase())
  }

  return {
    categorise(tx) {
      const rule = findMatchingRule(compiled, { description: tx.description, merchant: tx.merchant })
      if (rule) return { categoryId: rule.categoryId, source: 'rule', confident: true, ruleId: rule.id }

      const fromParser = resolveName(tx.category)
      if (fromParser) return { categoryId: fromParser, source: 'parser', confident: true }

      const fromKeywords = resolveName(keywordCategory(tx.description, tx.merchant, tx.amount))
      if (fromKeywords) return { categoryId: fromKeywords, source: 'keyword', confident: true }

      return { categoryId: categories.defaultCategoryId, source: 'default', confident: false }
    },
  }
}
