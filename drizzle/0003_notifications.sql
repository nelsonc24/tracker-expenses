-- Notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"notification_type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"channel" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"read_at" timestamp,
	"related_entity_type" text,
	"related_entity_id" uuid,
	"email_to" text,
	"email_subject" text,
	"email_message_id" text,
	"metadata" jsonb,
	"error_count" integer DEFAULT 0 NOT NULL,
	"last_error_message" text,
	"last_error_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action
);

-- Notification Preferences table
CREATE TABLE IF NOT EXISTS "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"email_notifications_enabled" boolean DEFAULT true NOT NULL,
	"push_notifications_enabled" boolean DEFAULT false NOT NULL,
	"bill_reminders_enabled" boolean DEFAULT true NOT NULL,
	"bill_reminder_days_before" integer DEFAULT 3 NOT NULL,
	"bill_reminder_channel" text DEFAULT 'email' NOT NULL,
	"debt_reminders_enabled" boolean DEFAULT true NOT NULL,
	"debt_reminder_days_before" integer DEFAULT 3 NOT NULL,
	"debt_reminder_channel" text DEFAULT 'email' NOT NULL,
	"budget_alerts_enabled" boolean DEFAULT true NOT NULL,
	"budget_alert_threshold" integer DEFAULT 80 NOT NULL,
	"budget_alert_channel" text DEFAULT 'email' NOT NULL,
	"digest_frequency" text DEFAULT 'daily' NOT NULL,
	"quiet_hours_start" text,
	"quiet_hours_end" text,
	"preferred_email" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "notification_preferences_user_id_unique" UNIQUE("user_id")
);

-- Indexes for notifications table
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "notifications_type_idx" ON "notifications" ("notification_type");
CREATE INDEX IF NOT EXISTS "notifications_status_idx" ON "notifications" ("status");
CREATE INDEX IF NOT EXISTS "notifications_channel_idx" ON "notifications" ("channel");
CREATE INDEX IF NOT EXISTS "notifications_related_entity_idx" ON "notifications" ("related_entity_type","related_entity_id");
CREATE INDEX IF NOT EXISTS "notifications_sent_at_idx" ON "notifications" ("sent_at");
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications" ("created_at");

-- Indexes for notification_preferences table
CREATE INDEX IF NOT EXISTS "notification_preferences_user_id_idx" ON "notification_preferences" ("user_id");
