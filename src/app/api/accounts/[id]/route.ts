import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { getAccountById, updateAccount, deleteAccount } from '@/lib/db-utils'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const account = await getAccountById(params.id, user.id)

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    return NextResponse.json(account)
  } catch (error) {
    console.error('Error fetching account:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, institution, accountType, accountNumber, bsb, balance, isActive, metadata } = body

    // Validate required fields
    if (name && name.trim().length === 0) {
      return NextResponse.json({ error: 'Account name is required' }, { status: 400 })
    }

    if (institution && institution.trim().length === 0) {
      return NextResponse.json({ error: 'Institution is required' }, { status: 400 })
    }

    if (accountType && !['checking', 'savings', 'credit', 'investment'].includes(accountType)) {
      return NextResponse.json({ error: 'Invalid account type' }, { status: 400 })
    }

    const updateData: Record<string, any> = {}
    if (name !== undefined) updateData.name = name
    if (institution !== undefined) updateData.institution = institution
    if (accountType !== undefined) updateData.accountType = accountType
    if (accountNumber !== undefined) updateData.accountNumber = accountNumber
    if (bsb !== undefined) updateData.bsb = bsb
    if (balance !== undefined) updateData.balance = balance?.toString()
    if (isActive !== undefined) updateData.isActive = isActive
    if (metadata !== undefined) updateData.metadata = metadata

    const account = await updateAccount(params.id, user.id, updateData)

    if (!account) {
      return NextResponse.json({ error: 'Account not found or failed to update' }, { status: 404 })
    }

    return NextResponse.json(account)
  } catch (error) {
    console.error('Error updating account:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const success = await deleteAccount(params.id, user.id)

    if (!success) {
      return NextResponse.json({ error: 'Account not found or failed to delete' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Account deleted successfully' })
  } catch (error) {
    console.error('Error deleting account:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
