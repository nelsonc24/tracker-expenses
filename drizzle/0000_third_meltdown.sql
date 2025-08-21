CREATE TYPE "public"."account_type" AS ENUM('checking', 'savings', 'credit', 'investment');--> statement-breakpoint
CREATE TYPE "public"."color_scheme" AS ENUM('default', 'forest', 'sunset', 'ocean', 'monochrome');--> statement-breakpoint
CREATE TYPE "public"."import_status" AS ENUM('uploading', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."match_type" AS ENUM('contains', 'regex', 'amount', 'merchant');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."staging_status" AS ENUM('pending', 'processed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."theme_preference" AS ENUM('light', 'dark', 'auto');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"connection_id" uuid,
	"institution_id" uuid,
	"name" varchar(100) NOT NULL,
	"official_name" varchar(100),
	"mask" varchar(10),
	"type" "account_type" NOT NULL,
	"subtype" varchar(50),
	"currency" varchar(3) DEFAULT 'AUD' NOT NULL,
	"balance_current" bigint,
	"balance_available" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"period" varchar(20) DEFAULT 'monthly' NOT NULL,
	"category_id" uuid,
	"amount_minor" bigint NOT NULL,
	"rollover" boolean DEFAULT false NOT NULL,
	"start_month" varchar(7),
	"end_month" varchar(7),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"parent_id" uuid,
	"color" varchar(7),
	"icon" varchar(50),
	"is_system" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connections" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_item_id" varchar(100) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"consent_expires_at" timestamp with time zone,
	"scopes" jsonb,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "csv_imports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"filename" varchar(255) NOT NULL,
	"file_size" bigint NOT NULL,
	"status" "import_status" DEFAULT 'uploading' NOT NULL,
	"rows_total" integer,
	"rows_processed" integer DEFAULT 0 NOT NULL,
	"rows_failed" integer DEFAULT 0 NOT NULL,
	"bank_format_detected" varchar(50),
	"column_mappings" jsonb,
	"error_log" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "insights" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"data" jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"priority" "priority" DEFAULT 'medium' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institutions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"country_code" varchar(3) DEFAULT 'AUS' NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_institution_id" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"match_type" "match_type" NOT NULL,
	"predicate" text NOT NULL,
	"actions" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid,
	"connection_id" uuid,
	"posted_at" timestamp with time zone NOT NULL,
	"effective_at" timestamp with time zone,
	"description_raw" text NOT NULL,
	"description_clean" text,
	"merchant_name" varchar(200),
	"amount_minor" bigint NOT NULL,
	"currency" varchar(3) DEFAULT 'AUD' NOT NULL,
	"category_id" uuid,
	"hash_dedupe" varchar(64) NOT NULL,
	"is_transfer" boolean DEFAULT false NOT NULL,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"transfer_pair_id" uuid,
	"bank_category" varchar(100),
	"payment_type" varchar(50),
	"receipt_number" varchar(100),
	"bank_transaction_id" varchar(100),
	"from_account" varchar(100),
	"to_account" varchar(100),
	"notes" jsonb,
	"updated_by_rule_id" uuid,
	"manual_category_locked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"dashboard_layout" jsonb,
	"chart_preferences" jsonb,
	"notification_settings" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"image" text,
	"theme_preference" "theme_preference" DEFAULT 'auto',
	"color_scheme" "color_scheme" DEFAULT 'default',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csv_imports" ADD CONSTRAINT "csv_imports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insights" ADD CONSTRAINT "insights_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rules" ADD CONSTRAINT "rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;