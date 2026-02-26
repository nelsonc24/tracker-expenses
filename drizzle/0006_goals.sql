-- Migration: Add goals and goal_contributions tables
-- Supports saving goals with optional recurring targets and ad-hoc contributions

CREATE TABLE "goals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "emoji" text DEFAULT '🎯' NOT NULL,
  "type" text DEFAULT 'custom' NOT NULL,
  "color" text DEFAULT '#6366f1' NOT NULL,
  "target_amount" numeric(15, 2) NOT NULL,
  "current_amount" numeric(15, 2) DEFAULT '0.00' NOT NULL,
  "currency" text DEFAULT 'AUD' NOT NULL,
  "save_frequency" text,
  "save_amount" numeric(15, 2),
  "target_date" timestamp,
  "status" text DEFAULT 'active' NOT NULL,
  "completed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "goals_user_id_idx" ON "goals" ("user_id");
CREATE INDEX "goals_status_idx" ON "goals" ("status");

CREATE TABLE "goal_contributions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "goal_id" uuid NOT NULL REFERENCES "goals"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL,
  "amount" numeric(15, 2) NOT NULL,
  "note" text,
  "contributed_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "goal_contributions_goal_id_idx" ON "goal_contributions" ("goal_id");
CREATE INDEX "goal_contributions_user_id_idx" ON "goal_contributions" ("user_id");
