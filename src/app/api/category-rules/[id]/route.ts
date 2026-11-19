import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { categoryRules } from '@/db/schema'

// DELETE /api/category-rules/:id - delete one of the user's rules
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    const deleted = await db
      .delete(categoryRules)
      .where(and(eq(categoryRules.id, id), eq(categoryRules.userId, userId)))
      .returning({ id: categoryRules.id })

    if (deleted.length === 0) return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting category rule:', error)
    return NextResponse.json({ error: 'Failed to delete category rule' }, { status: 500 })
  }
}
