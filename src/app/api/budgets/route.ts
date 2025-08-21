import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { getUserBudgets, createBudget } from '@/lib/db-utils'

export async function GET() {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const budgets = await getUserBudgets(user.id)

    return NextResponse.json(budgets)
  } catch (error) {
    console.error('Error fetching budgets:', error)
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
    const { 
      name, 
      description, 
      amount, 
      period, 
      startDate, 
      endDate, 
      categoryIds, 
      accountIds 
    } = body

    const budget = await createBudget({
      userId: user.id,
      name,
      description,
      amount: amount.toString(),
      period,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      categoryIds,
      accountIds
    })

    if (!budget) {
      return NextResponse.json({ error: 'Failed to create budget' }, { status: 500 })
    }

    return NextResponse.json(budget)
  } catch (error) {
    console.error('Error creating budget:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
