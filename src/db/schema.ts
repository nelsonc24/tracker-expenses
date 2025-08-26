import { pgTable, text, timestamp, decimal, integer, boolean, uuid, jsonb, index } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

// Users table (for Clerk integration)
export const users = pgTable('users', {
  id: text('id').primaryKey(), // Clerk user ID
  email: text('email').notNull().unique(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  preferences: jsonb('preferences').$type<{
    currency: string
    theme: 'light' | 'dark' | 'system'
    notifications: boolean
    timezone: string
  }>().default({
    currency: 'AUD',
    theme: 'system',
    notifications: true,
    timezone: 'Australia/Sydney'
  })
})

// Accounts table
export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  institution: text('institution').notNull(),
  accountType: text('account_type').notNull(), // 'checking', 'savings', 'credit'
  accountNumber: text('account_number'),
  bsb: text('bsb'),
  balance: decimal('balance', { precision: 15, scale: 2 }).default('0.00').notNull(),
  currency: text('currency').default('AUD').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  lastSynced: timestamp('last_synced'),
  connectionStatus: text('connection_status').default('disconnected').notNull(), // 'connected', 'disconnected', 'error'
  metadata: jsonb('metadata').$type<{
    color?: string
    icon?: string
    description?: string
    connectionDetails?: Record<string, string | number | boolean>
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('accounts_user_id_idx').on(table.userId),
  institutionIdx: index('accounts_institution_idx').on(table.institution),
}))

// Categories table
export const categories: any = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color').default('#6b7280').notNull(),
  icon: text('icon').default('folder').notNull(),
  customIconUrl: text('custom_icon_url'),
  parentId: uuid('parent_id').references(() => categories.id, { onDelete: 'set null' }),
  isDefault: boolean('is_default').default(false).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('categories_user_id_idx').on(table.userId),
  parentIdIdx: index('categories_parent_id_idx').on(table.parentId),
}))

// Budgets table
export const budgets = pgTable('budgets', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  currency: text('currency').default('AUD').notNull(),
  period: text('period').notNull(), // 'weekly', 'monthly', 'yearly'
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  categoryIds: jsonb('category_ids').$type<string[]>().default([]),
  accountIds: jsonb('account_ids').$type<string[]>().default([]),
  alertThreshold: decimal('alert_threshold', { precision: 5, scale: 2 }).default('80.00'), // percentage
  isActive: boolean('is_active').default(true).notNull(),
  metadata: jsonb('metadata').$type<{
    color?: string
    notifications?: boolean
    rollover?: boolean
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('budgets_user_id_idx').on(table.userId),
  periodIdx: index('budgets_period_idx').on(table.period),
  startDateIdx: index('budgets_start_date_idx').on(table.startDate),
}))

// Bills table
export const bills = pgTable('bills', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }).notNull(),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  description: text('description'),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  currency: text('currency').default('AUD').notNull(),
  frequency: text('frequency').notNull(), // 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'
  dueDay: integer('due_day'), // Day of month for monthly bills (1-31)
  dueDate: timestamp('due_date'), // Next due date
  lastPaidDate: timestamp('last_paid_date'),
  lastPaidAmount: decimal('last_paid_amount', { precision: 15, scale: 2 }),
  reminderDays: integer('reminder_days').default(3), // Days before due date to remind
  isActive: boolean('is_active').default(true).notNull(),
  isAutoPay: boolean('is_auto_pay').default(false).notNull(),
  notes: text('notes'),
  tags: jsonb('tags').$type<string[]>().default([]),
  metadata: jsonb('metadata').$type<{
    color?: string
    estimatedAmount?: number
    averageAmount?: number
    paymentMethod?: string
    website?: string
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('bills_user_id_idx').on(table.userId),
  accountIdIdx: index('bills_account_id_idx').on(table.accountId),
  dueDateIdx: index('bills_due_date_idx').on(table.dueDate),
  activeIdx: index('bills_active_idx').on(table.isActive),
  frequencyIdx: index('bills_frequency_idx').on(table.frequency),
}))

// Transactions table
export const transactions = pgTable('transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }).notNull(),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  currency: text('currency').default('AUD').notNull(),
  description: text('description').notNull(),
  merchant: text('merchant'),
  reference: text('reference'),
  receiptNumber: text('receipt_number'),
  transactionDate: timestamp('transaction_date').notNull(),
  postingDate: timestamp('posting_date'),
  balance: decimal('balance', { precision: 15, scale: 2 }),
  status: text('status').default('cleared').notNull(), // 'pending', 'cleared', 'cancelled'
  type: text('type').notNull(), // 'debit', 'credit', 'transfer'
  tags: jsonb('tags').$type<string[]>().default([]),
  notes: text('notes'),
  location: jsonb('location').$type<{
    latitude?: number
    longitude?: number
    address?: string
  }>(),
  originalData: jsonb('original_data').$type<Record<string, string | number | boolean | null>>(), // Raw import data
  duplicateCheckHash: text('duplicate_check_hash'), // For duplicate detection
  reconciled: boolean('reconciled').default(false).notNull(),
  isBill: boolean('is_bill').default(false).notNull(),
  billId: uuid('bill_id').references(() => bills.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('transactions_user_id_idx').on(table.userId),
  accountIdIdx: index('transactions_account_id_idx').on(table.accountId),
  categoryIdIdx: index('transactions_category_id_idx').on(table.categoryId),
  transactionDateIdx: index('transactions_transaction_date_idx').on(table.transactionDate),
  amountIdx: index('transactions_amount_idx').on(table.amount),
  merchantIdx: index('transactions_merchant_idx').on(table.merchant),
  statusIdx: index('transactions_status_idx').on(table.status),
  duplicateHashIdx: index('transactions_duplicate_hash_idx').on(table.duplicateCheckHash),
  isBillIdx: index('transactions_is_bill_idx').on(table.isBill),
  billIdIdx: index('transactions_bill_id_idx').on(table.billId),
}))

// Import sessions table (for CSV uploads)
export const importSessions = pgTable('import_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size').notNull(),
  fileType: text('file_type').notNull(),
  bankFormat: text('bank_format'),
  status: text('status').default('processing').notNull(), // 'processing', 'completed', 'failed'
  totalRows: integer('total_rows'),
  processedRows: integer('processed_rows').default(0),
  successfulRows: integer('successful_rows').default(0),
  failedRows: integer('failed_rows').default(0),
  errors: jsonb('errors').$type<Array<{
    row: number
    field?: string
    message: string
  }>>().default([]),
  metadata: jsonb('metadata').$type<{
    mapping?: Record<string, string>
    preview?: Record<string, string | number | boolean | null>[]
    duplicatesFound?: number
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('import_sessions_user_id_idx').on(table.userId),
  statusIdx: index('import_sessions_status_idx').on(table.status),
  createdAtIdx: index('import_sessions_created_at_idx').on(table.createdAt),
}))

// Recurring transactions table
export const recurringTransactions = pgTable('recurring_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }).notNull(),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  description: text('description').notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  currency: text('currency').default('AUD').notNull(),
  frequency: text('frequency').notNull(), // 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  nextDate: timestamp('next_date').notNull(),
  lastProcessed: timestamp('last_processed'),
  isActive: boolean('is_active').default(true).notNull(),
  autoProcess: boolean('auto_process').default(false).notNull(),
  tags: jsonb('tags').$type<string[]>().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('recurring_transactions_user_id_idx').on(table.userId),
  accountIdIdx: index('recurring_transactions_account_id_idx').on(table.accountId),
  nextDateIdx: index('recurring_transactions_next_date_idx').on(table.nextDate),
  activeIdx: index('recurring_transactions_active_idx').on(table.isActive),
}))

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users)
export const selectUserSchema = createSelectSchema(users)
export type InsertUser = z.infer<typeof insertUserSchema>
export type SelectUser = z.infer<typeof selectUserSchema>

export const insertAccountSchema = createInsertSchema(accounts)
export const selectAccountSchema = createSelectSchema(accounts)
export type InsertAccount = z.infer<typeof insertAccountSchema>
export type SelectAccount = z.infer<typeof selectAccountSchema>

export const insertCategorySchema = createInsertSchema(categories)
export const selectCategorySchema = createSelectSchema(categories)
export type InsertCategory = z.infer<typeof insertCategorySchema>
export type SelectCategory = z.infer<typeof selectCategorySchema>

export const insertBudgetSchema = createInsertSchema(budgets)
export const selectBudgetSchema = createSelectSchema(budgets)
export type InsertBudget = z.infer<typeof insertBudgetSchema>
export type SelectBudget = z.infer<typeof selectBudgetSchema>

export const insertTransactionSchema = createInsertSchema(transactions)
export const selectTransactionSchema = createSelectSchema(transactions)
export type InsertTransaction = z.infer<typeof insertTransactionSchema>
export type SelectTransaction = z.infer<typeof selectTransactionSchema>

export const insertImportSessionSchema = createInsertSchema(importSessions)
export const selectImportSessionSchema = createSelectSchema(importSessions)
export type InsertImportSession = z.infer<typeof insertImportSessionSchema>
export type SelectImportSession = z.infer<typeof selectImportSessionSchema>

export const insertRecurringTransactionSchema = createInsertSchema(recurringTransactions)
export const selectRecurringTransactionSchema = createSelectSchema(recurringTransactions)
export type InsertRecurringTransaction = z.infer<typeof insertRecurringTransactionSchema>
export type SelectRecurringTransaction = z.infer<typeof selectRecurringTransactionSchema>

export const insertBillSchema = createInsertSchema(bills)
export const selectBillSchema = createSelectSchema(bills)
export type InsertBill = z.infer<typeof insertBillSchema>
export type SelectBill = z.infer<typeof selectBillSchema>
