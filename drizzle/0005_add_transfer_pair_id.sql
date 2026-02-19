-- Migration: Add transfer_pair_id field to transactions table
-- Date: 2026-02-19
-- Description: Adds a UUID field to link two transfer transactions together
-- This enables tracking which transactions are paired transfers (money moving from account A to account B)

ALTER TABLE "transactions" ADD COLUMN "transfer_pair_id" uuid;

-- Add index for performance on transfer pair queries
CREATE INDEX "transactions_transfer_pair_id_idx" ON "transactions" ("transfer_pair_id");

-- Add comment for clarity
COMMENT ON COLUMN "transactions"."transfer_pair_id" IS 'UUID that links two transfer transactions together (e.g., debit in account A and credit in account B)';
