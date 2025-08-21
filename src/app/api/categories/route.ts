import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { getUserCategories, createCategory, createDefaultCategories } from '@/lib/db-utils'

export async function GET() {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let categories = await getUserCategories(user.id)

    // If user has no categories, create default ones
    if (categories.length === 0) {
      categories = await createDefaultCategories(user.id)
    }

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
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
    const { name, description, color, icon, parentId } = body

    const category = await createCategory({
      userId: user.id,
      name,
      description,
      color,
      icon,
      parentId
    })

    if (!category) {
      return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
    }

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
