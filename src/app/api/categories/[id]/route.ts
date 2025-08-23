import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { updateCategory, deleteCategory, getCategoryById } from '@/lib/db-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const category = await getCategoryById(params.id)
    
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Check if user owns this category (or it's a system category)
    if (category.userId && category.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error fetching category:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if category exists and user owns it
    const existingCategory = await getCategoryById(params.id)
    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    if (existingCategory.userId && existingCategory.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Don't allow editing system categories
    if (existingCategory.isDefault) {
      return NextResponse.json({ error: 'Cannot edit system categories' }, { status: 400 })
    }

    const body = await request.json()
    const { name, color, icon, customIconUrl, parentId } = body

    // Validate that parent category exists and belongs to user
    if (parentId) {
      const parentCategory = await getCategoryById(parentId)
      if (!parentCategory || (parentCategory.userId && parentCategory.userId !== user.id)) {
        return NextResponse.json({ error: 'Invalid parent category' }, { status: 400 })
      }
      
      // Prevent circular references
      if (parentId === params.id) {
        return NextResponse.json({ error: 'Category cannot be its own parent' }, { status: 400 })
      }
    }

    const updatedCategory = await updateCategory(params.id, {
      name,
      color,
      icon,
      customIconUrl,
      parentId: parentId || null
    })

    if (!updatedCategory) {
      return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
    }

    return NextResponse.json(updatedCategory)
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if category exists and user owns it
    const existingCategory = await getCategoryById(params.id)
    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    if (existingCategory.userId && existingCategory.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Don't allow deleting system categories
    if (existingCategory.isDefault) {
      return NextResponse.json({ error: 'Cannot delete system categories' }, { status: 400 })
    }

    const success = await deleteCategory(params.id)
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
