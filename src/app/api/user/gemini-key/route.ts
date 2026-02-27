import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { encrypt, decrypt, maskApiKey } from '@/lib/encryption'

/**
 * GET /api/user/gemini-key
 * Returns { hasKey: boolean, maskedKey: string | null }
 * Never returns the actual key — only the masked version.
 */
export async function GET() {
  const user = await currentUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const [row] = await db
    .select({ geminiApiKey: users.geminiApiKey })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  if (!row?.geminiApiKey) {
    return Response.json({ hasKey: false, maskedKey: null })
  }

  try {
    const decrypted = decrypt(row.geminiApiKey)
    return Response.json({ hasKey: true, maskedKey: maskApiKey(decrypted) })
  } catch {
    // Decryption failed (e.g. key rotation) — treat as no key
    return Response.json({ hasKey: false, maskedKey: null })
  }
}

/**
 * POST /api/user/gemini-key
 * Body: { apiKey: string }
 * Encrypts and stores the key. Returns { success: true, maskedKey: string }.
 */
export async function POST(req: Request) {
  const user = await currentUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  let body: { apiKey?: unknown }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { apiKey } = body
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
    return Response.json({ error: 'Invalid API key' }, { status: 400 })
  }

  const trimmed = apiKey.trim()
  const encrypted = encrypt(trimmed)

  await db
    .update(users)
    .set({ geminiApiKey: encrypted, updatedAt: new Date() })
    .where(eq(users.id, user.id))

  return Response.json({ success: true, maskedKey: maskApiKey(trimmed) })
}

/**
 * DELETE /api/user/gemini-key
 * Removes the stored encrypted key.
 */
export async function DELETE() {
  const user = await currentUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  await db
    .update(users)
    .set({ geminiApiKey: null, updatedAt: new Date() })
    .where(eq(users.id, user.id))

  return Response.json({ success: true })
}
