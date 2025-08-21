CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"institution" text NOT NULL,
	"account_type" text NOT NULL,
	"account_number" text,
	"bsb" text,
	"balance" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"currency" text DEFAULT 'AUD' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_synced" timestamp,
	"connection_status" text DEFAULT 'disconnected' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"amount" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'AUD' NOT NULL,
	"period" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"category_ids" jsonb DEFAULT '[]'::jsonb,
	"account_ids" jsonb DEFAULT '[]'::jsonb,
	"alert_threshold" numeric(5, 2) DEFAULT '80.00',
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#6b7280' NOT NULL,
	"icon" text DEFAULT 'folder' NOT NULL,
	"parent_id" uuid,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"file_type" text NOT NULL,
	"bank_format" text,
	"status" text DEFAULT 'processing' NOT NULL,
	"total_rows" integer,
	"processed_rows" integer DEFAULT 0,
	"successful_rows" integer DEFAULT 0,
	"failed_rows" integer DEFAULT 0,
	"errors" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"account_id" uuid NOT NULL,
	"category_id" uuid,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'AUD' NOT NULL,
	"frequency" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"next_date" timestamp NOT NULL,
	"last_processed" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"auto_process" boolean DEFAULT false NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"account_id" uuid NOT NULL,
	"category_id" uuid,
	"amount" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'AUD' NOT NULL,
	"description" text NOT NULL,
	"merchant" text,
	"reference" text,
	"transaction_date" timestamp NOT NULL,
	"posting_date" timestamp,
	"balance" numeric(15, 2),
	"status" text DEFAULT 'cleared' NOT NULL,
	"type" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"location" jsonb,
	"original_data" jsonb,
	"duplicate_check_hash" text,
	"reconciled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"preferences" jsonb DEFAULT '{"currency":"AUD","theme":"system","notifications":true,"timezone":"Australia/Sydney"}'::jsonb,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_sessions" ADD CONSTRAINT "import_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "accounts_institution_idx" ON "accounts" USING btree ("institution");--> statement-breakpoint
CREATE INDEX "budgets_user_id_idx" ON "budgets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "budgets_period_idx" ON "budgets" USING btree ("period");--> statement-breakpoint
CREATE INDEX "budgets_start_date_idx" ON "budgets" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "categories_user_id_idx" ON "categories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "categories_parent_id_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "import_sessions_user_id_idx" ON "import_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "import_sessions_status_idx" ON "import_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "import_sessions_created_at_idx" ON "import_sessions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "recurring_transactions_user_id_idx" ON "recurring_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recurring_transactions_account_id_idx" ON "recurring_transactions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "recurring_transactions_next_date_idx" ON "recurring_transactions" USING btree ("next_date");--> statement-breakpoint
CREATE INDEX "recurring_transactions_active_idx" ON "recurring_transactions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "transactions_user_id_idx" ON "transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_account_id_idx" ON "transactions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "transactions_category_id_idx" ON "transactions" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "transactions_transaction_date_idx" ON "transactions" USING btree ("transaction_date");--> statement-breakpoint
CREATE INDEX "transactions_amount_idx" ON "transactions" USING btree ("amount");--> statement-breakpoint
CREATE INDEX "transactions_merchant_idx" ON "transactions" USING btree ("merchant");--> statement-breakpoint
CREATE INDEX "transactions_status_idx" ON "transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "transactions_duplicate_hash_idx" ON "transactions" USING btree ("duplicate_check_hash");