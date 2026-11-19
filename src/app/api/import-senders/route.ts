import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { accounts, importSenders } from '@/db/schema'

const createSchema = z.object({ senderEmail: z.string().trim().toLowerCase().email(), accountId: z.string().uuid() })

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rows = await db
    .select({
      id: importSenders.id,
      senderEmail: importSenders.senderEmail,
      accountId: importSenders.accountId,
      accountName: accounts.name,
    })
    .from(importSenders)
    .innerJoin(accounts, eq(accounts.id, importSenders.accountId))
    .where(eq(importSenders.userId, userId))
  return NextResponse.json({ senders: rows })
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'A valid sender email and account are required' }, { status: 400 })

  const owned = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, parsed.data.accountId), eq(accounts.userId, userId)))
    .limit(1)
  if (owned.length === 0) return NextResponse.json({ error: 'Account not found' }, { status: 403 })

  const inserted = await db
    .insert(importSenders)
    .values({ userId, ...parsed.data })
    .onConflictDoNothing()
    .returning({ id: importSenders.id })
  if (inserted.length === 0) return NextResponse.json({ error: 'That sender is already in use' }, { status: 409 })
  return NextResponse.json({ id: inserted[0].id }, { status: 201 })
}
