import { pgTable, unique, text, timestamp, jsonb, index, foreignKey, uuid, numeric, boolean, integer } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const users = pgTable("users", {
	id: text().primaryKey().notNull(),
	email: text().notNull(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	imageUrl: text("image_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	preferences: jsonb().default({"theme":"system","currency":"AUD","timezone":"Australia/Sydney","notifications":true}),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const accounts = pgTable("accounts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	name: text().notNull(),
	institution: text().notNull(),
	accountType: text("account_type").notNull(),
	accountNumber: text("account_number"),
	bsb: text(),
	balance: numeric({ precision: 15, scale:  2 }).default('0.00').notNull(),
	currency: text().default('AUD').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	lastSynced: timestamp("last_synced", { mode: 'string' }),
	connectionStatus: text("connection_status").default('disconnected').notNull(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("accounts_institution_idx").using("btree", table.institution.asc().nullsLast().op("text_ops")),
	index("accounts_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "accounts_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const budgets = pgTable("budgets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	name: text().notNull(),
	description: text(),
	amount: numeric({ precision: 15, scale:  2 }).notNull(),
	currency: text().default('AUD').notNull(),
	period: text().notNull(),
	startDate: timestamp("start_date", { mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { mode: 'string' }),
	categoryIds: jsonb("category_ids").default([]),
	accountIds: jsonb("account_ids").default([]),
	alertThreshold: numeric("alert_threshold", { precision: 5, scale:  2 }).default('80.00'),
	isActive: boolean("is_active").default(true).notNull(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("budgets_period_idx").using("btree", table.period.asc().nullsLast().op("text_ops")),
	index("budgets_start_date_idx").using("btree", table.startDate.asc().nullsLast().op("timestamp_ops")),
	index("budgets_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "budgets_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const categories = pgTable("categories", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	name: text().notNull(),
	description: text(),
	color: text().default('#6b7280').notNull(),
	icon: text().default('folder').notNull(),
	parentId: uuid("parent_id"),
	isDefault: boolean("is_default").default(false).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("categories_parent_id_idx").using("btree", table.parentId.asc().nullsLast().op("uuid_ops")),
	index("categories_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "categories_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "categories_parent_id_categories_id_fk"
		}).onDelete("set null"),
]);

export const importSessions = pgTable("import_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	fileName: text("file_name").notNull(),
	fileSize: integer("file_size").notNull(),
	fileType: text("file_type").notNull(),
	bankFormat: text("bank_format"),
	status: text().default('processing').notNull(),
	totalRows: integer("total_rows"),
	processedRows: integer("processed_rows").default(0),
	successfulRows: integer("successful_rows").default(0),
	failedRows: integer("failed_rows").default(0),
	errors: jsonb().default([]),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("import_sessions_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("import_sessions_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("import_sessions_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "import_sessions_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const recurringTransactions = pgTable("recurring_transactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	accountId: uuid("account_id").notNull(),
	categoryId: uuid("category_id"),
	name: text().notNull(),
	description: text().notNull(),
	amount: numeric({ precision: 15, scale:  2 }).notNull(),
	currency: text().default('AUD').notNull(),
	frequency: text().notNull(),
	startDate: timestamp("start_date", { mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { mode: 'string' }),
	nextDate: timestamp("next_date", { mode: 'string' }).notNull(),
	lastProcessed: timestamp("last_processed", { mode: 'string' }),
	isActive: boolean("is_active").default(true).notNull(),
	autoProcess: boolean("auto_process").default(false).notNull(),
	tags: jsonb().default([]),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("recurring_transactions_account_id_idx").using("btree", table.accountId.asc().nullsLast().op("uuid_ops")),
	index("recurring_transactions_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("recurring_transactions_next_date_idx").using("btree", table.nextDate.asc().nullsLast().op("timestamp_ops")),
	index("recurring_transactions_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "recurring_transactions_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [accounts.id],
			name: "recurring_transactions_account_id_accounts_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "recurring_transactions_category_id_categories_id_fk"
		}).onDelete("set null"),
]);

export const transactions = pgTable("transactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	accountId: uuid("account_id").notNull(),
	categoryId: uuid("category_id"),
	amount: numeric({ precision: 15, scale:  2 }).notNull(),
	currency: text().default('AUD').notNull(),
	description: text().notNull(),
	merchant: text(),
	reference: text(),
	transactionDate: timestamp("transaction_date", { mode: 'string' }).notNull(),
	postingDate: timestamp("posting_date", { mode: 'string' }),
	balance: numeric({ precision: 15, scale:  2 }),
	status: text().default('cleared').notNull(),
	type: text().notNull(),
	tags: jsonb().default([]),
	notes: text(),
	location: jsonb(),
	originalData: jsonb("original_data"),
	duplicateCheckHash: text("duplicate_check_hash"),
	reconciled: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("transactions_account_id_idx").using("btree", table.accountId.asc().nullsLast().op("uuid_ops")),
	index("transactions_amount_idx").using("btree", table.amount.asc().nullsLast().op("numeric_ops")),
	index("transactions_category_id_idx").using("btree", table.categoryId.asc().nullsLast().op("uuid_ops")),
	index("transactions_duplicate_hash_idx").using("btree", table.duplicateCheckHash.asc().nullsLast().op("text_ops")),
	index("transactions_merchant_idx").using("btree", table.merchant.asc().nullsLast().op("text_ops")),
	index("transactions_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("transactions_transaction_date_idx").using("btree", table.transactionDate.asc().nullsLast().op("timestamp_ops")),
	index("transactions_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "transactions_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [accounts.id],
			name: "transactions_account_id_accounts_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "transactions_category_id_categories_id_fk"
		}).onDelete("set null"),
]);
