import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { countActiveTokens, insertToken, listActiveTokens } from '@/lib/api-tokens/store'
import { MAX_ACTIVE_TOKENS_PER_USER, MAX_TOKEN_NAME_LENGTH, generateApiToken } from '@/lib/api-tokens/tokens'

// Token management is Clerk-only on purpose: an API token must not be able to mint more tokens.

const createSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(MAX_TOKEN_NAME_LENGTH),
})

// GET /api/api-tokens — list active tokens (never returns secrets or hashes)
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tokens = await listActiveTokens(userId)
    return NextResponse.json({ tokens })
  } catch (error) {
    console.error('Failed to list api tokens:', error)
    return NextResponse.json({ error: 'Failed to list tokens' }, { status: 500 })
  }
}

// POST /api/api-tokens — create a token; the plaintext is returned once, in this response only
export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  try {
    if ((await countActiveTokens(userId)) >= MAX_ACTIVE_TOKENS_PER_USER) {
      return NextResponse.json(
        { error: `You can have at most ${MAX_ACTIVE_TOKENS_PER_USER} active tokens. Revoke one first.` },
        { status: 400 }
      )
    }

    const { token, hash } = generateApiToken()
    const created = await insertToken(userId, parsed.data.name, hash)

    return NextResponse.json({ token: created, secret: token }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Failed to create api token:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Failed to create token' }, { status: 500 })
  }
}
