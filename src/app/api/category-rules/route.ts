import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { and, count, desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { categories, categoryRules } from '@/db/schema'
import { MAX_PATTERN_LENGTH, RULE_MATCH_TYPES, RULE_ORIGINS, validateRulePattern } from '@/lib/categorise/rules'

/** Upper bound on rules per user; every import evaluates all of them. */
const MAX_RULES_PER_USER = 500

const createRuleSchema = z.object({
  matchType: z.enum(RULE_MATCH_TYPES),
  // Validated properly by validateRulePattern; this just bounds the payload
  pattern: z.string().max(MAX_PATTERN_LENGTH * 2),
  categoryId: z.string().uuid(),
  priority: z.number().int().min(-1000).max(1000).optional(),
  createdFrom: z.enum(RULE_ORIGINS).optional(),
})

// GET /api/category-rules - the user's rules with their category names
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rules = await db
      .select({
        id: categoryRules.id,
        matchType: categoryRules.matchType,
        pattern: categoryRules.pattern,
        categoryId: categoryRules.categoryId,
        categoryName: categories.name,
        priority: categoryRules.priority,
        createdFrom: categoryRules.createdFrom,
        createdAt: categoryRules.createdAt,
      })
      .from(categoryRules)
      .innerJoin(categories, eq(categories.id, categoryRules.categoryId))
      .where(eq(categoryRules.userId, userId))
      .orderBy(desc(categoryRules.priority), desc(categoryRules.createdAt))

    return NextResponse.json({ rules })
  } catch (error) {
    console.error('Error fetching category rules:', error)
    return NextResponse.json({ error: 'Failed to fetch category rules' }, { status: 500 })
  }
}

// POST /api/category-rules - create a rule ("Always categorise X as Y").
// If the same match type + pattern already exists, its category is updated instead.
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parsed = createRuleSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.issues }, { status: 400 })
    }
    const { matchType, categoryId, priority = 0, createdFrom = 'manual' } = parsed.data

    const validation = validateRulePattern(matchType, parsed.data.pattern)
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 })
    const pattern = validation.pattern

    const [category] = await db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
      .limit(1)
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

    const [existing] = await db
      .select({ id: categoryRules.id })
      .from(categoryRules)
      .where(
        and(
          eq(categoryRules.userId, userId),
          eq(categoryRules.matchType, matchType),
          eq(sql`lower(${categoryRules.pattern})`, pattern.toLowerCase())
        )
      )
      .limit(1)

    if (existing) {
      const [updated] = await db
        .update(categoryRules)
        .set({ categoryId, priority })
        .where(and(eq(categoryRules.id, existing.id), eq(categoryRules.userId, userId)))
        .returning()
      return NextResponse.json({ rule: { ...updated, categoryName: category.name }, updated: true })
    }

    const [{ total }] = await db.select({ total: count() }).from(categoryRules).where(eq(categoryRules.userId, userId))
    if (total >= MAX_RULES_PER_USER) {
      return NextResponse.json({ error: `You can have at most ${MAX_RULES_PER_USER} rules` }, { status: 400 })
    }

    const [rule] = await db
      .insert(categoryRules)
      .values({ userId, matchType, pattern, categoryId, priority, createdFrom })
      .returning()

    return NextResponse.json({ rule: { ...rule, categoryName: category.name }, updated: false }, { status: 201 })
  } catch (error) {
    console.error('Error creating category rule:', error)
    return NextResponse.json({ error: 'Failed to create category rule' }, { status: 500 })
  }
}
