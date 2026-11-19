# Folder Watcher + Ingest API (Phase 2.1 / 2.3)

Part of `IMPORT_AUTOMATION_AND_WHATSAPP_DEV_PLAN.md`.

Drop a bank CSV or PDF statement into a folder on your Mac and it is imported automatically. No bank passwords are stored or used anywhere: you still download the statement yourself.

```
~/Downloads/bank-imports/CSVData.csv
        │  scripts/watch-imports.ts (waits until the file stops changing)
        ▼
POST /api/ingest   Authorization: Bearer trk_...
        │  ingest() with source 'api'
        ▼
import_sessions + transactions      file moved to processed/ (or failed/)
```

## 1. Personal API tokens

**Settings → Data → API Tokens.** Give the token a name (e.g. "MacBook folder watcher") and copy it. It is shown **once**.

- Format: `trk_` + 43 random characters (32 crypto-random bytes).
- Only a SHA-256 hash is stored (`api_tokens.token_hash`). Nobody can recover a lost token: revoke it and create a new one.
- Revoking sets `revoked_at`; the token stops working immediately.
- "Last used" is updated each time the token authenticates.
- Up to 20 active tokens per user.
- Tokens only work on `POST /api/ingest`. They can't create or list tokens or reach any other route.

Endpoints (Clerk session only): `GET /api/api-tokens`, `POST /api/api-tokens { name }`, `DELETE /api/api-tokens/:id`.

**Migration:** `src/db/migrations/0010_import_automation.sql` (apply with `pnpm db:migrate`). Not yet run anywhere. Apply it before using tokens.

## 2. `POST /api/ingest`

| Field | |
|---|---|
| `file` | `.csv` or `.pdf`, max 10 MB |
| `accountId` | UUID of one of **your** accounts |
| `bankFormat` | optional, CSV only: `commonwealth`, `westpac`, `anz`, `nab`, `ubank`, `latitud`, `creditcard`, `custom`, or `auto` (default) |

Auth: `Authorization: Bearer trk_...` **or** a normal Clerk session. A bad `trk_` token is always rejected; it never falls back to the session.

```bash
curl -X POST https://your-app.vercel.app/api/ingest \
  -H "Authorization: Bearer $INGEST_TOKEN" \
  -F file=@CSVData.csv -F accountId=<account-uuid>
```

Responses: `200 { success, sessionId, inserted, duplicates, needsReview, totalProcessed, errors }`, `400` invalid input, `401` bad/revoked token, `403` not your account, `413` too large, `422` file couldn't be parsed.

> **Vercel limit:** Vercel functions accept request bodies up to about 4.5 MB, so on the deployed app the real limit is lower than 10 MB. Bank CSVs and statements are normally well below that.

## 3. Folder watcher

```bash
pnpm watch-imports
```

### Config

Environment variables (from the shell, `.env.local` or `.env` in the repo) override the JSON file.

| Env var | JSON key | Default | |
|---|---|---|---|
| `INGEST_URL` | `url` | (required) | Full endpoint URL. Must be `https` (http only for localhost). |
| `INGEST_TOKEN` | `token` | (required) | The `trk_` token. |
| `INGEST_WATCH_DIR` | `watchDir` | `~/Downloads/bank-imports` | Created if missing. |
| `INGEST_DEFAULT_ACCOUNT_ID` | `defaultAccountId` | none | Used when no pattern matches. |
| `INGEST_SETTLE_MS` | `settleMs` | `2000` | File must stop changing for this long before upload. |
| `INGEST_POLL_INTERVAL_MS` | `pollIntervalMs` | `60000` | Rescan (catches missed events, retries temporary failures). |
| `INGEST_CONFIG` | | `~/.config/tracker-expenses/watch-imports.json` | Path of the JSON file. |

The filename → account map lives in the JSON file (see `scripts/watch-imports.example.json`):

```json
{
  "accounts": [
    { "pattern": "CSVData*.csv", "accountId": "<commbank-account-uuid>", "bankFormat": "commonwealth" },
    { "pattern": "/^latitude.*\\.pdf$/i", "accountId": "<latitude-account-uuid>" }
  ]
}
```

- `pattern` is a glob matched against the whole file name, case-insensitive (`*` = anything, `?` = one character), or a regex written as `/pattern/flags`.
- The first matching rule wins. With no match and no `defaultAccountId`, the file goes to `failed/`.
- Account UUIDs: open the account in the app (or `select id, name from accounts`).

If the JSON file contains the token, keep it private: `chmod 600 ~/.config/tracker-expenses/watch-imports.json`. The watcher warns if other users can read it.

### Behaviour

- On start it uploads anything already in the folder, then watches for new files.
- Only `.csv` / `.pdf`. Hidden files and partial downloads (`.crdownload`, `.download`, `.part`) are ignored until the browser renames them.
- Success → `processed/`. Rejected by the server (4xx, e.g. unparseable, wrong account) or no matching rule → `failed/`. Network errors / 5xx are retried on the next scan, then moved to `failed/` after 5 attempts.
- If a file with the same name already exists in `processed/` or `failed/`, a timestamp is added (`CSVData-20261119-093000.csv`).
- Re-importing the same statement is safe: the server dedupes, so it reports `0 new`.
- The token is never written to the log.

## 4. Start at login with launchd (macOS)

1. Find absolute paths: `which node` and the repo path (e.g. `/Users/you/Developer/nextjs/tracker-expenses`). launchd doesn't load your shell `PATH`, so use absolute paths.
2. Put `INGEST_URL` / `INGEST_TOKEN` in the repo's `.env.local` or in the JSON config file (not in the plist, which other tools may read).
3. Save this as `~/Library/LaunchAgents/com.tracker-expenses.watch-imports.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.tracker-expenses.watch-imports</string>

  <key>WorkingDirectory</key>
  <string>/Users/you/Developer/nextjs/tracker-expenses</string>

  <key>ProgramArguments</key>
  <array>
    <string>/opt/homebrew/bin/node</string>
    <string>node_modules/tsx/dist/cli.mjs</string>
    <string>scripts/watch-imports.ts</string>
  </array>

  <key>RunAtLoad</key>
  <true/>
  <!-- Restart if it crashes, but not if it exits cleanly (e.g. config error) -->
  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key>
    <false/>
  </dict>
  <key>ThrottleInterval</key>
  <integer>30</integer>

  <key>StandardOutPath</key>
  <string>/Users/you/Library/Logs/tracker-watch-imports.log</string>
  <key>StandardErrorPath</key>
  <string>/Users/you/Library/Logs/tracker-watch-imports.log</string>
</dict>
</plist>
```

Note: a config error exits with code 1, so `KeepAlive` will retry it every 30 s. Check the log if it keeps restarting.

4. Load it, check it, and read the log:

```bash
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.tracker-expenses.watch-imports.plist
launchctl print gui/$(id -u)/com.tracker-expenses.watch-imports | grep state
tail -f ~/Library/Logs/tracker-watch-imports.log
```

To stop it: `launchctl bootout gui/$(id -u)/com.tracker-expenses.watch-imports`. After editing the plist, bootout and bootstrap again.

**macOS privacy (TCC):** `~/Downloads` is a protected folder. The first time, macOS may block `node` from reading it, and a background agent can't show the prompt. If the log shows `EPERM` / `operation not permitted`, either give `node` access in **System Settings → Privacy & Security → Files and Folders** (or Full Disk Access), or point `INGEST_WATCH_DIR` at an unprotected folder such as `~/bank-imports`.

## Not done / known gaps

- Not tested against the deployed app or a real database yet (the migration hasn't been run). The watcher was smoke-tested against a local fake server.
- No rate limiting on `/api/ingest`. It needs a valid token or session, but a leaked token could be used to upload repeatedly until it is revoked.
