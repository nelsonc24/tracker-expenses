/**
 * Category rules: "always categorise X as Y".
 *
 * Pure module (no database, no Node APIs) so it can be shared by the import pipeline,
 * the rules API and tests.
 */

export const RULE_MATCH_TYPES = ['contains', 'regex', 'merchant'] as const
export type RuleMatchType = (typeof RULE_MATCH_TYPES)[number]

export const RULE_ORIGINS = ['manual', 'learned'] as const
export type RuleOrigin = (typeof RULE_ORIGINS)[number]

/** Longest pattern we accept. Keeps regex evaluation cheap (ReDoS) and rules readable. */
export const MAX_PATTERN_LENGTH = 100
/** Only this much of a description is matched against rules (bounds regex run time). */
export const MAX_SUBJECT_LENGTH = 300

export interface CategoryRuleLike {
  id: string
  matchType: RuleMatchType | string
  pattern: string
  categoryId: string
  priority: number
  createdAt?: Date | string | null
}

export interface RuleSubject {
  description: string
  merchant?: string | null
}

export type PatternValidation = { ok: true; pattern: string } | { ok: false; error: string }

// A quantified group that itself contains a quantifier, e.g. (a+)+ or (\w*)* or (a|aa){2,}.
// These are the classic catastrophic-backtracking shapes; we refuse them outright.
const NESTED_QUANTIFIER = /\((?:[^()\\]|\\.)*[+*}](?:[^()\\]|\\.)*\)\s*(?:[+*]|\{\d*,?\d*\})/
// Back-references can also blow up and are never needed for categorising.
const BACK_REFERENCE = /\\[1-9]|\\k</

/** Most unbounded quantifiers (`*`, `+`, `{n,}`) a regex may have: more makes run time polynomial in the subject length. */
const MAX_UNBOUNDED_QUANTIFIERS = 3

/**
 * Structural ReDoS check, aware of escapes and character classes. Rejects a quantified group
 * that contains alternation or another group ((a|a)+, ((a+))+), and too many unbounded quantifiers.
 * Returns an error message, or null when the pattern looks safe.
 */
function unsafeRegexReason(pattern: string): string | null {
  const stack: Array<{ hasAlternation: boolean; hasGroup: boolean }> = []
  let unbounded = 0
  let inClass = false

  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i]
    if (ch === '\\') { i++; continue }
    if (inClass) { if (ch === ']') inClass = false; continue }

    if (ch === '[') inClass = true
    else if (ch === '(') {
      if (stack.length) stack[stack.length - 1].hasGroup = true
      stack.push({ hasAlternation: false, hasGroup: false })
    } else if (ch === '|') {
      if (stack.length) stack[stack.length - 1].hasAlternation = true
    } else if (ch === ')') {
      const group = stack.pop()
      const next = pattern.slice(i + 1).match(/^(?:[*+]|\{\d*,\d*\})/)
      if (group && next && (group.hasAlternation || group.hasGroup)) {
        return 'Repeated groups containing "|" or another group are not allowed'
      }
    } else if (ch === '*' || ch === '+') unbounded++
    else if (ch === '{' && /^\{\d+,\}/.test(pattern.slice(i))) unbounded++
  }

  return unbounded > MAX_UNBOUNDED_QUANTIFIERS
    ? `Use at most ${MAX_UNBOUNDED_QUANTIFIERS} "*" or "+" quantifiers in a regex`
    : null
}

function isRuleMatchType(value: string): value is RuleMatchType {
  return (RULE_MATCH_TYPES as readonly string[]).includes(value)
}

/** Lower-case and collapse whitespace so "WOOLWORTHS  Epping" equals "woolworths epping". */
export function normaliseText(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Check a pattern before it is saved or used. Invalid regexes, over-long patterns and
 * regex shapes prone to catastrophic backtracking are rejected with a readable error.
 */
export function validateRulePattern(matchType: string, rawPattern: string): PatternValidation {
  if (!isRuleMatchType(matchType)) {
    return { ok: false, error: `Unknown match type "${matchType}"` }
  }

  const pattern = (rawPattern ?? '').trim()
  if (!pattern) return { ok: false, error: 'Pattern cannot be empty' }
  if (pattern.length > MAX_PATTERN_LENGTH) {
    return { ok: false, error: `Pattern must be at most ${MAX_PATTERN_LENGTH} characters` }
  }

  if (matchType === 'regex') {
    if (NESTED_QUANTIFIER.test(pattern)) {
      return { ok: false, error: 'Nested quantifiers like (a+)+ are not allowed' }
    }
    if (BACK_REFERENCE.test(pattern)) {
      return { ok: false, error: 'Back-references are not allowed' }
    }
    const unsafe = unsafeRegexReason(pattern)
    if (unsafe) return { ok: false, error: unsafe }
    try {
      new RegExp(pattern, 'i')
    } catch (error) {
      return { ok: false, error: `Invalid regular expression: ${error instanceof Error ? error.message : 'syntax error'}` }
    }
  }

  return { ok: true, pattern }
}

export interface CompiledRule<R extends CategoryRuleLike = CategoryRuleLike> {
  rule: R
  matches(subject: RuleSubject): boolean
}

function compileOne<R extends CategoryRuleLike>(rule: R): CompiledRule<R> | null {
  const validation = validateRulePattern(rule.matchType, rule.pattern)
  if (!validation.ok) return null

  const needle = normaliseText(validation.pattern)

  switch (rule.matchType as RuleMatchType) {
    case 'contains':
      return {
        rule,
        matches: s =>
          normaliseText(s.description.slice(0, MAX_SUBJECT_LENGTH)).includes(needle) ||
          normaliseText(s.merchant).includes(needle),
      }
    case 'merchant':
      return { rule, matches: s => Boolean(s.merchant) && normaliseText(s.merchant) === needle }
    case 'regex': {
      const regex = new RegExp(validation.pattern, 'i')
      return { rule, matches: s => regex.test(s.description.slice(0, MAX_SUBJECT_LENGTH)) }
    }
  }
}

const timeOf = (value: CategoryRuleLike['createdAt']) => (value ? new Date(value).getTime() || 0 : 0)

/**
 * Validate and order rules for matching: highest priority first, then the newest rule.
 * Invalid rules (e.g. a regex that was saved before validation existed) are skipped and
 * reported through `onInvalid`, never thrown.
 */
export function compileRules<R extends CategoryRuleLike>(
  rules: R[],
  onInvalid: (rule: R) => void = rule => console.warn(`Skipping invalid category rule ${rule.id}`)
): CompiledRule<R>[] {
  const compiled: CompiledRule<R>[] = []
  for (const rule of rules) {
    const c = compileOne(rule)
    if (c) compiled.push(c)
    else onInvalid(rule)
  }
  return compiled.sort(
    (a, b) => b.rule.priority - a.rule.priority || timeOf(b.rule.createdAt) - timeOf(a.rule.createdAt)
  )
}

/** First rule (in priority order) that matches, or null. */
export function findMatchingRule<R extends CategoryRuleLike>(
  compiled: CompiledRule<R>[],
  subject: RuleSubject
): R | null {
  for (const c of compiled) {
    if (c.matches(subject)) return c.rule
  }
  return null
}
