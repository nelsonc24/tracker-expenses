CREATE TABLE "bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"account_id" uuid NOT NULL,
	"category_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"amount" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'AUD' NOT NULL,
	"frequency" text NOT NULL,
	"due_day" integer,
	"due_date" timestamp,
	"last_paid_date" timestamp,
	"last_paid_amount" numeric(15, 2),
	"reminder_days" integer DEFAULT 3,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_auto_pay" boolean DEFAULT false NOT NULL,
	"notes" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "is_bill" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "bill_id" uuid;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bills_user_id_idx" ON "bills" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bills_account_id_idx" ON "bills" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "bills_due_date_idx" ON "bills" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "bills_active_idx" ON "bills" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "bills_frequency_idx" ON "bills" USING btree ("frequency");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transactions_is_bill_idx" ON "transactions" USING btree ("is_bill");--> statement-breakpoint
CREATE INDEX "transactions_bill_id_idx" ON "transactions" USING btree ("bill_id");