import { relations } from "drizzle-orm/relations";
import { users, categories, transactions, accounts, bills, budgets, importSessions, recurringTransactions, activities, activityBudgets, transactionActivities, activityLineItems } from "./schema";

export const categoriesRelations = relations(categories, ({one, many}) => ({
	user: one(users, {
		fields: [categories.userId],
		references: [users.id]
	}),
	transactions: many(transactions),
	recurringTransactions: many(recurringTransactions),
	bills: many(bills),
}));

export const usersRelations = relations(users, ({many}) => ({
	categories: many(categories),
	transactions: many(transactions),
	accounts: many(accounts),
	budgets: many(budgets),
	importSessions: many(importSessions),
	recurringTransactions: many(recurringTransactions),
	bills: many(bills),
	activities: many(activities),
}));

export const transactionsRelations = relations(transactions, ({one, many}) => ({
	user: one(users, {
		fields: [transactions.userId],
		references: [users.id]
	}),
	account: one(accounts, {
		fields: [transactions.accountId],
		references: [accounts.id]
	}),
	category: one(categories, {
		fields: [transactions.categoryId],
		references: [categories.id]
	}),
	bill: one(bills, {
		fields: [transactions.billId],
		references: [bills.id]
	}),
	transactionActivities: many(transactionActivities),
	activityLineItems: many(activityLineItems),
}));

export const accountsRelations = relations(accounts, ({one, many}) => ({
	transactions: many(transactions),
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id]
	}),
	recurringTransactions: many(recurringTransactions),
	bills: many(bills),
}));

export const billsRelations = relations(bills, ({one, many}) => ({
	transactions: many(transactions),
	user: one(users, {
		fields: [bills.userId],
		references: [users.id]
	}),
	account: one(accounts, {
		fields: [bills.accountId],
		references: [accounts.id]
	}),
	category: one(categories, {
		fields: [bills.categoryId],
		references: [categories.id]
	}),
}));

export const budgetsRelations = relations(budgets, ({one}) => ({
	user: one(users, {
		fields: [budgets.userId],
		references: [users.id]
	}),
}));

export const importSessionsRelations = relations(importSessions, ({one}) => ({
	user: one(users, {
		fields: [importSessions.userId],
		references: [users.id]
	}),
}));

export const recurringTransactionsRelations = relations(recurringTransactions, ({one}) => ({
	user: one(users, {
		fields: [recurringTransactions.userId],
		references: [users.id]
	}),
	account: one(accounts, {
		fields: [recurringTransactions.accountId],
		references: [accounts.id]
	}),
	category: one(categories, {
		fields: [recurringTransactions.categoryId],
		references: [categories.id]
	}),
}));

export const activitiesRelations = relations(activities, ({one, many}) => ({
	user: one(users, {
		fields: [activities.userId],
		references: [users.id]
	}),
	activityBudgets: many(activityBudgets),
	transactionActivities: many(transactionActivities),
	activityLineItems: many(activityLineItems),
}));

export const activityBudgetsRelations = relations(activityBudgets, ({one}) => ({
	activity: one(activities, {
		fields: [activityBudgets.activityId],
		references: [activities.id]
	}),
}));

export const transactionActivitiesRelations = relations(transactionActivities, ({one}) => ({
	transaction: one(transactions, {
		fields: [transactionActivities.transactionId],
		references: [transactions.id]
	}),
	activity: one(activities, {
		fields: [transactionActivities.activityId],
		references: [activities.id]
	}),
}));

export const activityLineItemsRelations = relations(activityLineItems, ({one}) => ({
	transaction: one(transactions, {
		fields: [activityLineItems.transactionId],
		references: [transactions.id]
	}),
	activity: one(activities, {
		fields: [activityLineItems.activityId],
		references: [activities.id]
	}),
}));