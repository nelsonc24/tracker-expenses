/**
 * Optional, batched Gemini suggestion for rows nothing else could categorise.
 *
 * Runs only with the user's own Gemini key (same pattern as the PDF fallback); without a key
 * it does nothing. Suggestions are restricted to the user's existing category names, and rows
 * that receive one are still flagged for review by the caller.
 */
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { z } from 'zod'
import type { GeminiConfig } from '@/lib/ingest/ai-pdf'

/** Most rows sent in one request; the rest stay uncategorised. */
export const MAX_AI_BATCH = 100
const MAX_DESCRIPTION_LENGTH = 120
const AI_TIMEOUT_MS = 20_000

export interface SuggestItem {
  /** Caller's own key for the row (e.g. its index in the import). */
  key: number
  description: string
  amount: number
}

export interface RawSuggestion {
  key: number
  category: string
}

export type GenerateSuggestions = (args: {
  config: GeminiConfig
  items: SuggestItem[]
  categoryNames: string[]
}) => Promise<RawSuggestion[]>

const suggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      key: z.number().int().describe('The key of the transaction, copied from the input'),
      category: z.string().describe('Exactly one of the allowed category names, or an empty string if none fits'),
    })
  ),
})

const generateWithGemini: GenerateSuggestions = async ({ config, items, categoryNames }) => {
  const google = createGoogleGenerativeAI({ apiKey: config.apiKey })
  const lines = items.map(i => `${i.key}\t${i.amount < 0 ? 'out' : 'in'}\t${i.description}`).join('\n')
  const { object } = await generateObject({
    model: google(config.model),
    schema: suggestionSchema,
    abortSignal: AbortSignal.timeout(AI_TIMEOUT_MS),
    prompt: [
      'Categorise these Australian bank transactions.',
      `Allowed categories: ${categoryNames.map(n => JSON.stringify(n)).join(', ')}.`,
      'Use only an allowed category name. If none fits, return an empty string for that row.',
      'Rows are tab-separated: key, direction (in/out), description.',
      lines,
    ].join('\n'),
  })
  return object.suggestions
}

/**
 * Suggest a category name for each item. Returns `key -> category name` (one of `categoryNames`,
 * original casing). Returns an empty map when there is no key, nothing to do, or the model
 * answered with something unusable. Errors from the model call are thrown to the caller.
 */
export async function suggestCategoriesWithAI(
  items: SuggestItem[],
  categoryNames: string[],
  config: GeminiConfig | null,
  generate: GenerateSuggestions = generateWithGemini
): Promise<Map<number, string>> {
  const result = new Map<number, string>()
  if (!config || items.length === 0 || categoryNames.length === 0) return result

  const batch = items.slice(0, MAX_AI_BATCH).map(i => ({
    ...i,
    description: i.description.slice(0, MAX_DESCRIPTION_LENGTH),
  }))
  const allowed = new Map(categoryNames.map(n => [n.trim().toLowerCase(), n]))
  const keys = new Set(batch.map(i => i.key))

  const suggestions = await generate({ config, items: batch, categoryNames })
  for (const s of suggestions ?? []) {
    const name = allowed.get((s.category ?? '').trim().toLowerCase())
    if (name && keys.has(s.key) && !result.has(s.key)) result.set(s.key, name)
  }
  return result
}
