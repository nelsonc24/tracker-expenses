-- Add transaction_alerts_enabled and unusual_spending_enabled columns to notification_preferences
ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "transaction_alerts_enabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "unusual_spending_enabled" boolean DEFAULT true NOT NULL;
