CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"budget_amount" numeric(15, 2),
	"budget_period" text DEFAULT 'yearly' NOT NULL,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"color" text DEFAULT '#6b7280' NOT NULL,
	"icon" text DEFAULT 'activity' NOT NULL,
	"commitment_type" text,
	"frequency" text,
	"location" text,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"budget_amount" numeric(15, 2) NOT NULL,
	"spent_amount" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"transaction_count" integer DEFAULT 0 NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_activities" (
	"transaction_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"assigned_by" text DEFAULT 'user' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" DROP CONSTRAINT "categories_parent_id_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_budgets" ADD CONSTRAINT "activity_budgets_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_activities" ADD CONSTRAINT "transaction_activities_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_activities" ADD CONSTRAINT "transaction_activities_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_user_id_idx" ON "activities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activities_name_idx" ON "activities" USING btree ("name");--> statement-breakpoint
CREATE INDEX "activities_category_idx" ON "activities" USING btree ("category");--> statement-breakpoint
CREATE INDEX "activities_active_idx" ON "activities" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "activities_user_name_idx" ON "activities" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "activity_budgets_activity_id_idx" ON "activity_budgets" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "activity_budgets_period_idx" ON "activity_budgets" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX "activity_budgets_unique_period_idx" ON "activity_budgets" USING btree ("activity_id","period_start","period_end");--> statement-breakpoint
CREATE INDEX "transaction_activities_pk" ON "transaction_activities" USING btree ("transaction_id","activity_id");--> statement-breakpoint
CREATE INDEX "transaction_activities_transaction_idx" ON "transaction_activities" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "transaction_activities_activity_idx" ON "transaction_activities" USING btree ("activity_id");