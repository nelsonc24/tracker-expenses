-- Migration: Tax Return Preparation Feature
-- Adds tax deduction tracking to transactions, WFH daily log table, and tax settings table

-- 1. Extend transactions table with Australian tax fields
ALTER TABLE "transactions"
  ADD COLUMN IF NOT EXISTS "tax_deductible" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "tax_category" text;

CREATE INDEX IF NOT EXISTS "transactions_tax_deductible_idx"
  ON "transactions" ("tax_deductible");

-- 2. WFH daily log table (ATO 70c/hr fixed rate method)
CREATE TABLE IF NOT EXISTS "wfh_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "log_date" text NOT NULL,      -- ISO date string YYYY-MM-DD
  "hours" numeric(5, 2) NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "wfh_logs_user_date_unique" UNIQUE ("user_id", "log_date")
);

CREATE INDEX IF NOT EXISTS "wfh_logs_user_id_idx" ON "wfh_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "wfh_logs_log_date_idx" ON "wfh_logs" ("log_date");

-- 3. Tax settings table (per user, per financial year)
CREATE TABLE IF NOT EXISTS "tax_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "financial_year" text NOT NULL DEFAULT '2025-26',
  "annual_salary" numeric(15, 2),
  "employer_super_rate" numeric(5, 2) NOT NULL DEFAULT 11.5,
  "salary_sacrifice_amount" numeric(15, 2) NOT NULL DEFAULT 0,
  "personal_super_contributions" numeric(15, 2) NOT NULL DEFAULT 0,
  "has_private_health_insurance" boolean NOT NULL DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "tax_settings_user_fy_unique" UNIQUE ("user_id", "financial_year")
);

CREATE INDEX IF NOT EXISTS "tax_settings_user_id_idx" ON "tax_settings" ("user_id");
