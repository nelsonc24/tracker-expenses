'use client'

import { toast } from 'sonner'
import { MAX_PATTERN_LENGTH, type RuleMatchType } from '@/lib/categorise/rules'

interface RuleCandidate {
  description: string
  merchant?: string | null
  categoryId: string
  categoryName: string
}

const UNKNOWN_MERCHANTS = new Set(['', 'unknown', 'unknown merchant'])

/** Prefer the merchant name (exact match); fall back to "description contains". */
export function ruleFromTransaction(tx: Pick<RuleCandidate, 'description' | 'merchant'>): {
  matchType: RuleMatchType
  pattern: string
} | null {
  const merchant = (tx.merchant ?? '').trim()
  if (!UNKNOWN_MERCHANTS.has(merchant.toLowerCase()) && merchant.length <= MAX_PATTERN_LENGTH) {
    return { matchType: 'merchant', pattern: merchant }
  }
  const description = tx.description.trim().slice(0, MAX_PATTERN_LENGTH).trim()
  return description ? { matchType: 'contains', pattern: description } : null
}

/**
 * After the user re-categorises a transaction, offer to turn it into a rule for future imports.
 * Shows a toast with an "Always" action; nothing is saved unless the user clicks it.
 */
export function offerCategoryRule(candidate: RuleCandidate) {
  const rule = ruleFromTransaction(candidate)
  if (!rule) return

  toast(`Always categorise "${rule.pattern}" as ${candidate.categoryName}?`, {
    description: 'Future imports will use this rule.',
    duration: 10_000,
    action: {
      label: 'Always',
      onClick: async () => {
        try {
          const response = await fetch('/api/category-rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...rule, categoryId: candidate.categoryId, createdFrom: 'learned' }),
          })
          const result = await response.json().catch(() => ({}))
          if (!response.ok) throw new Error(result.error || 'Failed to create rule')
          toast.success(result.updated ? 'Rule updated' : 'Rule created', {
            description: 'Manage rules in Settings → Categories.',
          })
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to create rule')
        }
      },
    },
  })
}
