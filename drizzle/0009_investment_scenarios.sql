-- 0009_investment_scenarios.sql
-- Adds the investment_scenarios table for the Investment Projection Calculator feature.
-- Users can save named scenarios with projection inputs for later retrieval.

CREATE TABLE IF NOT EXISTS "investment_scenarios" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "investment_type" text DEFAULT 'custom' NOT NULL,
  "initial_amount" numeric(15, 2) DEFAULT '0.00' NOT NULL,
  "monthly_contribution" numeric(15, 2) DEFAULT '0.00' NOT NULL,
  "annual_return_rate" numeric(6, 4) NOT NULL,
  "years" integer NOT NULL,
  "inflation_rate" numeric(6, 4) DEFAULT '2.5000' NOT NULL,
  "contribution_increase_rate" numeric(6, 4) DEFAULT '0.0000' NOT NULL,
  "tax_rate" numeric(6, 4) DEFAULT '0.0000' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "investment_scenarios_user_id_idx" ON "investment_scenarios" ("user_id");
