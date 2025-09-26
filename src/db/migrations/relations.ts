import { relations } from "drizzle-orm/relations";
import { users, activities, activityBudgets, bills, accounts, categories, importSessions, budgets, recurringTransactions, transactions, transactionActivities, activityLineItems } from "./schema";

export const activitiesRelations = relations(activities, ({one, many}) => ({
	user: one(users, {
		fields: [activities.userId],
		references: [users.id]
	}),
	activityBudgets: many(activityBudgets),
	transactionActivities: many(transactionActivities),
	activityLineItems: many(activityLineItems),
}));

export const usersRelations = relations(users, ({many}) => ({
	activities: many(activities),
	bills: many(bills),
	categories: many(categories),
	importSessions: many(importSessions),
	budgets: many(budgets),
	recurringTransactions: many(recurringTransactions),
	accounts: many(accounts),
	transactions: many(transactions),
}));

export const activityBudgetsRelations = relations(activityBudgets, ({one}) => ({
	activity: one(activities, {
		fields: [activityBudgets.activityId],
		references: [activities.id]
	}),
}));

export const billsRelations = relations(bills, ({one, many}) => ({
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
	transactions: many(transactions),
}));

export const accountsRelations = relations(accounts, ({one, many}) => ({
	bills: many(bills),
	recurringTransactions: many(recurringTransactions),
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id]
	}),
	transactions: many(transactions),
}));

export const categoriesRelations = relations(categories, ({one, many}) => ({
	bills: many(bills),
	user: one(users, {
		fields: [categories.userId],
		references: [users.id]
	}),
	recurringTransactions: many(recurringTransactions),
	transactions: many(transactions),
}));

export const importSessionsRelations = relations(importSessions, ({one}) => ({
	user: one(users, {
		fields: [importSessions.userId],
		references: [users.id]
	}),
}));

export const budgetsRelations = relations(budgets, ({one}) => ({
	user: one(users, {
		fields: [budgets.userId],
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

export const transactionsRelations = relations(transactions, ({one, many}) => ({
	transactionActivities: many(transactionActivities),
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
	activityLineItems: many(activityLineItems),
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