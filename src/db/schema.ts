import { pgTable, text, timestamp, decimal, integer, boolean, uuid, jsonb, index, unique } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

// Users table - matches actual database structure
export const users = pgTable('users', {
  id: text('id').primaryKey(), // Clerk user ID as text
  email: text('email').notNull(),
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
}, (table) => [
  unique('users_email_unique').on(table.email),
])

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
export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color').default('#6b7280').notNull(),
  icon: text('icon').default('folder').notNull(),
  customIconUrl: text('custom_icon_url'),
  parentId: uuid('parent_id'),
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
  period: text('period').notNull(), // 'weekly', 'monthly', 'quarterly', 'yearly'
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  categoryIds: jsonb('category_ids').$type<string[]>().default([]),
  accountIds: jsonb('account_ids').$type<string[]>().default([]),
  alertThreshold: decimal('alert_threshold', { precision: 5, scale: 2 }).default('80.00'), // percentage
  isActive: boolean('is_active').default(true).notNull(),
  
  // Auto-reset and period tracking
  isRecurring: boolean('is_recurring').default(true).notNull(),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  nextResetDate: timestamp('next_reset_date'),
  autoResetEnabled: boolean('auto_reset_enabled').default(false).notNull(),
  resetDay: integer('reset_day').default(1), // Day of month/week for reset (1-31)
  
  // Rollover settings
  rolloverUnused: boolean('rollover_unused').default(false).notNull(),
  rolloverLimit: decimal('rollover_limit', { precision: 15, scale: 2 }),
  rolloverStrategy: text('rollover_strategy').default('none').notNull(), // 'full', 'partial', 'capped', 'none'
  rolloverPercentage: integer('rollover_percentage'), // For partial rollover (0-100)
  
  metadata: jsonb('metadata').$type<{
    color?: string
    notifications?: boolean
    rollover?: boolean // Deprecated - use rolloverUnused
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('budgets_user_id_idx').on(table.userId),
  periodIdx: index('budgets_period_idx').on(table.period),
  startDateIdx: index('budgets_start_date_idx').on(table.startDate),
  nextResetIdx: index('budgets_next_reset_idx').on(table.nextResetDate),
}))

// Budget Periods table - tracks historical budget periods
export const budgetPeriods = pgTable('budget_periods', {
  id: uuid('id').defaultRandom().primaryKey(),
  budgetId: uuid('budget_id').references(() => budgets.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  
  // Budget amounts for this period
  allocatedAmount: decimal('allocated_amount', { precision: 15, scale: 2 }).notNull(),
  rolloverAmount: decimal('rollover_amount', { precision: 15, scale: 2 }).default('0.00').notNull(),
  totalBudget: decimal('total_budget', { precision: 15, scale: 2 }).notNull(), // allocated + rollover
  spentAmount: decimal('spent_amount', { precision: 15, scale: 2 }).default('0.00').notNull(),
  remainingAmount: decimal('remaining_amount', { precision: 15, scale: 2 }),
  
  // Status tracking
  status: text('status').notNull(), // 'active', 'completed', 'future', 'cancelled'
  utilizationPercentage: decimal('utilization_percentage', { precision: 5, scale: 2 }),
  
  // Performance metrics
  transactionCount: integer('transaction_count').default(0).notNull(),
  averageDailySpend: decimal('average_daily_spend', { precision: 15, scale: 2 }),
  peakSpendingDay: timestamp('peak_spending_day'),
  
  // Metadata
  periodLabel: text('period_label').notNull(), // "October 2025", "Q4 2025", etc.
  notes: text('notes'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  budgetIdIdx: index('budget_periods_budget_id_idx').on(table.budgetId),
  userIdIdx: index('budget_periods_user_id_idx').on(table.userId),
  periodIdx: index('budget_periods_period_idx').on(table.periodStart, table.periodEnd),
  statusIdx: index('budget_periods_status_idx').on(table.status),
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

// Activities table - for tracking spending commitments like dance club, gym, hobbies, etc.
export const activities = pgTable('activities', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category').notNull(), // 'hobby', 'fitness', 'education', 'professional', 'lifestyle', 'project', 'membership'
  budgetAmount: decimal('budget_amount', { precision: 15, scale: 2 }),
  budgetPeriod: text('budget_period').default('yearly').notNull(), // 'monthly', 'yearly', 'lifetime'
  startDate: timestamp('start_date').defaultNow().notNull(),
  endDate: timestamp('end_date'),
  isActive: boolean('is_active').default(true).notNull(),
  color: text('color').default('#6b7280').notNull(),
  icon: text('icon').default('activity').notNull(),
  commitmentType: text('commitment_type'), // 'membership', 'subscription', 'course', 'project', 'hobby'
  frequency: text('frequency'), // 'daily', 'weekly', 'monthly', 'occasional'
  location: text('location'),
  notes: text('notes'),
  metadata: jsonb('metadata').$type<{
    tags?: string[]
    reminders?: boolean
    autoAssign?: boolean
    autoAssignRules?: Array<{ field: string, value: string, operator: string }>
  }>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('activities_user_id_idx').on(table.userId),
  nameIdx: index('activities_name_idx').on(table.name),
  categoryIdx: index('activities_category_idx').on(table.category),
  activeIdx: index('activities_active_idx').on(table.isActive),
  userNameIdx: index('activities_user_name_idx').on(table.userId, table.name),
}))

// Junction table for many-to-many relationship between transactions and activities
export const transactionActivities = pgTable('transaction_activities', {
  transactionId: uuid('transaction_id').references(() => transactions.id, { onDelete: 'cascade' }).notNull(),
  activityId: uuid('activity_id').references(() => activities.id, { onDelete: 'cascade' }).notNull(),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  assignedBy: text('assigned_by').default('user').notNull(), // 'user', 'rule', 'auto'
}, (table) => ({
  pk: index('transaction_activities_pk').on(table.transactionId, table.activityId),
  transactionIdx: index('transaction_activities_transaction_idx').on(table.transactionId),
  activityIdx: index('transaction_activities_activity_idx').on(table.activityId),
}))

// Activity budgets and spending tracking
export const activityBudgets = pgTable('activity_budgets', {
  id: uuid('id').defaultRandom().primaryKey(),
  activityId: uuid('activity_id').references(() => activities.id, { onDelete: 'cascade' }).notNull(),
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  budgetAmount: decimal('budget_amount', { precision: 15, scale: 2 }).notNull(),
  spentAmount: decimal('spent_amount', { precision: 15, scale: 2 }).default('0.00').notNull(),
  transactionCount: integer('transaction_count').default(0).notNull(),
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  activityIdIdx: index('activity_budgets_activity_id_idx').on(table.activityId),
  periodIdx: index('activity_budgets_period_idx').on(table.periodStart, table.periodEnd),
  uniquePeriod: index('activity_budgets_unique_period_idx').on(table.activityId, table.periodStart, table.periodEnd),
}))

// Activity line items for detailed expense breakdown within transactions
export const activityLineItems = pgTable('activity_line_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  transactionId: uuid('transaction_id').references(() => transactions.id, { onDelete: 'cascade' }).notNull(),
  activityId: uuid('activity_id').references(() => activities.id, { onDelete: 'cascade' }).notNull(),
  description: text('description').notNull(), // "Dance shoes", "Costume", "Master class"
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  subcategory: text('subcategory'), // "equipment", "apparel", "training", "competition", "membership"
  notes: text('notes'),
  metadata: jsonb('metadata').$type<{
    tags?: string[]
    vendor?: string
    receiptUrl?: string
    taxDeductible?: boolean
  }>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  transactionIdIdx: index('activity_line_items_transaction_id_idx').on(table.transactionId),
  activityIdIdx: index('activity_line_items_activity_id_idx').on(table.activityId),
  subcategoryIdx: index('activity_line_items_subcategory_idx').on(table.subcategory),
  transactionActivityIdx: index('activity_line_items_transaction_activity_idx').on(table.transactionId, table.activityId),
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

export const insertActivitySchema = createInsertSchema(activities)
export const selectActivitySchema = createSelectSchema(activities)
export type InsertActivity = z.infer<typeof insertActivitySchema>
export type SelectActivity = z.infer<typeof selectActivitySchema>

export const insertTransactionActivitySchema = createInsertSchema(transactionActivities)
export const selectTransactionActivitySchema = createSelectSchema(transactionActivities)
export type InsertTransactionActivity = z.infer<typeof insertTransactionActivitySchema>
export type SelectTransactionActivity = z.infer<typeof selectTransactionActivitySchema>

export const insertActivityBudgetSchema = createInsertSchema(activityBudgets)
export const selectActivityBudgetSchema = createSelectSchema(activityBudgets)
export type InsertActivityBudget = z.infer<typeof insertActivityBudgetSchema>
export type SelectActivityBudget = z.infer<typeof selectActivityBudgetSchema>

export const insertActivityLineItemSchema = createInsertSchema(activityLineItems)
export const selectActivityLineItemSchema = createSelectSchema(activityLineItems)
export type InsertActivityLineItem = z.infer<typeof insertActivityLineItemSchema>
export type SelectActivityLineItem = z.infer<typeof selectActivityLineItemSchema>

// Debts table
export const debts = pgTable('debts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  debtType: text('debt_type').notNull(), // 'credit_card', 'personal_loan', 'student_loan', 'mortgage', 'car_loan', 'medical', 'personal', 'line_of_credit', 'bnpl'
  creditorName: text('creditor_name').notNull(),
  accountNumber: text('account_number'), // Last 4 digits
  
  // Balance & Amount
  currentBalance: decimal('current_balance', { precision: 15, scale: 2 }).notNull(),
  originalAmount: decimal('original_amount', { precision: 15, scale: 2 }),
  creditLimit: decimal('credit_limit', { precision: 15, scale: 2 }), // For revolving credit
  
  // Interest & Terms
  interestRate: decimal('interest_rate', { precision: 5, scale: 2 }).notNull(), // APR
  isVariableRate: boolean('is_variable_rate').default(false).notNull(),
  interestCalculationMethod: text('interest_calculation_method').default('compound').notNull(), // 'simple', 'compound', 'daily'
  
  // Payment Info
  minimumPayment: decimal('minimum_payment', { precision: 15, scale: 2 }).notNull(),
  paymentFrequency: text('payment_frequency').notNull(), // 'weekly', 'biweekly', 'monthly', 'one_time'
  paymentDueDay: integer('payment_due_day'), // 1-31 for monthly, 1-7 for weekly, null for one_time
  nextDueDate: timestamp('next_due_date'),
  
  // Term Info (for fixed-term loans)
  loanStartDate: timestamp('loan_start_date'),
  loanMaturityDate: timestamp('loan_maturity_date'),
  loanTermMonths: integer('loan_term_months'),
  
  // Fees & Penalties
  lateFee: decimal('late_fee', { precision: 10, scale: 2 }),
  gracePeriodDays: integer('grace_period_days').default(0).notNull(),
  
  // Status & Organization
  status: text('status').default('active').notNull(), // 'active', 'paid_off', 'in_collections', 'settled', 'archived'
  payoffPriority: integer('payoff_priority'), // 1-10
  linkedAccountId: uuid('linked_account_id').references(() => accounts.id, { onDelete: 'set null' }),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  
  // Metadata
  tags: jsonb('tags').$type<string[]>().default([]),
  notes: text('notes'),
  color: text('color').default('#dc2626').notNull(), // Red for debt
  icon: text('icon').default('credit-card').notNull(),
  
  // Tracking
  lastBalanceUpdate: timestamp('last_balance_update'),
  lastPaymentDate: timestamp('last_payment_date'),
  lastPaymentAmount: decimal('last_payment_amount', { precision: 15, scale: 2 }),
  
  currency: text('currency').default('AUD').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('debts_user_id_idx').on(table.userId),
  statusIdx: index('debts_status_idx').on(table.status),
  nextDueDateIdx: index('debts_next_due_date_idx').on(table.nextDueDate),
  debtTypeIdx: index('debts_debt_type_idx').on(table.debtType),
  priorityIdx: index('debts_priority_idx').on(table.payoffPriority),
}))

// Debt Payments table
export const debtPayments = pgTable('debt_payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  debtId: uuid('debt_id').references(() => debts.id, { onDelete: 'cascade' }).notNull(),
  
  // Payment Details
  paymentDate: timestamp('payment_date').notNull(),
  paymentAmount: decimal('payment_amount', { precision: 15, scale: 2 }).notNull(),
  principalAmount: decimal('principal_amount', { precision: 15, scale: 2 }).notNull(),
  interestAmount: decimal('interest_amount', { precision: 15, scale: 2 }).default('0.00').notNull(),
  feesAmount: decimal('fees_amount', { precision: 15, scale: 2 }).default('0.00').notNull(),
  
  // Source
  fromAccountId: uuid('from_account_id').references(() => accounts.id, { onDelete: 'set null' }),
  transactionId: uuid('transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
  
  // Tracking
  balanceAfterPayment: decimal('balance_after_payment', { precision: 15, scale: 2 }).notNull(),
  confirmationNumber: text('confirmation_number'),
  paymentMethod: text('payment_method'), // 'bank_transfer', 'credit_card', 'cash', 'check', 'auto_pay'
  
  // Metadata
  notes: text('notes'),
  isExtraPayment: boolean('is_extra_payment').default(false).notNull(), // Above minimum
  isAutomated: boolean('is_automated').default(false).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('debt_payments_user_id_idx').on(table.userId),
  debtIdIdx: index('debt_payments_debt_id_idx').on(table.debtId),
  paymentDateIdx: index('debt_payments_payment_date_idx').on(table.paymentDate),
  extraPaymentIdx: index('debt_payments_extra_payment_idx').on(table.isExtraPayment),
}))

// Debt Strategies table
export const debtStrategies = pgTable('debt_strategies', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Strategy Config
  name: text('name').notNull(),
  strategyType: text('strategy_type').notNull(), // 'snowball', 'avalanche', 'hybrid', 'custom', 'consolidation'
  description: text('description'),
  
  // Parameters
  extraMonthlyPayment: decimal('extra_monthly_payment', { precision: 15, scale: 2 }).default('0.00').notNull(),
  extraPaymentFrequency: text('extra_payment_frequency').default('monthly').notNull(),
  startDate: timestamp('start_date').notNull(),
  
  // Debt Priority Order (array of debt IDs in payoff order)
  debtPriorityOrder: jsonb('debt_priority_order').$type<string[]>().default([]),
  
  // Consolidation specifics
  consolidationRate: decimal('consolidation_rate', { precision: 5, scale: 2 }),
  consolidationTermMonths: integer('consolidation_term_months'),
  consolidatedDebtIds: jsonb('consolidated_debt_ids').$type<string[]>(),
  
  // Settings
  isActive: boolean('is_active').default(false).notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  
  // Calculated Projections (cached)
  projectedDebtFreeDate: timestamp('projected_debt_free_date'),
  totalInterestProjected: decimal('total_interest_projected', { precision: 15, scale: 2 }),
  totalPaymentsProjected: decimal('total_payments_projected', { precision: 15, scale: 2 }),
  monthsToDebtFree: integer('months_to_debt_free'),
  interestSavedVsMinimum: decimal('interest_saved_vs_minimum', { precision: 15, scale: 2 }),
  
  // Metadata
  lastCalculated: timestamp('last_calculated'),
  calculationParams: jsonb('calculation_params'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('debt_strategies_user_id_idx').on(table.userId),
  activeIdx: index('debt_strategies_active_idx').on(table.isActive),
  strategyTypeIdx: index('debt_strategies_type_idx').on(table.strategyType),
}))

// Debt Projections table
export const debtProjections = pgTable('debt_projections', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  strategyId: uuid('strategy_id').references(() => debtStrategies.id, { onDelete: 'cascade' }).notNull(),
  debtId: uuid('debt_id').references(() => debts.id, { onDelete: 'cascade' }).notNull(),
  
  // Projection Data
  projectionMonth: integer('projection_month').notNull(), // 0 = current month
  projectionDate: timestamp('projection_date').notNull(),
  
  // Projected Values
  projectedBalance: decimal('projected_balance', { precision: 15, scale: 2 }).notNull(),
  projectedPayment: decimal('projected_payment', { precision: 15, scale: 2 }).notNull(),
  projectedPrincipal: decimal('projected_principal', { precision: 15, scale: 2 }).notNull(),
  projectedInterest: decimal('projected_interest', { precision: 15, scale: 2 }).notNull(),
  
  // Cumulative Totals
  cumulativePrincipalPaid: decimal('cumulative_principal_paid', { precision: 15, scale: 2 }).notNull(),
  cumulativeInterestPaid: decimal('cumulative_interest_paid', { precision: 15, scale: 2 }).notNull(),
  
  // Metadata
  isPaidOff: boolean('is_paid_off').default(false).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('debt_projections_user_id_idx').on(table.userId),
  strategyIdIdx: index('debt_projections_strategy_id_idx').on(table.strategyId),
  debtIdIdx: index('debt_projections_debt_id_idx').on(table.debtId),
  monthIdx: index('debt_projections_month_idx').on(table.projectionMonth),
}))

// Debt Milestones table
export const debtMilestones = pgTable('debt_milestones', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  debtId: uuid('debt_id').references(() => debts.id, { onDelete: 'set null' }),
  
  // Milestone Details
  milestoneType: text('milestone_type').notNull(), // 'debt_paid_off', 'half_paid', 'year_anniversary', 'interest_saved_threshold', 'custom'
  milestoneName: text('milestone_name').notNull(),
  description: text('description'),
  
  // Trigger Conditions
  targetDate: timestamp('target_date'),
  targetBalance: decimal('target_balance', { precision: 15, scale: 2 }),
  targetPercentPaid: decimal('target_percent_paid', { precision: 5, scale: 2 }),
  
  // Status
  isAchieved: boolean('is_achieved').default(false).notNull(),
  achievedDate: timestamp('achieved_date'),
  
  // Celebration
  celebrationMessage: text('celebration_message'),
  iconEmoji: text('icon_emoji'), // '🎉', '💪', '🏆', etc.
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('debt_milestones_user_id_idx').on(table.userId),
  debtIdIdx: index('debt_milestones_debt_id_idx').on(table.debtId),
  achievedIdx: index('debt_milestones_achieved_idx').on(table.isAchieved),
  targetDateIdx: index('debt_milestones_target_date_idx').on(table.targetDate),
}))

// Schema exports
export const insertDebtSchema = createInsertSchema(debts)
export const selectDebtSchema = createSelectSchema(debts)
export type InsertDebt = z.infer<typeof insertDebtSchema>
export type SelectDebt = z.infer<typeof selectDebtSchema>

export const insertDebtPaymentSchema = createInsertSchema(debtPayments)
export const selectDebtPaymentSchema = createSelectSchema(debtPayments)
export type InsertDebtPayment = z.infer<typeof insertDebtPaymentSchema>
export type SelectDebtPayment = z.infer<typeof selectDebtPaymentSchema>

export const insertDebtStrategySchema = createInsertSchema(debtStrategies)
export const selectDebtStrategySchema = createSelectSchema(debtStrategies)
export type InsertDebtStrategy = z.infer<typeof insertDebtStrategySchema>
export type SelectDebtStrategy = z.infer<typeof selectDebtStrategySchema>

export const insertDebtProjectionSchema = createInsertSchema(debtProjections)
export const selectDebtProjectionSchema = createSelectSchema(debtProjections)
export type InsertDebtProjection = z.infer<typeof insertDebtProjectionSchema>
export type SelectDebtProjection = z.infer<typeof selectDebtProjectionSchema>

export const insertDebtMilestoneSchema = createInsertSchema(debtMilestones)
export const selectDebtMilestoneSchema = createSelectSchema(debtMilestones)
export type InsertDebtMilestone = z.infer<typeof insertDebtMilestoneSchema>
export type SelectDebtMilestone = z.infer<typeof selectDebtMilestoneSchema>

// Notifications table - tracks all notifications sent to users
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Notification Content
  notificationType: text('notification_type').notNull(), // 'bill_reminder', 'debt_due', 'budget_alert', 'payment_confirmation'
  title: text('title').notNull(),
  message: text('message').notNull(),
  
  // Delivery Details
  channel: text('channel').notNull(), // 'email', 'push', 'sms', 'in_app'
  status: text('status').default('pending').notNull(), // 'pending', 'sent', 'delivered', 'failed', 'read'
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  readAt: timestamp('read_at'),
  
  // Related Entity
  relatedEntityType: text('related_entity_type'), // 'bill', 'debt', 'budget', 'transaction'
  relatedEntityId: uuid('related_entity_id'),
  
  // Email specifics
  emailTo: text('email_to'),
  emailSubject: text('email_subject'),
  emailMessageId: text('email_message_id'), // Resend message ID for tracking
  
  // Metadata
  metadata: jsonb('metadata').$type<{
    billName?: string
    debtName?: string
    amount?: number
    dueDate?: string
    daysUntilDue?: number
    resendResponse?: Record<string, unknown>
    errorMessage?: string
  }>(),
  
  // Error tracking
  errorCount: integer('error_count').default(0).notNull(),
  lastErrorMessage: text('last_error_message'),
  lastErrorAt: timestamp('last_error_at'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('notifications_user_id_idx').on(table.userId),
  typeIdx: index('notifications_type_idx').on(table.notificationType),
  statusIdx: index('notifications_status_idx').on(table.status),
  channelIdx: index('notifications_channel_idx').on(table.channel),
  relatedEntityIdx: index('notifications_related_entity_idx').on(table.relatedEntityType, table.relatedEntityId),
  sentAtIdx: index('notifications_sent_at_idx').on(table.sentAt),
  createdAtIdx: index('notifications_created_at_idx').on(table.createdAt),
}))

// Notification Preferences table - user preferences for notifications
export const notificationPreferences = pgTable('notification_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Global Settings
  emailNotificationsEnabled: boolean('email_notifications_enabled').default(true).notNull(),
  pushNotificationsEnabled: boolean('push_notifications_enabled').default(false).notNull(),
  
  // Bill Reminders
  billRemindersEnabled: boolean('bill_reminders_enabled').default(true).notNull(),
  billReminderDaysBefore: integer('bill_reminder_days_before').default(3).notNull(),
  billReminderChannel: text('bill_reminder_channel').default('email').notNull(), // 'email', 'push', 'both'
  
  // Debt Reminders
  debtRemindersEnabled: boolean('debt_reminders_enabled').default(true).notNull(),
  debtReminderDaysBefore: integer('debt_reminder_days_before').default(3).notNull(),
  debtReminderChannel: text('debt_reminder_channel').default('email').notNull(),
  
  // Budget Alerts
  budgetAlertsEnabled: boolean('budget_alerts_enabled').default(true).notNull(),
  budgetAlertThreshold: integer('budget_alert_threshold').default(80).notNull(), // percentage
  budgetAlertChannel: text('budget_alert_channel').default('email').notNull(),
  
  // Notification Frequency
  digestFrequency: text('digest_frequency').default('daily').notNull(), // 'immediate', 'daily', 'weekly', 'never'
  quietHoursStart: text('quiet_hours_start'), // '22:00'
  quietHoursEnd: text('quiet_hours_end'), // '08:00'
  
  // Email Preferences
  preferredEmail: text('preferred_email'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('notification_preferences_user_id_idx').on(table.userId),
  userIdUnique: unique('notification_preferences_user_id_unique').on(table.userId),
}))

export const insertNotificationSchema = createInsertSchema(notifications)
export const selectNotificationSchema = createSelectSchema(notifications)
export type InsertNotification = z.infer<typeof insertNotificationSchema>
export type SelectNotification = z.infer<typeof selectNotificationSchema>

export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences)
export const selectNotificationPreferenceSchema = createSelectSchema(notificationPreferences)
export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferenceSchema>
export type SelectNotificationPreference = z.infer<typeof selectNotificationPreferenceSchema>
