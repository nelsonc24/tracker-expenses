import { 
  pgTable, 
  uuid, 
  varchar, 
  text, 
  timestamp, 
  boolean, 
  bigint,
  integer,
  jsonb,
  pgEnum
} from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'

// Enums
export const themePreferenceEnum = pgEnum('theme_preference', ['light', 'dark', 'auto'])
export const colorSchemeEnum = pgEnum('color_scheme', ['default', 'forest', 'sunset', 'ocean', 'monochrome'])
export const accountTypeEnum = pgEnum('account_type', ['checking', 'savings', 'credit', 'investment'])
export const matchTypeEnum = pgEnum('match_type', ['contains', 'regex', 'amount', 'merchant'])
export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high'])
export const importStatusEnum = pgEnum('import_status', ['uploading', 'processing', 'completed', 'failed'])
export const stagingStatusEnum = pgEnum('staging_status', ['pending', 'processed', 'failed'])

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().$defaultFn(() => createId()),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  image: text('image'),
  themePreference: themePreferenceEnum('theme_preference').default('auto'),
  colorScheme: colorSchemeEnum('color_scheme').default('default'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
})

// Categories table (self-referencing for hierarchy)
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().$defaultFn(() => createId()),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  parentId: uuid('parent_id'), // Will be constrained later
  color: varchar('color', { length: 7 }), // hex color
  icon: varchar('icon', { length: 50 }),
  isSystem: boolean('is_system').default(false).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
})

// Institutions table
export const institutions = pgTable('institutions', {
  id: uuid('id').primaryKey().$defaultFn(() => createId()),
  name: varchar('name', { length: 100 }).notNull(),
  countryCode: varchar('country_code', { length: 3 }).default('AUS').notNull(),
  provider: varchar('provider', { length: 50 }).notNull(), // basiq, plaid, etc
  providerInstitutionId: varchar('provider_institution_id', { length: 100 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
})

// Connections table
export const connections = pgTable('connections', {
  id: uuid('id').primaryKey().$defaultFn(() => createId()),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(),
  providerItemId: varchar('provider_item_id', { length: 100 }).notNull(),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  consentExpiresAt: timestamp('consent_expires_at', { withTimezone: true }),
  scopes: jsonb('scopes').$type<string[]>(),
  meta: jsonb('meta').$type<Record<string, any>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
})

// Accounts table
export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().$defaultFn(() => createId()),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  connectionId: uuid('connection_id').references(() => connections.id, { onDelete: 'cascade' }),
  institutionId: uuid('institution_id').references(() => institutions.id),
  name: varchar('name', { length: 100 }).notNull(),
  officialName: varchar('official_name', { length: 100 }),
  mask: varchar('mask', { length: 10 }),
  type: accountTypeEnum('type').notNull(),
  subtype: varchar('subtype', { length: 50 }),
  currency: varchar('currency', { length: 3 }).default('AUD').notNull(),
  balanceCurrent: bigint('balance_current', { mode: 'number' }), // in cents
  balanceAvailable: bigint('balance_available', { mode: 'number' }), // in cents
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
})

// Transactions table
export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().$defaultFn(() => createId()),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }),
  connectionId: uuid('connection_id').references(() => connections.id, { onDelete: 'set null' }),
  postedAt: timestamp('posted_at', { withTimezone: true }).notNull(),
  effectiveAt: timestamp('effective_at', { withTimezone: true }),
  descriptionRaw: text('description_raw').notNull(),
  descriptionClean: text('description_clean'),
  merchantName: varchar('merchant_name', { length: 200 }),
  amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(), // signed, in cents
  currency: varchar('currency', { length: 3 }).default('AUD').notNull(),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  hashDedupe: varchar('hash_dedupe', { length: 64 }).notNull(),
  isTransfer: boolean('is_transfer').default(false).notNull(),
  isRecurring: boolean('is_recurring').default(false).notNull(),
  transferPairId: uuid('transfer_pair_id'),
  bankCategory: varchar('bank_category', { length: 100 }),
  paymentType: varchar('payment_type', { length: 50 }),
  receiptNumber: varchar('receipt_number', { length: 100 }),
  bankTransactionId: varchar('bank_transaction_id', { length: 100 }),
  fromAccount: varchar('from_account', { length: 100 }),
  toAccount: varchar('to_account', { length: 100 }),
  notes: jsonb('notes').$type<Record<string, any>>(),
  updatedByRuleId: uuid('updated_by_rule_id'),
  manualCategoryLocked: boolean('manual_category_locked').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
})

// Rules table
export const rules = pgTable('rules', {
  id: uuid('id').primaryKey().$defaultFn(() => createId()),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  matchType: matchTypeEnum('match_type').notNull(),
  predicate: text('predicate').notNull(),
  actions: jsonb('actions').$type<Record<string, any>>().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  priority: integer('priority').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
})

// Budgets table
export const budgets = pgTable('budgets', {
  id: uuid('id').primaryKey().$defaultFn(() => createId()),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  period: varchar('period', { length: 20 }).default('monthly').notNull(),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'cascade' }),
  amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(), // in cents
  rollover: boolean('rollover').default(false).notNull(),
  startMonth: varchar('start_month', { length: 7 }), // YYYY-MM
  endMonth: varchar('end_month', { length: 7 }), // YYYY-MM
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
})

// User preferences table
export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').primaryKey().$defaultFn(() => createId()),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  dashboardLayout: jsonb('dashboard_layout').$type<Record<string, any>>(),
  chartPreferences: jsonb('chart_preferences').$type<Record<string, any>>(),
  notificationSettings: jsonb('notification_settings').$type<Record<string, any>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
})

// Insights table
export const insights = pgTable('insights', {
  id: uuid('id').primaryKey().$defaultFn(() => createId()),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // spending_pattern, budget_alert, anomaly
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  data: jsonb('data').$type<Record<string, any>>(),
  isRead: boolean('is_read').default(false).notNull(),
  priority: priorityEnum('priority').default('medium').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
})

// CSV imports table
export const csvImports = pgTable('csv_imports', {
  id: uuid('id').primaryKey().$defaultFn(() => createId()),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  filename: varchar('filename', { length: 255 }).notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  status: importStatusEnum('status').default('uploading').notNull(),
  rowsTotal: integer('rows_total'),
  rowsProcessed: integer('rows_processed').default(0).notNull(),
  rowsFailed: integer('rows_failed').default(0).notNull(),
  bankFormatDetected: varchar('bank_format_detected', { length: 50 }),
  columnMappings: jsonb('column_mappings').$type<Record<string, any>>(),
  errorLog: jsonb('error_log').$type<any[]>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true })
})
