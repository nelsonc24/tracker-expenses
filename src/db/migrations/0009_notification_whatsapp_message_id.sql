ALTER TABLE "notifications" ADD COLUMN "whatsapp_message_id" text;--> statement-breakpoint
CREATE INDEX "notifications_whatsapp_message_id_idx" ON "notifications" USING btree ("whatsapp_message_id");