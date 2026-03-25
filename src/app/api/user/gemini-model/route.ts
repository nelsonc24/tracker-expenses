import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

const ALLOWED_MODELS = [
  // Gemini 2.5 (stable)
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  // Gemini 3 (preview)
  'gemini-3.1-pro-preview',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite-preview',
]

/**
 * GET /api/user/gemini-model
 * Returns { model: string }
 */
export async function GET() {
  const user = await currentUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const [row] = await db
    .select({ preferences: users.preferences })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  const model = (row?.preferences as Record<string, string> | null)?.geminiModel ?? 'gemini-2.5-flash'
  return Response.json({ model })
}

/**
 * POST /api/user/gemini-model
 * Body: { model: string }
 */
export async function POST(req: Request) {
  const user = await currentUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  let body: { model?: unknown }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { model } = body
  if (!model || typeof model !== 'string' || !ALLOWED_MODELS.includes(model)) {
    return Response.json({ error: 'Invalid model' }, { status: 400 })
  }

  const [row] = await db
    .select({ preferences: users.preferences })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  const currentPrefs = (row?.preferences as Record<string, unknown>) ?? {}

  await db
    .update(users)
    .set({ preferences: { ...currentPrefs, geminiModel: model } as typeof users.$inferInsert.preferences, updatedAt: new Date() })
    .where(eq(users.id, user.id))

  return Response.json({ success: true, model })
}
