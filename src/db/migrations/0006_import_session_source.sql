-- Import pipeline: record where an import came from and how many rows need review.
--
-- NOTE: drizzle-kit generated this against a stale snapshot (src/db/migrations/meta only
-- covered the first tables; later tables were applied from /drizzle/*.sql), so the raw output
-- also contained CREATE TABLE/ALTER statements for tables that already exist. Those were
-- removed by hand; only the import_sessions changes below are new. The 0006 snapshot is the
-- full current schema, so future `pnpm db:generate` runs diff cleanly from here.
ALTER TABLE "import_sessions" ADD COLUMN "source" text DEFAULT 'upload' NOT NULL;--> statement-breakpoint
ALTER TABLE "import_sessions" ADD COLUMN "needs_review_count" integer DEFAULT 0 NOT NULL;
