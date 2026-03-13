import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { accounts } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

// Get all accounts for mobile
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, userId))
      .orderBy(desc(accounts.createdAt))

    const formatted = userAccounts.map(a => ({
      id: a.id,
      name: a.name,
      institution: a.institution,
      accountType: a.accountType,
      balance: parseFloat(a.balance),
      currency: a.currency,
      isActive: a.isActive,
      metadata: a.metadata
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error('[Mobile Accounts Error]:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch accounts' 
    }, { status: 500 })
  }
}
