import { NextRequest, NextResponse } from 'next/server'
import { createTransactionTemplateSchema, updateTransactionTemplateSchema, TransactionTemplate } from '@/lib/validations/templates'

// Sample templates data (in a real app, this would be stored in a database)
const templates: TransactionTemplate[] = [
  {
    id: '1',
    name: 'Monthly Rent',
    description: 'Monthly apartment rent payment',
    amount: -1500,
    category: 'Housing',
    account: 'CBA Everyday',
    merchant: 'Real Estate Agency',
    reference: 'RENT-MONTHLY',
    notes: 'Monthly rent payment',
    tags: ['rent', 'housing', 'monthly'],
    isRecurring: true,
    recurringInterval: 'monthly' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Salary Deposit',
    description: 'Monthly salary deposit',
    amount: 5000,
    category: 'Income',
    account: 'CBA Everyday',
    merchant: 'My Company',
    reference: 'SAL-MONTHLY',
    notes: 'Monthly salary payment',
    tags: ['salary', 'income', 'monthly'],
    isRecurring: true,
    recurringInterval: 'monthly' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Grocery Shopping',
    description: 'Weekly grocery shopping',
    amount: -120,
    category: 'Groceries',
    account: 'CBA Everyday',
    merchant: 'Woolworths',
    reference: '',
    notes: 'Weekly grocery shopping',
    tags: ['groceries', 'essential', 'weekly'],
    isRecurring: true,
    recurringInterval: 'weekly' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export async function GET() {
  try {
    return NextResponse.json({ 
      templates,
      total: templates.length 
    })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createTransactionTemplateSchema.parse(body)

    const newTemplate: TransactionTemplate = {
      id: Date.now().toString(),
      ...validatedData,
      description: validatedData.description || '',
      merchant: validatedData.merchant || '',
      reference: validatedData.reference || '',
      notes: validatedData.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    templates.push(newTemplate)

    return NextResponse.json(newTemplate, { status: 201 })
  } catch (error) {
    console.error('Error creating template:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid template data', details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      )
    }

    const validatedData = updateTransactionTemplateSchema.parse(updateData)
    
    const templateIndex = templates.findIndex(t => t.id === id)
    if (templateIndex === -1) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    templates[templateIndex] = {
      ...templates[templateIndex],
      ...validatedData,
      updatedAt: new Date().toISOString(),
    }

    return NextResponse.json(templates[templateIndex])
  } catch (error) {
    console.error('Error updating template:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid template data', details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      )
    }

    const templateIndex = templates.findIndex(t => t.id === id)
    if (templateIndex === -1) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    const deletedTemplate = templates.splice(templateIndex, 1)[0]

    return NextResponse.json({ 
      message: 'Template deleted successfully',
      template: deletedTemplate 
    })
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    )
  }
}
