CREATE TABLE "activity_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"subcategory" text,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_line_items" ADD CONSTRAINT "activity_line_items_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_line_items" ADD CONSTRAINT "activity_line_items_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_line_items_transaction_id_idx" ON "activity_line_items" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "activity_line_items_activity_id_idx" ON "activity_line_items" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "activity_line_items_subcategory_idx" ON "activity_line_items" USING btree ("subcategory");--> statement-breakpoint
CREATE INDEX "activity_line_items_transaction_activity_idx" ON "activity_line_items" USING btree ("transaction_id","activity_id");