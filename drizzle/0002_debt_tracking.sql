-- Debts table
CREATE TABLE IF NOT EXISTS "debts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"debt_type" text NOT NULL,
	"creditor_name" text NOT NULL,
	"account_number" text,
	"current_balance" numeric(15, 2) NOT NULL,
	"original_amount" numeric(15, 2),
	"credit_limit" numeric(15, 2),
	"interest_rate" numeric(5, 2) NOT NULL,
	"is_variable_rate" boolean DEFAULT false NOT NULL,
	"interest_calculation_method" text DEFAULT 'compound' NOT NULL,
	"minimum_payment" numeric(15, 2) NOT NULL,
	"payment_frequency" text NOT NULL,
	"payment_due_day" integer,
	"next_due_date" timestamp,
	"loan_start_date" timestamp,
	"loan_maturity_date" timestamp,
	"loan_term_months" integer,
	"late_fee" numeric(10, 2),
	"grace_period_days" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"payoff_priority" integer,
	"linked_account_id" uuid,
	"category_id" uuid,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"color" text DEFAULT '#dc2626' NOT NULL,
	"icon" text DEFAULT 'credit-card' NOT NULL,
	"last_balance_update" timestamp,
	"last_payment_date" timestamp,
	"last_payment_amount" numeric(15, 2),
	"currency" text DEFAULT 'AUD' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Debt Payments table
CREATE TABLE IF NOT EXISTS "debt_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"debt_id" uuid NOT NULL,
	"payment_date" timestamp NOT NULL,
	"payment_amount" numeric(15, 2) NOT NULL,
	"principal_amount" numeric(15, 2) NOT NULL,
	"interest_amount" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"fees_amount" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"from_account_id" uuid,
	"transaction_id" uuid,
	"balance_after_payment" numeric(15, 2) NOT NULL,
	"confirmation_number" text,
	"payment_method" text,
	"notes" text,
	"is_extra_payment" boolean DEFAULT false NOT NULL,
	"is_automated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Debt Strategies table
CREATE TABLE IF NOT EXISTS "debt_strategies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"strategy_type" text NOT NULL,
	"description" text,
	"extra_monthly_payment" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"extra_payment_frequency" text DEFAULT 'monthly' NOT NULL,
	"start_date" timestamp NOT NULL,
	"debt_priority_order" jsonb DEFAULT '[]'::jsonb,
	"consolidation_rate" numeric(5, 2),
	"consolidation_term_months" integer,
	"consolidated_debt_ids" jsonb,
	"is_active" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"projected_debt_free_date" timestamp,
	"total_interest_projected" numeric(15, 2),
	"total_payments_projected" numeric(15, 2),
	"months_to_debt_free" integer,
	"interest_saved_vs_minimum" numeric(15, 2),
	"last_calculated" timestamp,
	"calculation_params" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Debt Projections table
CREATE TABLE IF NOT EXISTS "debt_projections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"strategy_id" uuid NOT NULL,
	"debt_id" uuid NOT NULL,
	"projection_month" integer NOT NULL,
	"projection_date" timestamp NOT NULL,
	"projected_balance" numeric(15, 2) NOT NULL,
	"projected_payment" numeric(15, 2) NOT NULL,
	"projected_principal" numeric(15, 2) NOT NULL,
	"projected_interest" numeric(15, 2) NOT NULL,
	"cumulative_principal_paid" numeric(15, 2) NOT NULL,
	"cumulative_interest_paid" numeric(15, 2) NOT NULL,
	"is_paid_off" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Debt Milestones table
CREATE TABLE IF NOT EXISTS "debt_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"debt_id" uuid,
	"milestone_type" text NOT NULL,
	"milestone_name" text NOT NULL,
	"description" text,
	"target_date" timestamp,
	"target_balance" numeric(15, 2),
	"target_percent_paid" numeric(5, 2),
	"is_achieved" boolean DEFAULT false NOT NULL,
	"achieved_date" timestamp,
	"celebration_message" text,
	"icon_emoji" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Foreign key constraints
DO $$ BEGIN
 ALTER TABLE "debts" ADD CONSTRAINT "debts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "debts" ADD CONSTRAINT "debts_linked_account_id_accounts_id_fk" FOREIGN KEY ("linked_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "debts" ADD CONSTRAINT "debts_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_debt_id_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "public"."debts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_from_account_id_accounts_id_fk" FOREIGN KEY ("from_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "debt_strategies" ADD CONSTRAINT "debt_strategies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "debt_projections" ADD CONSTRAINT "debt_projections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "debt_projections" ADD CONSTRAINT "debt_projections_strategy_id_debt_strategies_id_fk" FOREIGN KEY ("strategy_id") REFERENCES "public"."debt_strategies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "debt_projections" ADD CONSTRAINT "debt_projections_debt_id_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "public"."debts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "debt_milestones" ADD CONSTRAINT "debt_milestones_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "debt_milestones" ADD CONSTRAINT "debt_milestones_debt_id_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "public"."debts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "debts_user_id_idx" ON "debts" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "debts_status_idx" ON "debts" USING btree ("status");
CREATE INDEX IF NOT EXISTS "debts_next_due_date_idx" ON "debts" USING btree ("next_due_date");
CREATE INDEX IF NOT EXISTS "debts_debt_type_idx" ON "debts" USING btree ("debt_type");
CREATE INDEX IF NOT EXISTS "debts_priority_idx" ON "debts" USING btree ("payoff_priority");

CREATE INDEX IF NOT EXISTS "debt_payments_user_id_idx" ON "debt_payments" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "debt_payments_debt_id_idx" ON "debt_payments" USING btree ("debt_id");
CREATE INDEX IF NOT EXISTS "debt_payments_payment_date_idx" ON "debt_payments" USING btree ("payment_date");
CREATE INDEX IF NOT EXISTS "debt_payments_extra_payment_idx" ON "debt_payments" USING btree ("is_extra_payment");

CREATE INDEX IF NOT EXISTS "debt_strategies_user_id_idx" ON "debt_strategies" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "debt_strategies_active_idx" ON "debt_strategies" USING btree ("is_active");
CREATE INDEX IF NOT EXISTS "debt_strategies_type_idx" ON "debt_strategies" USING btree ("strategy_type");

CREATE INDEX IF NOT EXISTS "debt_projections_user_id_idx" ON "debt_projections" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "debt_projections_strategy_id_idx" ON "debt_projections" USING btree ("strategy_id");
CREATE INDEX IF NOT EXISTS "debt_projections_debt_id_idx" ON "debt_projections" USING btree ("debt_id");
CREATE INDEX IF NOT EXISTS "debt_projections_month_idx" ON "debt_projections" USING btree ("projection_month");

CREATE INDEX IF NOT EXISTS "debt_milestones_user_id_idx" ON "debt_milestones" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "debt_milestones_debt_id_idx" ON "debt_milestones" USING btree ("debt_id");
CREATE INDEX IF NOT EXISTS "debt_milestones_achieved_idx" ON "debt_milestones" USING btree ("is_achieved");
CREATE INDEX IF NOT EXISTS "debt_milestones_target_date_idx" ON "debt_milestones" USING btree ("target_date");
