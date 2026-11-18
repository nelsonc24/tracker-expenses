# Category rules, import summary, missing-statement reminder (Phase 3: 3.1–3.3)

Part of `IMPORT_AUTOMATION_AND_WHATSAPP_DEV_PLAN.md`.

## 3.1 Category rules
- **Table** `category_rules` (`id, user_id, match_type, pattern, category_id, priority, created_from, created_at`).
  - `match_type`: `contains` (description or merchant contains, case/whitespace-insensitive), `merchant` (merchant name equals), `regex` (case-insensitive, on the first 300 chars of the description).
  - Higher `priority` wins; ties go to the newest rule. `created_from`: `manual` | `learned`.
- **Shared categoriser** `src/lib/categorise/` used by `importTransactions()` (so by `ingest()` and the upload route):
  1. user rules → 2. the parser's category if it is one of the user's (non-generic) categories → 3. keyword fallback `keywordCategory()` → 4. default category + `needsReview`.
  - The hard-coded `categorizeTransaction()` in `pdf-processing.ts` is gone. PDF rows use `keywordCategory()` (the CSV keyword list plus the two card rules that were PDF-only: repayments → `Payment`, fees/interest → `Fees & Services`). Other PDF-only names (`Dining`, `Utilities`, `Refund`, `Fees & Charges`) now follow the CSV names.
  - If rules can't be loaded (e.g. the migration hasn't run yet) the import continues without them.
- **Optional AI step** `suggestCategoriesWithAI()` (`src/lib/categorise/ai-suggest.ts`): for rows still uncategorised, one batched Gemini call (max 100 rows, 20 s timeout) with the user's own encrypted key, restricted to the user's category names. Rows stay `needsReview = true`. No key = skipped; any failure is logged and ignored.
- **Pattern safety:** max 100 chars; invalid regexes, nested quantifiers like `(a+)+` and back-references are rejected on save, and skipped (not thrown) at import time.
- **API:** `GET/POST /api/category-rules`, `DELETE /api/category-rules/:id`. POST with an existing `match_type + pattern` updates that rule. Max 500 rules per user.
- **UI:** after changing a transaction's category, a toast offers **Always** (creates a `learned` rule: merchant match when there is a merchant, else description contains). Settings → Categories lists rules with delete.
- Rules apply to **future imports only**; existing transactions are not re-categorised.

## 3.2 Import summary
`importTransactions()` ends with `notify(userId, { type: 'import_summary', accountName, inserted, needsReview })`. Errors are caught and logged; the import never fails because of it. Not sent when the insert itself fails.

## 3.3 Missing-statement reminder
`GET /api/cron/check-reminders` also runs `checkMissingStatements()` (`src/lib/statement-reminders.ts`).
- Threshold: `notification_preferences.statement_reminder_days` (default 35; API accepts 7–365).
- "Last import" = newest transaction on the account created by the import pipeline (`duplicate_check_hash` set). Accounts never imported into, and inactive accounts, are skipped.
- De-dup: a delivered reminder is stored in `notifications` (`notification_type = 'statement_missing'`, `related_entity_type = 'account'`). Next reminder only after another full period, or after a new import followed by a new gap. Undelivered attempts (quiet hours, no channel) are not stored and retry the next day.

## Migration
`src/db/migrations/pending/category_rules.sql` (hand-written; the drizzle-kit snapshot is stale). **Not run anywhere.** Run it before deploying: Drizzle selects every column of `notification_preferences`, so the new column must exist first.

## Known limits
- Email and Telegram have no templates for `import_summary` / `statement_missing` yet, so `notify()` reports them `unsupported` there; they are delivered once a channel (e.g. WhatsApp, plan 5.2) supports them.
- No UI input for `statement_reminder_days` yet (settable through `POST /api/notifications/preferences`).
