-- Migration: Add isTransfer field to transactions table
-- Date: 2025-10-12
-- Description: Adds a boolean field to mark income transactions as transfers between accounts
-- This helps maintain accurate balance calculations by excluding inter-account transfers from income totals

ALTER TABLE "transactions" ADD COLUMN "is_transfer" boolean DEFAULT false NOT NULL;

-- Add index for performance on transfer queries
CREATE INDEX "transactions_is_transfer_idx" ON "transactions" ("is_transfer");

-- Add comment for clarity
COMMENT ON COLUMN "transactions"."is_transfer" IS 'Marks income transactions that are transfers between accounts (should be excluded from total income calculations)';
