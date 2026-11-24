import { describe, expect, test, vi } from 'vitest'
import {
  MAX_PATTERN_LENGTH,
  compileRules,
  createCategoriser,
  findMatchingRule,
  keywordCategory,
  validateRulePattern,
  type CategoryRuleLike,
} from '@/lib/categorise'
import { suggestCategoriesWithAI } from '@/lib/categorise/ai-suggest'

const rule = (overrides: Partial<CategoryRuleLike> & Pick<CategoryRuleLike, 'id'>): CategoryRuleLike => ({
  matchType: 'contains',
  pattern: 'x',
  categoryId: 'cat_x',
  priority: 0,
  createdAt: new Date('2026-01-01'),
  ...overrides,
})

const categories = {
  defaultCategoryId: 'cat_general',
  byName: new Map([
    ['groceries', 'cat_groceries'],
    ['dining out', 'cat_dining'],
    ['coffee', 'cat_coffee'],
    ['general', 'cat_general'],
    ['subscriptions', 'cat_subs'],
  ]),
}

describe('rule matching', () => {
  test('contains matches description or merchant, case- and whitespace-insensitive', () => {
    const [c] = compileRules([rule({ id: 'r1', pattern: 'Woolworths  EPPING' })])
    expect(c.matches({ description: 'EFTPOS WOOLWORTHS epping 1234' })).toBe(true)
    expect(c.matches({ description: 'card 1234', merchant: 'woolworths epping' })).toBe(true)
    expect(c.matches({ description: 'Coles' })).toBe(false)
  })

  test('merchant matches the whole merchant name only', () => {
    const [c] = compileRules([rule({ id: 'r1', matchType: 'merchant', pattern: 'Netflix' })])
    expect(c.matches({ description: 'NETFLIX.COM 123', merchant: 'NETFLIX' })).toBe(true)
    expect(c.matches({ description: 'netflix', merchant: 'Netflix Gift Card' })).toBe(false)
    expect(c.matches({ description: 'netflix' })).toBe(false)
  })

  test('regex matches the description, case-insensitively', () => {
    const [c] = compileRules([rule({ id: 'r1', matchType: 'regex', pattern: '^uber\\s*\\*?\\s*eats' })])
    expect(c.matches({ description: 'UBER *EATS SYDNEY' })).toBe(true)
    expect(c.matches({ description: 'UBER TRIP' })).toBe(false)
  })

  test('higher priority wins; on a tie the newest rule wins', () => {
    const rules = [
      rule({ id: 'low', pattern: 'cafe', categoryId: 'cat_dining', priority: 0 }),
      rule({ id: 'high', pattern: 'cafe', categoryId: 'cat_coffee', priority: 10 }),
      rule({ id: 'tie_old', pattern: 'shop', priority: 5, createdAt: new Date('2025-01-01') }),
      rule({ id: 'tie_new', pattern: 'shop', priority: 5, createdAt: new Date('2026-06-01') }),
    ]
    const compiled = compileRules(rules)
    expect(findMatchingRule(compiled, { description: 'The Cafe' })?.id).toBe('high')
    expect(findMatchingRule(compiled, { description: 'corner shop' })?.id).toBe('tie_new')
    expect(findMatchingRule(compiled, { description: 'nothing' })).toBeNull()
  })
})

describe('pattern validation', () => {
  test('accepts a valid regex and trims the pattern', () => {
    expect(validateRulePattern('regex', '  ^coles\\b ')).toEqual({ ok: true, pattern: '^coles\\b' })
  })

  test.each([
    ['contains', '', 'empty'],
    ['contains', '   ', 'empty'],
    ['regex', '(unclosed', 'Invalid regular expression'],
    ['regex', '[a-', 'Invalid regular expression'],
    ['regex', '(a+)+$', 'Nested quantifiers'],
    ['regex', '(\\w*)*x', 'Nested quantifiers'],
    ['regex', '(?:ab{2})+', 'Nested quantifiers'],
    ['regex', '(a)\\1', 'Back-references'],
    ['bogus', 'x', 'Unknown match type'],
  ])('%s %j is rejected (%s)', (matchType, pattern, message) => {
    const result = validateRulePattern(matchType, pattern)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.toLowerCase()).toContain(message.toLowerCase())
  })

  test('caps pattern length', () => {
    expect(validateRulePattern('contains', 'a'.repeat(MAX_PATTERN_LENGTH)).ok).toBe(true)
    expect(validateRulePattern('contains', 'a'.repeat(MAX_PATTERN_LENGTH + 1)).ok).toBe(false)
  })

  test('invalid stored rules are skipped, not thrown, and reported', () => {
    const onInvalid = vi.fn()
    const compiled = compileRules(
      [
        rule({ id: 'bad', matchType: 'regex', pattern: '(oops' }),
        rule({ id: 'evil', matchType: 'regex', pattern: '(a+)+' }),
        rule({ id: 'good', pattern: 'coles' }),
      ],
      onInvalid
    )
    expect(compiled.map(c => c.rule.id)).toEqual(['good'])
    expect(onInvalid.mock.calls.map(([r]) => r.id)).toEqual(['bad', 'evil'])
  })

  test('regex only sees a bounded slice of very long descriptions', () => {
    const [c] = compileRules([rule({ id: 'r', matchType: 'regex', pattern: 'needle$' })])
    expect(c.matches({ description: 'x'.repeat(10_000) + 'needle' })).toBe(false)
  })
})

describe('categoriser order', () => {
  test('1. a user rule beats the parser suggestion and the keyword fallback', () => {
    const categoriser = createCategoriser([rule({ id: 'r1', pattern: 'woolworths', categoryId: 'cat_coffee' })], categories)
    expect(categoriser.categorise({ description: 'WOOLWORTHS 123', amount: -5, category: 'Groceries' })).toEqual({
      categoryId: 'cat_coffee',
      source: 'rule',
      confident: true,
      ruleId: 'r1',
    })
  })

  test('2. without a rule, the parser category is used when it is one of the user categories', () => {
    const categoriser = createCategoriser([], categories)
    expect(categoriser.categorise({ description: 'Weekly shop', amount: -80, category: 'Groceries' })).toMatchObject({
      categoryId: 'cat_groceries',
      source: 'parser',
      confident: true,
    })
  })

  test('3. then the keyword fallback (a generic parser category does not count)', () => {
    const categoriser = createCategoriser([], categories)
    expect(categoriser.categorise({ description: 'COLES 0123 EPPING', amount: -30, category: 'General' })).toMatchObject({
      categoryId: 'cat_groceries',
      source: 'keyword',
      confident: true,
    })
  })

  test('4. nothing matched: default category, not confident (flag for review)', () => {
    const categoriser = createCategoriser([], categories)
    expect(categoriser.categorise({ description: 'Mystery 42', amount: -10, category: 'Nonexistent' })).toEqual({
      categoryId: 'cat_general',
      source: 'default',
      confident: false,
    })
  })

  test('rules pointing at a category the user no longer has are ignored', () => {
    const categoriser = createCategoriser([rule({ id: 'r1', pattern: 'mystery', categoryId: 'cat_deleted' })], categories)
    expect(categoriser.categorise({ description: 'Mystery', amount: -1 }).source).toBe('default')
  })
})

describe('keyword fallback', () => {
  test('keeps the credit card rules from the retired PDF categoriser', () => {
    expect(keywordCategory('BPAY Payment Received--Thank You', null, 4160)).toBe('Payment')
    expect(keywordCategory('Interest charges', null, -12.5)).toBe('Fees & Services')
    expect(keywordCategory('Late fee', null, -15)).toBe('Fees & Services')
    // "coffee" is not a fee
    expect(keywordCategory('Coffee shop', null, -5)).toBe('Dining Out')
  })

  test('otherwise uses the CSV keyword list', () => {
    expect(keywordCategory('WOOLWORTHS EPPING', null, -54.15)).toBe('Groceries')
  })
})

describe('AI category suggestion', () => {
  const items = [
    { key: 0, description: 'ACME PTY LTD', amount: -20 },
    { key: 3, description: 'Somewhere', amount: -5 },
  ]

  test('is skipped without a Gemini key', async () => {
    const generate = vi.fn()
    const result = await suggestCategoriesWithAI(items, ['groceries'], null, generate)
    expect(result.size).toBe(0)
    expect(generate).not.toHaveBeenCalled()
  })

  test('keeps only allowed category names and known keys', async () => {
    const generate = vi.fn().mockResolvedValue([
      { key: 0, category: 'GROCERIES' },
      { key: 3, category: 'Made Up' },
      { key: 99, category: 'groceries' },
    ])
    const result = await suggestCategoriesWithAI(items, ['groceries', 'coffee'], { apiKey: 'k', model: 'm' }, generate)
    expect([...result]).toEqual([[0, 'groceries']])
    expect(generate).toHaveBeenCalledOnce()
  })
})

describe('regex rule ReDoS guard (structural)', () => {
  test.each(['((a+))+$', '(a|a)+$', '(a|aa)*$', '(a+)+$', '.*.*.*.*x', '(a|b){2,}'])('rejects %s', pattern => {
    expect(validateRulePattern('regex', pattern).ok).toBe(false)
  })

  test.each(['woolworths\\s+\\d+', '^(coles|aldi) ', '[+*]{2}', 'a\\*b\\*c\\*d\\*e', '.*uber.*eats'])('accepts %s', pattern => {
    expect(validateRulePattern('regex', pattern).ok).toBe(true)
  })

  test('does not hang on a pattern the old check let through', () => {
    const start = Date.now()
    const result = validateRulePattern('regex', '(a|a)+$')
    expect(result.ok).toBe(false)
    expect(Date.now() - start).toBeLessThan(100)
  })
})
