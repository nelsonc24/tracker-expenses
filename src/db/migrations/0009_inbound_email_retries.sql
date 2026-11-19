ALTER TABLE "inbound_emails" ADD COLUMN "sender_email" text;--> statement-breakpoint
ALTER TABLE "inbound_emails" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;