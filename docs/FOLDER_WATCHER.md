# API tokens, `/api/ingest` and the folder watcher

Drop a bank export into a folder and it is imported without opening the app.

## 1. Create an API token

Settings > Data > **API tokens** > name it > Create. The token (`txk_...`) is shown **once**; only its SHA-256 hash is stored (`api_tokens`, migration `0010`). Revoke it from the same card. A token can only upload files to the owner's own accounts.

## 2. `POST /api/ingest`

Multipart form: `file` (csv/pdf/json, max 10 MB), `accountId`, optional `bankFormat` (omit to auto-detect).
Auth: `Authorization: Bearer txk_...` or a Clerk session. A bearer header that is wrong is rejected (it never falls back to the session).
It calls `ingest()` with `source: 'api'`, so the import shows in `import_sessions` like any other.

```bash
curl -H "Authorization: Bearer $INGEST_TOKEN" \
  -F file=@statement.csv -F accountId=<account uuid> \
  https://your-app.vercel.app/api/ingest
```

Response: `{ success, sessionId, inserted, duplicates, needsReview, errors }`.
Status codes: 401 bad/missing auth, 400 bad input, 403 account not yours, 413 too big, 422 could not parse, 500 server error.

## 3. Folder watcher (`scripts/watch-imports.ts`)

Polls a folder (default `~/Downloads/bank-imports/`). A new `.csv` or `.pdf` that has not been written to for 3 seconds is POSTed to `/api/ingest`, then moved to `processed/` or `failed/` (with a timestamp prefix; failures get a `.error.txt` note). Network errors and 5xx responses leave the file in place and retry on the next poll.

Config: env vars, optionally merged under a JSON file pointed to by `WATCH_CONFIG` (env wins).

| Setting | Meaning |
| --- | --- |
| `INGEST_URL` | e.g. `https://your-app.vercel.app/api/ingest` |
| `INGEST_TOKEN` | the `txk_...` token |
| `WATCH_DIR` | folder to watch (default `~/Downloads/bank-imports`) |
| `accounts` (JSON file only) | filename pattern → account id. A pattern is a case-insensitive substring, or `/regex/`. First match wins |
| `INGEST_ACCOUNT_ID` / `defaultAccountId` | used when no pattern matches (otherwise the file goes to `failed/`) |
| `INGEST_BANK_FORMAT` / `bankFormat` | force a CSV format instead of auto-detect |
| `WATCH_POLL_MS`, `WATCH_SETTLE_MS` | poll interval (5000) and "file is still being written" window (3000) |

`~/.config/tracker-expenses/watch.json`:

```json
{
  "INGEST_URL": "https://your-app.vercel.app/api/ingest",
  "accounts": {
    "commbank": "00000000-0000-0000-0000-000000000001",
    "/^anz.*visa/": "00000000-0000-0000-0000-000000000002",
    "latitude": "00000000-0000-0000-0000-000000000003"
  }
}
```

Keep the token out of the file: put it in the launchd plist or your shell (`INGEST_TOKEN`).

Run it by hand:

```bash
INGEST_TOKEN=txk_... WATCH_CONFIG=~/.config/tracker-expenses/watch.json pnpm tsx scripts/watch-imports.ts
```

### Start at login (macOS launchd)

Save as `~/Library/LaunchAgents/com.tracker-expenses.watch.plist` (fix the paths; find `pnpm` with `which pnpm`):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.tracker-expenses.watch</string>
  <key>ProgramArguments</key>
  <array>
    <string>/opt/homebrew/bin/pnpm</string>
    <string>tsx</string>
    <string>scripts/watch-imports.ts</string>
  </array>
  <key>WorkingDirectory</key><string>/Users/YOU/path/to/tracker-expenses</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>INGEST_TOKEN</key><string>txk_...</string>
    <key>WATCH_CONFIG</key><string>/Users/YOU/.config/tracker-expenses/watch.json</string>
    <key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/tmp/tracker-watch.log</string>
  <key>StandardErrorPath</key><string>/tmp/tracker-watch.log</string>
</dict>
</plist>
```

```bash
launchctl load ~/Library/LaunchAgents/com.tracker-expenses.watch.plist
```

Stop it with `launchctl unload` on the same file. The plist holds the token, so keep it readable only by you (`chmod 600`).

## Not verified end to end

No real upload through the deployed route, no real launchd run, and migration `0010` has not been applied to any database.
