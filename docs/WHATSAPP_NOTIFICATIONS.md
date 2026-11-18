# WhatsApp notifications (plan 5.2–5.5)

WhatsApp is a third channel for `notify()` (see `NOTIFIER.md`), using the **official Meta WhatsApp Cloud API** from a dedicated business number. No unofficial libraries.

## How it works
- **Client:** `src/lib/notifications/whatsapp-service.ts` → `sendWhatsAppTemplate(to, templateName, params, { languageCode? })` posts a template message to `https://graph.facebook.com/{WHATSAPP_API_VERSION}/{WHATSAPP_PHONE_NUMBER_ID}/messages`. Never throws; returns `{ success, messageId?, dryRun?, error? }`.
- **Dry-run:** when `WHATSAPP_TOKEN` is unset, the payload is logged (`[whatsapp] DRY RUN …`) and the call reports success with `dryRun: true`. Safe to deploy before the Meta setup is done.
- **Channel:** `whatsappChannel` in `channels.ts` (registered in `default-deps.ts`). Enabled when `whatsappNotificationsEnabled` is on and `whatsappPhoneNumber` is valid E.164. Each send is logged in `notifications` with `channel = 'whatsapp'` and the WhatsApp message ID in `metadata.whatsappMessageId` (dry runs have `metadata.dryRun = true`).
- **Templates** (all event types are mapped; wording is generic: no amounts, balances or account numbers):

  | Event | Template | Body | Params |
  |---|---|---|---|
  | `bill_due` | `bill_due` | {{1}} is due {{2}}. | bill name, "today" / "tomorrow" / "on Tue 24 Nov" |
  | `debt_due` | `debt_due` | Payment for {{1}} is due {{2}}. | debt name, same date wording |
  | `budget_alert` | `budget_alert` | You've used {{1}}% of your {{2}} budget. | rounded %, budget name |
  | `import_summary` | `import_summary` | {{1}} new transactions imported, {{2}} need review. | counts |
  | `statement_missing` | `statement_missing` | No statement imported for {{1}} in {{2}} days. | account name, days |

- **Settings UI:** a WhatsApp card under Telegram (`whatsapp-notification-settings.tsx`) with a toggle, an E.164 phone input and **Send test message**. The test (`POST /api/notifications/whatsapp/test`, Clerk-authenticated) always goes to the user's **saved** number, never to a number from the request, and uses Meta's pre-approved `hello_world` sample template (`en_US`).
- **Webhook:** `/api/webhooks/whatsapp`
  - `GET`: verification handshake. Echoes `hub.challenge` when `hub.mode=subscribe` and `hub.verify_token` equals `WHATSAPP_VERIFY_TOKEN`; otherwise 403.
  - `POST`: checks `X-Hub-Signature-256` (`sha256=` + hex HMAC-SHA256 of the raw body, keyed with `WHATSAPP_APP_SECRET`, timing-safe compare; 401 if missing or wrong). Delivery statuses are logged and applied to the matching `notifications` row: `delivered`/`read` set `deliveredAt`/`readAt` and `metadata.whatsappStatus` but keep `status = 'sent'` (the cron's once-a-day dedupe looks for `'sent'`); `failed` sets `status = 'failed'` with the error. Inbound user messages are ignored (out of scope).
  - Middleware: API routes are not in the Clerk-protected list, so this route is public, same as the Clerk webhook.

## Environment variables
| Variable | Required | Notes |
|---|---|---|
| `WHATSAPP_TOKEN` | for live sends | Permanent System User token. Unset = dry-run. |
| `WHATSAPP_PHONE_NUMBER_ID` | for live sends | Phone number **ID** from API Setup, not the number. |
| `WHATSAPP_APP_SECRET` | for the webhook | App Dashboard → App settings → Basic. |
| `WHATSAPP_VERIFY_TOKEN` | for the webhook | Any random string; enter the same value in the webhook config. |
| `WHATSAPP_API_VERSION` | recommended | e.g. `v24.0`. Defaults to `v24.0`; set it to the current Graph API version. |
| `WHATSAPP_TEMPLATE_LANGUAGE` | optional | Language the templates were approved in. Default `en` (use `en_AU` if you approved them in that). |

## Database
`notification_preferences.whatsapp_notifications_enabled` (boolean, default false) and `whatsapp_phone_number` (text, E.164). The SQL is hand-written in `src/db/migrations/pending/whatsapp_preferences.sql` and **has not been run anywhere**; fold it into the next numbered migration (or run it manually) before deploying, otherwise every query on `notification_preferences` fails.

## Manual Meta setup (owner)
1. Buy a prepaid SIM. **Don't install regular WhatsApp on it**: a number registered on the Cloud API can't be used in the consumer app.
2. developers.facebook.com → Create App (Business) → add the WhatsApp product.
3. WhatsApp → API Setup → add the new number, verify it by SMS, and set the display name (e.g. "Expense Tracker").
4. Add your personal number as a recipient.
5. Business Settings → System Users → create a system user with `whatsapp_business_messaging` and generate a **permanent** token (the API Setup page token expires after 24 hours).
6. Add a payment method in Meta Business Settings. Utility templates are charged per message (inside the 24-hour window too, since 1 Oct 2026). Check current AU rates.
7. Create these **Utility** templates (language `en`, or `en_AU` and set `WHATSAPP_TEMPLATE_LANGUAGE`) and wait for approval: `bill_due`, `debt_due`, `budget_alert`, `import_summary`, `statement_missing`, with the bodies in the table above.
8. Set the Vercel env vars above.
9. WhatsApp → Configuration → Webhook: callback URL `https://<your-domain>/api/webhooks/whatsapp`, verify token = `WHATSAPP_VERIFY_TOKEN`, then subscribe to the `messages` field.
10. In Settings → Notifications, enable WhatsApp, save your number, and press **Send test message**.

## Not verified yet
- No real send to Meta has been made (no credentials); the request shape follows Meta's docs and is covered by unit tests with a mocked `fetch`.
- The webhook has not received a real Meta delivery.
