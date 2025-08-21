import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { getUserAccounts, createAccount } from '@/lib/db-utils'

export async function GET() {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accounts = await getUserAccounts(user.id)

    return NextResponse.json(accounts)
  } catch (error) {
    console.error('Error fetching accounts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, institution, accountType, accountNumber, bsb, balance, metadata } = body

    const account = await createAccount({
      userId: user.id,
      name,
      institution,
      accountType,
      accountNumber,
      bsb,
      balance: balance?.toString() || '0',
      metadata
    })

    if (!account) {
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
    }

    return NextResponse.json(account)
  } catch (error) {
    console.error('Error creating account:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
