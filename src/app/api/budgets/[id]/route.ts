import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { updateBudget, deleteBudget } from '@/lib/db-utils'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
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
      accountIds,
      isActive 
    } = body

    // Validate required fields if provided
    if (amount !== undefined && amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be positive' }, 
        { status: 400 }
      )
    }

    const updatedBudget = await updateBudget(resolvedParams.id, user.id, {
      name,
      description,
      amount: amount ? amount.toString() : undefined,
      period,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      categoryIds,
      accountIds,
      isActive
    })

    if (!updatedBudget) {
      return NextResponse.json(
        { error: 'Budget not found or failed to update' }, 
        { status: 404 }
      )
    }

    return NextResponse.json(updatedBudget)
  } catch (error) {
    console.error('Error updating budget:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const success = await deleteBudget(resolvedParams.id, user.id)

    if (!success) {
      return NextResponse.json(
        { error: 'Budget not found or failed to delete' }, 
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'Budget deleted successfully' })
  } catch (error) {
    console.error('Error deleting budget:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}