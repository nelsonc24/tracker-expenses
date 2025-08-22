import { NextRequest, NextResponse } from 'next/server'
import { applyTemplateSchema } from '@/lib/validations/templates'

// This would typically fetch from the templates API
const getTemplate = async (templateId: string) => {
  // In a real app, this would be a database call
  const templatesResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/templates`)
  const { templates } = await templatesResponse.json()
  return templates.find((t: any) => t.id === templateId)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { templateId, overrides } = applyTemplateSchema.parse(body)

    // Fetch the template
    const template = await getTemplate(templateId)
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Create transaction from template with overrides
    const newTransaction = {
      id: Date.now().toString(),
      date: overrides?.date || new Date().toISOString().split('T')[0],
      description: overrides?.description || template.description || `${template.name} - Transaction`,
      amount: overrides?.amount || template.amount,
      category: template.category,
      account: template.account,
      merchant: template.merchant || '',
      reference: template.reference || '',
      notes: overrides?.notes || template.notes || '',
      tags: template.tags,
      balance: 0, // This would be calculated based on account balance
      templateId: template.id, // Track which template was used
    }

    // In a real app, you would save this transaction to the database
    console.log('Creating transaction from template:', newTransaction)

    return NextResponse.json({
      transaction: newTransaction,
      message: `Transaction created from template "${template.name}"`
    }, { status: 201 })

  } catch (error) {
    console.error('Error applying template:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid template application data', details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to apply template' },
      { status: 500 }
    )
  }
}
