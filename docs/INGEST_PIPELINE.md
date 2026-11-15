# Ingest Pipeline (Phase 1: 1.1, 1.2, 1.3, 1.5)

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
- Westpac format says `DD MMM YYYY` but real exports use `DD/MM/YYYY`, so Westpac dates fail to parse.
- In the browser preview path, formats without `skipRows` (westpac, anz, nab) treat the header as a data row. The server path handles headers correctly.
- The old import route's "update account balance from latest row" code never ran (it read `balance` from rows that don't carry it); it was dropped rather than moved.
