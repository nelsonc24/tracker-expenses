-- Phase 3.1 / 3.3 (feat/rules-and-reminders). Hand-written: the drizzle-kit snapshot in
-- meta/ is stale, so this was NOT generated. Not yet run against any database.
-- Fold into a numbered migration once the parallel schema work has landed.

CREATE TABLE IF NOT EXISTS "category_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"match_type" text NOT NULL,
	"pattern" text NOT NULL,
	"category_id" uuid NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_from" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "category_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "category_rules_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "category_rules_user_id_idx" ON "category_rules" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "statement_reminder_days" integer DEFAULT 35 NOT NULL;
