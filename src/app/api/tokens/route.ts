import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { apiTokens } from '@/db/schema'
import { generateApiToken } from '@/lib/api-tokens'

const createSchema = z.object({ name: z.string().trim().min(1).max(60) })

// List the user's tokens (never the token values).
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db
    .select({
      id: apiTokens.id,
      name: apiTokens.name,
      tokenPrefix: apiTokens.tokenPrefix,
      lastUsedAt: apiTokens.lastUsedAt,
      createdAt: apiTokens.createdAt,
      revokedAt: apiTokens.revokedAt,
    })
    .from(apiTokens)
    .where(eq(apiTokens.userId, userId))
    .orderBy(desc(apiTokens.createdAt))

  return NextResponse.json({ tokens: rows })
}

// Create a token. The plain value is returned once and never stored.
export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'A token name (1-60 characters) is required' }, { status: 400 })
  }

  const { token, tokenHash, tokenPrefix } = generateApiToken()
  const [row] = await db
    .insert(apiTokens)
    .values({ userId, name: parsed.data.name, tokenHash, tokenPrefix })
    .returning({ id: apiTokens.id, name: apiTokens.name, createdAt: apiTokens.createdAt })

  return NextResponse.json({ token, ...row, tokenPrefix }, { status: 201 })
}
