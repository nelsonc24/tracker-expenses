import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { accounts, importSenders } from '@/db/schema'
import { MAX_FILENAME_PATTERN_LENGTH, normalizeSenderEmail } from '@/lib/inbound-email/senders'

const createSenderSchema = z.object({
  senderEmail: z.string().max(254),
  accountId: z.string().uuid('Choose an account'),
  filenamePattern: z
    .string()
    .trim()
    .max(MAX_FILENAME_PATTERN_LENGTH)
    .regex(/^[^\r\n]*$/, 'Pattern must be a single line')
    .optional()
    .nullable(),
})

// GET /api/import-senders — approved senders, the user's accounts (for the picker) and the inbound address
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [senders, userAccounts] = await Promise.all([
      db
        .select({
          id: importSenders.id,
          senderEmail: importSenders.senderEmail,
          accountId: importSenders.accountId,
          accountName: accounts.name,
          filenamePattern: importSenders.filenamePattern,
          createdAt: importSenders.createdAt,
        })
        .from(importSenders)
        .innerJoin(accounts, eq(accounts.id, importSenders.accountId))
        .where(eq(importSenders.userId, userId))
        .orderBy(asc(importSenders.createdAt)),
      db
        .select({ id: accounts.id, name: accounts.name, institution: accounts.institution })
        .from(accounts)
        .where(and(eq(accounts.userId, userId), eq(accounts.isActive, true)))
        .orderBy(asc(accounts.name)),
    ])

    return NextResponse.json({
      senders,
      accounts: userAccounts,
      inboundAddress: process.env.INBOUND_EMAIL_ADDRESS || null,
    })
  } catch (error) {
    console.error('Error fetching import senders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/import-senders — approve a sender for an account
export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let data: z.infer<typeof createSenderSchema>
  try {
    data = createSenderSchema.parse(await request.json())
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : 'Invalid request body'
    return NextResponse.json({ error: message ?? 'Invalid request body' }, { status: 400 })
  }

  const senderEmail = normalizeSenderEmail(data.senderEmail)
  if (!senderEmail) return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
  const filenamePattern = data.filenamePattern ? data.filenamePattern : null

  try {
    const [account] = await db
      .select({ id: accounts.id, name: accounts.name })
      .from(accounts)
      .where(and(eq(accounts.id, data.accountId), eq(accounts.userId, userId)))
      .limit(1)
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

    const [duplicate] = await db
      .select({ id: importSenders.id })
      .from(importSenders)
      .where(
        and(
          eq(importSenders.userId, userId),
          eq(importSenders.senderEmail, senderEmail),
          filenamePattern === null ? isNull(importSenders.filenamePattern) : eq(importSenders.filenamePattern, filenamePattern)
        )
      )
      .limit(1)
    if (duplicate) {
      return NextResponse.json({ error: 'This sender and filename pattern are already approved' }, { status: 409 })
    }

    const [row] = await db
      .insert(importSenders)
      .values({ userId, senderEmail, accountId: account.id, filenamePattern })
      .returning()

    return NextResponse.json({ ...row, accountName: account.name }, { status: 201 })
  } catch (error) {
    console.error('Error creating import sender:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
