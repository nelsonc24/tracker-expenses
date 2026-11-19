# Ingest Pipeline (Phase 1: 1.1–1.6)

Part of `IMPORT_AUTOMATION_AND_WHATSAPP_DEV_PLAN.md`.

## What changed
- **Vitest** (`pnpm test`). Config in `vitest.config.mts`, `@/` alias. `tests/budget-period.test.ts` needs a live DB and is excluded from the default run.
- **`src/lib/ingest/`** is the single path from a file to saved transactions:
  - `parse.ts` – `parseUploadedFile()` (CSV / PDF / JSON → `TransactionData[]`).
  - `dedup.ts` – hashing + duplicate decisions.
  - `store.ts` – `IngestStore` interface + Drizzle implementation (swap for an in-memory store in tests, see `tests/helpers/memory-store.ts`).
  - `index.ts` – `ingest()` (file → saved) and `importTransactions()` (already-parsed rows → saved). Writes an `import_sessions` row with `source` and `needs_review_count`.
- `POST /api/transactions/import` and `POST /api/transactions/parse-file` are thin wrappers. The `/import` page still parses CSVs in the browser for its preview, then posts rows to the import route.
- **CSV auto-detect:** `detectBankFormat(headers, firstRows)` in `csv-processing.ts` returns `{ format, confidence }`. Below `MIN_DETECTION_CONFIDENCE` (0.8) the server path refuses (`parse_failed`) and the page keeps its old CommBank default.
- **Dedup fix:** identical same-day rows (no bank transaction id) get an occurrence index: 1st keeps the legacy hash, nth gets `-n`. Existing rows still match; re-importing a file inserts 0.

## Migration
`src/db/migrations/0006_import_session_source.sql` adds `import_sessions.source` and `needs_review_count`. Not yet run anywhere. The raw drizzle-kit output also contained CREATE TABLEs for tables that already exist (stale snapshot); those were removed by hand.

## Known gaps (not fixed here)
- ~~Westpac dates~~ and ~~browser preview header rows~~: fixed on `feat/rules-and-reminders` (both formats accepted; preview uses `formatHasHeaderRow`).
- The old import route's "update account balance from latest row" code never ran (it read `balance` from rows that don't carry it); it was dropped rather than moved.

## PDF fallback (1.4)
`parseUploadedFile` tries the Latitude regex parser first. If it throws or finds no transactions, it calls Gemini (`src/lib/ingest/ai-pdf.ts`, `generateObject` + zod schema, PDF sent as a file part) using the user's **own** key (`users.geminiApiKey`, model from `preferences.geminiModel`, default `gemini-2.5-flash`). No key = a clear `parse_failed` error ("Add your Gemini API key in Settings").

The result is checked: `opening + Σ(amount) ≈ closing` (±0.01), trying both sign conventions (card balance owed: `opening − Σ`; deposit account: `opening + Σ`). On failure the import still saves, every row is flagged needs-review, the reason is recorded on the import session `errors`, and the import page shows an alert. Rows with unreadable dates are dropped and also fail the check.

## Needs review (1.6)
`transactions.needs_review` (migration `0007`). Set when: a parser is unsure (AI balance check failed), the category is unmatched or generic (`General` / `Uncategorized`), or a row is the 2nd+ identical row (possible duplicate). `import_sessions.needs_review_count` holds the total. The transactions page has a **Review** filter and a "Needs review" badge on each row; clicking the badge marks it reviewed (`PUT /api/transactions/:id { needsReview: false }`).

Note: because many CSV rows categorise to "General", expect a lot of flagged rows on first imports; that is intended (they're uncategorised).

Other entry points: `POST /api/ingest` (API token or session, `source: 'api'`) and the folder watcher are described in [FOLDER_WATCHER.md](./FOLDER_WATCHER.md).
