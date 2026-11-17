# Notifier abstraction (plan 5.1)

`src/lib/notifications/notifier.ts` exposes `notify(userId, event)`, the single entry point for sending a notification to a user.

- **Events** (`NotificationEvent`, discriminated union): `bill_due`, `debt_due`, `budget_alert`, `import_summary`, `statement_missing`. Payloads are display-ready and generic (no account numbers, balances or transaction details).
- **Channels** (`NotificationChannel`: `id`, `isEnabled(prefs)`, `send(prefs, event)`): adapters in `channels.ts` wrap the existing `email-service` and `telegram-service`. Add a new channel (e.g. WhatsApp) by writing an adapter and adding it to `channels` in `default-deps.ts`.
- **Rules applied by `notify()`:** per-type switch (`billRemindersEnabled`, `debtRemindersEnabled`, `budgetAlertsEnabled`; other types always allowed), quiet hours (`quietHoursStart`/`End`, evaluated in the user's `preferences.timezone`, default Australia/Sydney, end exclusive, overnight ranges supported), and the channel's own `isEnabled`.
- **Never throws for one channel's failure.** Returns `{ sent, skipped: [{channel, reason}], errors }`. Skip reasons: `disabled`, `type_disabled`, `quiet_hours`, `unsupported`.
- `NotifyDeps` can be injected for tests (see `tests/notifier.test.ts`); production deps are loaded lazily from `default-deps.ts`.
- `GET /api/cron/check-reminders` now calls `notify()` once per bill/debt instead of calling email and Telegram separately. The once-per-day dedupe (`wasNotificationSentRecently`) is unchanged.

## Behaviour changes vs the old cron
- Email now honours the global `emailNotificationsEnabled` switch (it was ignored before).
- Telegram now honours `billRemindersEnabled` / `debtRemindersEnabled` and quiet hours (it ignored them before).
- A disabled reminder type is reported as skipped rather than as an error.

## Not done yet
Email and Telegram only have templates for `bill_due` and `debt_due`; the other event types report `unsupported` there until templates are added (plan 3.2 / 3.3 / 5.2).
