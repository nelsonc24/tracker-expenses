# Email ingestion (Resend Inbound)

Forward a statement email to a dedicated inbound address and its CSV/PDF attachments are imported with `source: 'email'`.

## Flow
1. Resend receives the email and POSTs an `email.received` webhook (metadata only: `data.email_id`, `data.from`, `data.attachments[]`).
2. `POST /api/webhooks/inbound-email` verifies the Svix signature (`svix-id`, `svix-timestamp`, `svix-signature`) on the raw body (same library as the Clerk webhook).
3. The sender must be in **Settings > Data > Email import senders** (`import_senders`: sender email → account). Unknown senders are ignored with a 200 so Resend does not retry.
4. Attachments are listed with `GET https://api.resend.com/emails/receiving/{email_id}/attachments` (Bearer `RESEND_API_KEY`) and downloaded from their signed `download_url`.
5. Only `.csv` / `.pdf` up to 10 MB are passed to `ingest()`. Others are skipped; an unparseable file is recorded as failed without blocking the rest. Listing/download errors return 500 so Resend retries.

Payload and endpoint shapes were taken from Resend's current docs (receiving webhooks and the received-email attachments API), not guessed.

## Security notes
- The inbound address is shared, so a sender maps to exactly one user (unique index).
- The sender comes from the email's `From`, which can be forged. The webhook does **not** yet check SPF/DKIM results (the retrieve-email API exposes `authentication`, but I did not confirm its value format). Treat the inbound address as a secret: use a long random local part and do not publish it. Hardening with the authentication result is a sensible follow-up.
- A Gmail forwarding rule forwards the original message, so add the **original** sender (e.g. the bank or Latitude address) as the approved sender, not your own address.

## Owner setup (not done by the agent)
1. In Resend, enable receiving and add an inbound address/domain (MX records for a domain or subdomain you control; or use the Resend-provided address).
2. Create a webhook for `email.received` pointing to `https://<app>/api/webhooks/inbound-email`; copy its signing secret (`whsec_...`).
3. Set `RESEND_INBOUND_WEBHOOK_SECRET` and make sure `RESEND_API_KEY` is set in Vercel. The key must be allowed to read received emails.
4. Add the approved sender(s) in Settings.
5. Forward a real Latitude statement email and check Settings/imports for the new session.

## Not verified
No real forwarded email, no real Resend webhook delivery (payload parsed per docs only), whether `download_url` needs auth (assumed not, per the forwarding guide), migration `0011` not applied.
