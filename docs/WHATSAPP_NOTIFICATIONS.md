# WhatsApp notifications (Meta Cloud API)

Official Meta WhatsApp Cloud API on a **dedicated business number**. No unofficial libraries. Messages are sent as pre-approved **Utility templates** and are deliberately generic: no account numbers, balances or transaction details.

## How it works
- `src/lib/notifications/whatsapp-service.ts` – `sendWhatsAppTemplate(to, template, params)` and `buildWhatsAppTemplate(event)` (event → template + params).
- `whatsappChannel` in `channels.ts` plugs it into `notify()` (see `NOTIFIER.md`). Enabled when `whatsappNotificationsEnabled` is on and `whatsappPhoneNumber` is a valid E.164 number.
- **Dry-run mode:** if `WHATSAPP_TOKEN` is not set, the payload is logged (number masked) and the send reports success with `dryRun: true`. Nothing is sent and no `notifications` row is written. So the code can ship before the setup below is done.
- Real sends write a `notifications` row (`channel = 'whatsapp'`) and store the returned message id in `whatsapp_message_id`, so delivery-status webhooks can update it.

## Environment variables (Vercel)
| Var | Purpose |
|---|---|
| `WHATSAPP_TOKEN` | Permanent system-user token. Unset = dry-run. |
| `WHATSAPP_PHONE_NUMBER_ID` | Id of the business phone number. |
| `WHATSAPP_API_VERSION` | Graph API version, e.g. `v23.0` (code defaults to `v23.0` if unset; check Meta for the current one). |
| `WHATSAPP_APP_SECRET` | Verifies webhook signatures (`X-Hub-Signature-256`). |
| `WHATSAPP_VERIFY_TOKEN` | Any string you choose; used for the webhook verification handshake. |
| `WHATSAPP_TEMPLATE_LANGUAGE` | Optional. Template language code, default `en` (use `en_AU` if the templates were created in that locale). |

## Owner setup (cannot be done by code)
1. Buy a prepaid SIM. **Don't install regular WhatsApp on it**: a number registered on the Cloud API can't be used in the consumer app.
2. developers.facebook.com → Create App (Business) → add the WhatsApp product.
3. WhatsApp → API Setup → add the new number, verify by SMS, set the display name (e.g. "Expense Tracker").
4. Add your personal number as a recipient (needed while the app is in development mode).
5. Business Settings → System Users → create a system user with `whatsapp_business_messaging` and generate a **permanent** token. (The token on the API Setup page expires after 24 hours.)
6. Add a payment method in Meta Business Settings. Utility templates are charged per message (inside the 24-hour window too, since 1 Oct 2026). Check current AU rates.
7. Create and get approved these **Utility** templates (language `en`, or `en_AU`):

   | Name | Body |
   |---|---|
   | `bill_due` | `{{1}} is due {{2}}.` |
   | `debt_due` | `Payment for {{1}} is due {{2}}.` |
   | `budget_alert` | `You've used {{1}}% of your {{2}} budget.` |
   | `import_summary` | `{{1}} new transactions imported, {{2}} need review.` |
   | `statement_missing` | `No statement imported for {{1}} in {{2}} days.` |

   For `bill_due` / `debt_due`, `{{2}}` is "today", "tomorrow" or "on Dec 01, 2026".
8. Set the env vars above in Vercel.
9. Webhook (after 5.5): in the app's WhatsApp → Configuration, set the callback URL to `https://<your-domain>/api/webhooks/whatsapp` and the verify token to `WHATSAPP_VERIFY_TOKEN`; subscribe to the `messages` field.

## Checked against Meta's docs
Send endpoint and template payload, the webhook verification handshake, and the `X-Hub-Signature-256` scheme (HMAC-SHA256 of the raw body with the app secret, `sha256=` prefix) were checked against Meta's published docs. The exact delivery-status (`statuses`) payload was **not** confirmed against a live webhook; the handler is written defensively.

## Webhook (`/api/webhooks/whatsapp`)
- `GET` – Meta's verification handshake: `hub.mode=subscribe` and `hub.verify_token == WHATSAPP_VERIFY_TOKEN` → echoes `hub.challenge`, otherwise 403.
- `POST` – delivery statuses. The `X-Hub-Signature-256` HMAC is checked against the **raw** body with `WHATSAPP_APP_SECRET` (bad signature → 401). Each status is matched to a notification by `whatsapp_message_id`:
  - `delivered` → `delivered_at`, `read` → `read_at`, `failed` → `status = 'failed'` plus the error message.
  - `status` deliberately stays `'sent'` for delivered/read, because the reminder dedupe only counts `'sent'` rows.
  - Out-of-order webhooks never regress a newer state. Unknown message ids (e.g. test sends) are ignored.
- Inbound replies (e.g. "1" to approve review items) are **not** handled; out of scope for now.
