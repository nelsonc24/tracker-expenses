-- Migration: Add Telegram notification columns to notification_preferences
-- Replaces the earlier Instagram columns design with Telegram Bot API approach.

ALTER TABLE "notification_preferences"
  ADD COLUMN IF NOT EXISTS "telegram_notifications_enabled" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "telegram_chat_id" text;
