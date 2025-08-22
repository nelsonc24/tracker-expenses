import { z } from 'zod'

export const transactionTemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  amount: z.number(),
  category: z.string(),
  account: z.string(),
  merchant: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isRecurring: z.boolean().default(false),
  recurringInterval: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const createTransactionTemplateSchema = transactionTemplateSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export const updateTransactionTemplateSchema = createTransactionTemplateSchema.partial()

export type TransactionTemplate = z.infer<typeof transactionTemplateSchema>
export type CreateTransactionTemplate = z.infer<typeof createTransactionTemplateSchema>
export type UpdateTransactionTemplate = z.infer<typeof updateTransactionTemplateSchema>

// Apply template to create a new transaction
export const applyTemplateSchema = z.object({
  templateId: z.string(),
  overrides: z.object({
    date: z.string().optional(),
    amount: z.number().optional(),
    description: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
})
