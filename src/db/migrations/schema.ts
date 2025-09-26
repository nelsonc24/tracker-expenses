import { pgTable, index, foreignKey, uuid, text, numeric, timestamp, boolean, jsonb, integer, unique } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const activities = pgTable("activities", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	name: text().notNull(),
	description: text(),
	category: text().notNull(),
	budgetAmount: numeric("budget_amount", { precision: 15, scale:  2 }),
	budgetPeriod: text("budget_period").default('yearly').notNull(),
	startDate: timestamp("start_date", { mode: 'string' }).defaultNow().notNull(),
	endDate: timestamp("end_date", { mode: 'string' }),
	isActive: boolean("is_active").default(true).notNull(),
	color: text().default('#6b7280').notNull(),
	icon: text().default('activity').notNull(),
	commitmentType: text("commitment_type"),
	frequency: text(),
	location: text(),
	notes: text(),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("activities_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("activities_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("activities_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
	index("activities_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	index("activities_user_name_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.name.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "activities_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const activityBudgets = pgTable("activity_budgets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	activityId: uuid("activity_id").notNull(),
	periodStart: timestamp("period_start", { mode: 'string' }).notNull(),
	periodEnd: timestamp("period_end", { mode: 'string' }).notNull(),
	budgetAmount: numeric("budget_amount", { precision: 15, scale:  2 }).notNull(),
	spentAmount: numeric("spent_amount", { precision: 15, scale:  2 }).default('0.00').notNull(),
	transactionCount: integer("transaction_count").default(0).notNull(),
	lastUpdated: timestamp("last_updated", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("activity_budgets_activity_id_idx").using("btree", table.activityId.asc().nullsLast().op("uuid_ops")),
	index("activity_budgets_period_idx").using("btree", table.periodStart.asc().nullsLast().op("timestamp_ops"), table.periodEnd.asc().nullsLast().op("timestamp_ops")),
	index("activity_budgets_unique_period_idx").using("btree", table.activityId.asc().nullsLast().op("uuid_ops"), table.periodStart.asc().nullsLast().op("timestamp_ops"), table.periodEnd.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.activityId],
			foreignColumns: [activities.id],
			name: "activity_budgets_activity_id_activities_id_fk"
		}).onDelete("cascade"),
]);

export const bills = pgTable("bills", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	accountId: uuid("account_id").notNull(),
	categoryId: uuid("category_id"),
	name: text().notNull(),
	description: text(),
	amount: numeric({ precision: 15, scale:  2 }).notNull(),
	currency: text().default('AUD').notNull(),
	frequency: text().notNull(),
	dueDay: integer("due_day"),
	dueDate: timestamp("due_date", { mode: 'string' }),
	lastPaidDate: timestamp("last_paid_date", { mode: 'string' }),
	lastPaidAmount: numeric("last_paid_amount", { precision: 15, scale:  2 }),
	reminderDays: integer("reminder_days").default(3),
	isActive: boolean("is_active").default(true).notNull(),
	isAutoPay: boolean("is_auto_pay").default(false).notNull(),
	notes: text(),
	tags: jsonb().default([]),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("bills_account_id_idx").using("btree", table.accountId.asc().nullsLast().op("uuid_ops")),
	index("bills_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("bills_due_date_idx").using("btree", table.dueDate.asc().nullsLast().op("timestamp_ops")),
	index("bills_frequency_idx").using("btree", table.frequency.asc().nullsLast().op("text_ops")),
	index("bills_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "bills_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [accounts.id],
			name: "bills_account_id_accounts_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "bills_category_id_categories_id_fk"
		}).onDelete("set null"),
]);

export const categories = pgTable("categories", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	name: text().notNull(),
	description: text(),
	color: text().default('#6b7280').notNull(),
	icon: text().default('folder').notNull(),
	customIconUrl: text("custom_icon_url"),
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

export const transactionActivities = pgTable("transaction_activities", {
	transactionId: uuid("transaction_id").notNull(),
	activityId: uuid("activity_id").notNull(),
	assignedAt: timestamp("assigned_at", { mode: 'string' }).defaultNow().notNull(),
	assignedBy: text("assigned_by").default('user').notNull(),
}, (table) => [
	index("transaction_activities_activity_idx").using("btree", table.activityId.asc().nullsLast().op("uuid_ops")),
	index("transaction_activities_pk").using("btree", table.transactionId.asc().nullsLast().op("uuid_ops"), table.activityId.asc().nullsLast().op("uuid_ops")),
	index("transaction_activities_transaction_idx").using("btree", table.transactionId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.transactionId],
			foreignColumns: [transactions.id],
			name: "transaction_activities_transaction_id_transactions_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.activityId],
			foreignColumns: [activities.id],
			name: "transaction_activities_activity_id_activities_id_fk"
		}).onDelete("cascade"),
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
	receiptNumber: text("receipt_number"),
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
	isBill: boolean("is_bill").default(false).notNull(),
	billId: uuid("bill_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("transactions_account_id_idx").using("btree", table.accountId.asc().nullsLast().op("uuid_ops")),
	index("transactions_amount_idx").using("btree", table.amount.asc().nullsLast().op("numeric_ops")),
	index("transactions_bill_id_idx").using("btree", table.billId.asc().nullsLast().op("uuid_ops")),
	index("transactions_category_id_idx").using("btree", table.categoryId.asc().nullsLast().op("uuid_ops")),
	index("transactions_duplicate_hash_idx").using("btree", table.duplicateCheckHash.asc().nullsLast().op("text_ops")),
	index("transactions_is_bill_idx").using("btree", table.isBill.asc().nullsLast().op("bool_ops")),
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
	foreignKey({
			columns: [table.billId],
			foreignColumns: [bills.id],
			name: "transactions_bill_id_bills_id_fk"
		}).onDelete("set null"),
]);

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

export const activityLineItems = pgTable("activity_line_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	transactionId: uuid("transaction_id").notNull(),
	activityId: uuid("activity_id").notNull(),
	description: text().notNull(),
	amount: numeric({ precision: 15, scale:  2 }).notNull(),
	subcategory: text(),
	notes: text(),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("activity_line_items_activity_id_idx").using("btree", table.activityId.asc().nullsLast().op("uuid_ops")),
	index("activity_line_items_subcategory_idx").using("btree", table.subcategory.asc().nullsLast().op("text_ops")),
	index("activity_line_items_transaction_activity_idx").using("btree", table.transactionId.asc().nullsLast().op("uuid_ops"), table.activityId.asc().nullsLast().op("uuid_ops")),
	index("activity_line_items_transaction_id_idx").using("btree", table.transactionId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.transactionId],
			foreignColumns: [transactions.id],
			name: "activity_line_items_transaction_id_transactions_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.activityId],
			foreignColumns: [activities.id],
			name: "activity_line_items_activity_id_activities_id_fk"
		}).onDelete("cascade"),
]);
