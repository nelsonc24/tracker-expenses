# Email Ingestion (Phase 2.2)

Part of `IMPORT_AUTOMATION_AND_WHATSAPP_DEV_PLAN.md`.

Forward a bank statement email (or let a Gmail filter do it) to the app's import address. CSV and PDF attachments from **approved senders** are imported into the mapped account through `ingest()` with `source: 'email'`, which creates a normal import session.

## How it works
1. **Resend Inbound** receives the mail and POSTs an `email.received` webhook to `POST /api/webhooks/inbound-email`. The webhook carries metadata only (no body, no attachment content).
2. The route verifies the **Svix signature on the raw body** (`RESEND_WEBHOOK_SECRET`). Unsigned → 400, bad signature → 401.
3. The From address is looked up in `import_senders`. Unknown sender → ignored (200 with `status: 'rejected'`, so spam can't trigger retries or get the endpoint disabled).
4. The email id is **claimed** in `inbound_emails` (unique on provider + email id, and the same Message-ID is also treated as a duplicate). A re-delivered webhook gets `status: 'duplicate'` and nothing is imported twice.
5. Attachment metadata comes from `GET https://api.resend.com/emails/receiving/{email_id}/attachments`. Only `.csv`/`.pdf` files of ≤ 10 MB whose sender rule matches are kept; everything else is listed as `ignored` with a reason.
6. The route answers **200 straight away** with that summary. Downloading and `ingest()` run afterwards (Next `after()`, `maxDuration = 60`). The per-attachment outcome (session id, inserted / duplicate / needs-review counts, or a short error) is saved on the `inbound_emails` row. Attachment contents and email bodies are never logged or stored.
7. If any attachment fails, the row is marked `failed`. Re-sending the webhook from the Resend dashboard retries **only** the failed attachments.

### Retries and failure alerts

If an import fails (a download or parse error), or the function times out before `after()` finishes, the email isn't lost:

- **Retry cron:** `/api/cron/retry-inbound-email` runs daily at 08:30 UTC (`vercel.json`, protected by `CRON_SECRET`). It retries emails that are `failed`, or stuck in `processing` for more than 15 minutes. It takes up to 5 emails per run and only emails from the last 3 days. Attachments that were already imported are skipped.
- **Giving up:** an email gets 3 attempts in total (the webhook plus 2 retries). After the last one it's marked `abandoned`, and you get an `import_failed` alert on Telegram/WhatsApp asking you to upload the statement manually. Abandoned is final: a re-sent webhook won't import it again.
- **Sender removed:** if the sender was removed from your approved list in the meantime, the email is abandoned without an alert.
- **Faster retries:** on a Vercel Pro plan you can change the cron to hourly (`0 * * * *`) to retry sooner. Hobby plans only allow daily crons.

### Sender rules
Settings → **Data** → **Email Import**. Each rule is `sender email → account`, with an optional filename glob (`*`, `?`, case-insensitive), e.g. `Latitude*.pdf`. A rule whose pattern matches wins over a rule without a pattern for the same sender. A sender approved by two different users is rejected as ambiguous.

Code: provider-specific bits are all in `src/lib/inbound-email/resend.ts` (swap this file to change provider). The logic is in `process.ts`, DB access in `store.ts`, matching helpers in `senders.ts`.

## Owner setup

### 1. Receiving address in Resend
Docs: https://resend.com/docs/dashboard/receiving/introduction
- **Quickest:** Resend dashboard → Emails → **Receiving** → ⋯ → *Receiving address*. Your account has a `<id>.resend.app` domain and any address on it is received, e.g. `statements@<id>.resend.app`.
- **Custom domain (optional):** add a subdomain such as `inbound.yourdomain.com` in Resend, enable receiving, and add the MX record it shows (https://resend.com/docs/dashboard/receiving/custom-domains). Use a subdomain so your normal mail isn't affected.

### 2. Webhook
Resend dashboard → **Webhooks** → Add endpoint:
- URL: `https://<your-production-domain>/api/webhooks/inbound-email`
- Event: `email.received`
- Copy the **signing secret**.

### 3. Env vars (Vercel → Project → Settings → Environment Variables)
| Var | Value |
|---|---|
| `RESEND_WEBHOOK_SECRET` | The webhook signing secret from step 2 (**new**). |
| `INBOUND_EMAIL_ADDRESS` | The address you'll forward to, e.g. `statements@<id>.resend.app`. Shown in Settings (**new**). |
| `RESEND_API_KEY` | Already set for outbound email. It must be allowed to read received emails. A *Sending access* key is probably not enough; if the webhook response says "Could not fetch attachments", switch to a *Full access* key. |

Redeploy after setting them.

### 4. Migration
Run migration `0010_import_automation.sql` (apply with `pnpm db:migrate`) against Neon (it creates `import_senders` and `inbound_emails`). 

### 5. Approve senders in the app
Settings → Data → Email Import → add the bank's sending address (e.g. the address Latitude statements come from) and pick the account. If you'll forward by hand instead of using a filter, the From address Resend sees is **your own Gmail address**; approve that too, ideally with a filename pattern.

### 6. Gmail auto-forward filter
1. Gmail → ⚙ → *See all settings* → **Forwarding and POP/IMAP** → *Add a forwarding address* → enter `INBOUND_EMAIL_ADDRESS`.
2. Gmail sends a confirmation email to that address. Because Google's sender isn't approved, the app ignores it; open it in Resend → Emails → **Receiving**, and click the confirmation link (or copy the code into Gmail).
3. Leave "Disable forwarding" selected (you only want the filter, not all mail) and save.
4. In Gmail search, use e.g. `from:(statements@latitudefinancial.com) has:attachment` → *Create filter* → tick **Forward it to** `INBOUND_EMAIL_ADDRESS` → *Create filter*. Repeat per bank.

Gmail keeps the original From when a filter forwards, so the approved sender is the bank's address.

### 7. Check it
Forward a real statement email. Resend → Webhooks shows the delivery and the JSON response (`accepted` + attachments). A new import session (source `email`) should appear a few seconds later.

## Security notes / limits
- The From header can be spoofed. The protections are: an approved-sender list, an unpublished inbound address, CSV/PDF only, 10 MB cap, and dedup on every row. Resend's webhook doesn't expose SPF/DKIM results, so they aren't checked here.
- Only one Resend inbound address is shown in Settings (single-owner app). There's no per-user address.
- A row stuck in `processing` (e.g. the function timed out) is picked up by the retry cron after 15 minutes, or can be retaken by re-sending the webhook.
