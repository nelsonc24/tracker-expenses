-- Migration: Add budget period tracking and auto-reset functionality
-- Created: 2025-10-01

-- Step 1: Add new columns to budgets table for auto-reset functionality
ALTER TABLE "budgets" ADD COLUMN "is_recurring" boolean DEFAULT true NOT NULL;
ALTER TABLE "budgets" ADD COLUMN "current_period_start" timestamp;
ALTER TABLE "budgets" ADD COLUMN "current_period_end" timestamp;
ALTER TABLE "budgets" ADD COLUMN "next_reset_date" timestamp;
ALTER TABLE "budgets" ADD COLUMN "auto_reset_enabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "budgets" ADD COLUMN "reset_day" integer DEFAULT 1;
ALTER TABLE "budgets" ADD COLUMN "rollover_unused" boolean DEFAULT false NOT NULL;
ALTER TABLE "budgets" ADD COLUMN "rollover_limit" numeric(15, 2);
ALTER TABLE "budgets" ADD COLUMN "rollover_strategy" text DEFAULT 'none' NOT NULL;
ALTER TABLE "budgets" ADD COLUMN "rollover_percentage" integer;

-- Step 2: Create budget_periods table
CREATE TABLE "budget_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"budget_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"allocated_amount" numeric(15, 2) NOT NULL,
	"rollover_amount" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"total_budget" numeric(15, 2) NOT NULL,
	"spent_amount" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"remaining_amount" numeric(15, 2),
	"status" text NOT NULL,
	"utilization_percentage" numeric(5, 2),
	"transaction_count" integer DEFAULT 0 NOT NULL,
	"average_daily_spend" numeric(15, 2),
	"peak_spending_day" timestamp,
	"period_label" text NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint

-- Step 3: Add foreign key constraints
ALTER TABLE "budget_periods" ADD CONSTRAINT "budget_periods_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "budget_periods" ADD CONSTRAINT "budget_periods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Step 4: Create indexes for budget_periods
CREATE INDEX "budget_periods_budget_id_idx" ON "budget_periods" ("budget_id");
--> statement-breakpoint
CREATE INDEX "budget_periods_user_id_idx" ON "budget_periods" ("user_id");
--> statement-breakpoint
CREATE INDEX "budget_periods_period_idx" ON "budget_periods" ("period_start","period_end");
--> statement-breakpoint
CREATE INDEX "budget_periods_status_idx" ON "budget_periods" ("status");
--> statement-breakpoint

-- Step 5: Create index for budgets next_reset_date
CREATE INDEX "budgets_next_reset_idx" ON "budgets" ("next_reset_date");
--> statement-breakpoint

-- Step 6: Update existing budgets with current period tracking
UPDATE "budgets" SET
  "current_period_start" = "start_date",
  "current_period_end" = COALESCE("end_date", 
    CASE "period"
      WHEN 'weekly' THEN "start_date" + INTERVAL '1 week'
      WHEN 'monthly' THEN "start_date" + INTERVAL '1 month'
      WHEN 'quarterly' THEN "start_date" + INTERVAL '3 months'
      WHEN 'yearly' THEN "start_date" + INTERVAL '1 year'
      ELSE "start_date" + INTERVAL '1 month'
    END
  ),
  "next_reset_date" = CASE "period"
    WHEN 'weekly' THEN "start_date" + INTERVAL '1 week'
    WHEN 'monthly' THEN "start_date" + INTERVAL '1 month'
    WHEN 'quarterly' THEN "start_date" + INTERVAL '3 months'
    WHEN 'yearly' THEN "start_date" + INTERVAL '1 year'
    ELSE "start_date" + INTERVAL '1 month'
  END
WHERE "current_period_start" IS NULL;
--> statement-breakpoint

-- Step 7: Backfill budget_periods with initial period for existing budgets
INSERT INTO "budget_periods" (
  "budget_id",
  "user_id",
  "period_start",
  "period_end",
  "allocated_amount",
  "rollover_amount",
  "total_budget",
  "spent_amount",
  "status",
  "period_label",
  "created_at"
)
SELECT 
  b."id",
  b."user_id",
  b."start_date",
  COALESCE(b."end_date", 
    CASE b."period"
      WHEN 'weekly' THEN b."start_date" + INTERVAL '1 week'
      WHEN 'monthly' THEN b."start_date" + INTERVAL '1 month'
      WHEN 'quarterly' THEN b."start_date" + INTERVAL '3 months'
      WHEN 'yearly' THEN b."start_date" + INTERVAL '1 year'
      ELSE b."start_date" + INTERVAL '1 month'
    END
  ),
  b."amount",
  0.00,
  b."amount",
  0.00,
  CASE 
    WHEN b."end_date" IS NULL OR b."end_date" >= NOW() THEN 'active'
    ELSE 'completed'
  END,
  CASE b."period"
    WHEN 'weekly' THEN 'Week of ' || TO_CHAR(b."start_date", 'Mon DD, YYYY')
    WHEN 'monthly' THEN TO_CHAR(b."start_date", 'Month YYYY')
    WHEN 'quarterly' THEN 'Q' || TO_CHAR(b."start_date", 'Q YYYY')
    WHEN 'yearly' THEN TO_CHAR(b."start_date", 'YYYY')
    ELSE TO_CHAR(b."start_date", 'Mon DD, YYYY')
  END,
  NOW()
FROM "budgets" b
WHERE NOT EXISTS (
  SELECT 1 FROM "budget_periods" bp 
  WHERE bp."budget_id" = b."id"
);
--> statement-breakpoint

-- Step 8: Add check constraints
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_rollover_strategy_check" 
  CHECK ("rollover_strategy" IN ('full', 'partial', 'capped', 'none'));
--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_rollover_percentage_check" 
  CHECK ("rollover_percentage" IS NULL OR ("rollover_percentage" >= 0 AND "rollover_percentage" <= 100));
--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_reset_day_check" 
  CHECK ("reset_day" IS NULL OR ("reset_day" >= 1 AND "reset_day" <= 31));
--> statement-breakpoint
ALTER TABLE "budget_periods" ADD CONSTRAINT "budget_periods_status_check" 
  CHECK ("status" IN ('active', 'completed', 'future', 'cancelled'));
