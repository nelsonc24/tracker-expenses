import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { categories } from '@/db/schema'
import { eq } from 'drizzle-orm'

// Get all categories for mobile
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.userId, userId))

    const formatted = userCategories.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      color: c.color,
      icon: c.icon,
      parentId: c.parentId,
      isDefault: c.isDefault
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error('[Mobile Categories Error]:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch categories' 
    }, { status: 500 })
  }
}
