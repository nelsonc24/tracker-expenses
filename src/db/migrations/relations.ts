import { relations } from "drizzle-orm/relations";
import { users, accounts, budgets, categories, importSessions, recurringTransactions, transactions } from "./schema";

export const accountsRelations = relations(accounts, ({one, many}) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id]
	}),
	recurringTransactions: many(recurringTransactions),
	transactions: many(transactions),
}));

export const usersRelations = relations(users, ({many}) => ({
	accounts: many(accounts),
	budgets: many(budgets),
	categories: many(categories),
	importSessions: many(importSessions),
	recurringTransactions: many(recurringTransactions),
	transactions: many(transactions),
}));

export const budgetsRelations = relations(budgets, ({one}) => ({
	user: one(users, {
		fields: [budgets.userId],
		references: [users.id]
	}),
}));

export const categoriesRelations = relations(categories, ({one, many}) => ({
	user: one(users, {
		fields: [categories.userId],
		references: [users.id]
	}),
	category: one(categories, {
		fields: [categories.parentId],
		references: [categories.id],
		relationName: "categories_parentId_categories_id"
	}),
	categories: many(categories, {
		relationName: "categories_parentId_categories_id"
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

export const transactionsRelations = relations(transactions, ({one}) => ({
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
}));