# Expenses Tracker – Product Requirements Document (PRD)8. Rules engine:
   - Simple "if description contains X then category = Y, tag = Z".
9. Modern UI/UX with theming:
   - Dark/light theme toggle with system preference detection
   - Multiple theme variants (e.g., blue, green, purple color schemes)
   - Responsive design optimized for mobile, tablet, and desktop
   - Smooth animations and micro-interactions
   - Modern glassmorphism and card-based layouts
   - Accessibility-compliant design (WCAG 2.1 AA)
   - Custom theme builder for advanced users
10. Search & filters, bulk edit, tags.
11. Privacy: delete data, export data.st updated: 18 Aug 2025

## 1) Overview and Vision

Build a modern, privacy-conscious personal finance web app to track spending, budgets, and cash flow with automatic bank sync for Australian banks via Open Banking (CDR). The app should be fast, mobile-friendly, and delightful to use.

Primary goals:
- Simple onboarding, quick import (CSV and bank link), and instant insights.
- Automatic, accurate categorization with easy corrections and rules.
- Budgets that are actually useful: alerts, projections, and recommendations.
- Bank connections that respect Australian Consumer Data Right (CDR) standards via an aggregator.

Non-goals (initially):
- Payments initiation, bill pay, lending, or tax filing.
- Full investment portfolio analytics; initial scope is bank transactions and simple assets.

## 2) Target Users and Jobs-To-Be-Done

Personas:
- Individuals and couples who want to understand spending, set budgets, and reduce bill shock.
- Sole traders or freelancers who need light cash-flow and GST tracking (phase 2/optional).

JTBD:
- “Help me connect my bank(s) and see where my money goes.”
- “Warn me before I overspend in a category.”
- “Spot subscriptions and unusual charges.”
- “Project my month: how much can I safely spend?”

## 3) Key Features

MVP (Phase 1):
1. Secure auth and onboarding.
2. Connect AU banks via CDR aggregator (see Integrations).
3. CSV import for manual uploads (e.g., OFX/CSV from banks).
4. Transaction ingestion + enrichment:
   - Normalization, merchant/name cleaning.
  - Categories: user-defined hierarchical tree (categories and subcategories), auto-categorization + rules, and manual assignment with override persistence.
   - Transfers detection (intra-account).
5. Budgets:
   - Monthly category budgets, rollover toggle, projections, and alerts.
6. Dashboards & insights:
   - Interactive dashboard with comprehensive financial insights and visualizations
   - Spend by category/time with drill-down capabilities
   - Cash flow trends with monthly/weekly/daily views
   - Top merchants analysis with spending patterns
   - Upcoming recurring charges calendar view
   - Budget vs actual spending with progress indicators
   - Category-wise spending distribution (donut/pie charts)
   - Monthly spending trends (line/bar charts)
   - Income vs expenses waterfall charts
   - Savings rate tracking and projections
   - Year-over-year spending comparisons
   - Anomaly detection alerts (unusual spending patterns)
   - Quick action cards for common tasks
7. Rules engine:
   - Simple “if description contains X then category = Y, tag = Z”.
8. Search & filters, bulk edit, tags.
9. Privacy: delete data, export data.

Nice-to-have in MVP:
- Subscription detection (recurring pattern).
- Simple cashflow calendar.
- Light multi-currency display (if bank provides FX).

Phase 2 (Roadmap):
- Shared spaces (partner budgeting), envelopes/zero-based budgeting.
- ML-assisted categorization and anomaly detection.
- Attach receipts, note-taking, and document vault.
- Goals (savings targets) and recommendations.
- GST and BAS prep helpers for sole traders.
- Net worth tracking (connecting to investment accounts/providers).
- Mobile app wrapper (PWA first), push notifications.

Out of Scope (for now):
- Payment initiation, bill pay, and credit score services.

## 4) Australian Bank Connections (CDR)

Direct connections to banks require CDR-compliant flows. Best path is to integrate with an accredited aggregator that supports Australia. Candidates:

- Plaid (Australia Open Banking)
  - Pros: Developer-friendly, Link UI, good docs; broad bank coverage.
  - Cons: Pricing, business onboarding, ADR/affiliate requirements.

- Basiq
  - Pros: AU-first, strong CDR support, webhooks, good bank coverage.
  - Cons: Commercial onboarding, pricing.

- Adatree
  - Pros: Strong compliance tooling in AU’s CDR ecosystem.
  - Cons: More compliance-heavy focus; integration and pricing depend on use case.

- Frollo
  - Pros: Established in AU CDR; data recipient capabilities.
  - Cons: Enterprise-focused; pricing/onboarding.

Recommendation: Chosen provider: Basiq (AU CDR) using their sandbox for development. Keep a provider abstraction so we can swap or add alternatives (e.g., Plaid AU) later if needed.

Notes:
- CDR implies OAuth redirects to each data holder (bank) for consent.
- We must not store raw credentials. Store only access tokens from the aggregator and refresh through their SDK/API.
- Implement data minimization, explicit consent scopes, and a clear “disconnect & delete” flow.

## 5) Tech Stack and Key Libraries

Mandated:
- Next.js (App Router)
- shadcn/ui (Radix UI under the hood)
- Tailwind CSS
- Postgres on Neon serverless
- Drizzle ORM + drizzle-kit migrations

Recommended additions:
- Auth: Clerk (chosen). Managed auth to speed up onboarding and security best practices.
- Validation & forms: Zod, react-hook-form, @hookform/resolvers.
- Data fetching & caching: TanStack Query (client) + Next.js Server Actions for mutations with zod validation (e.g., next-safe-action).
- Money math: Dinero.js or decimal.js; store amounts as bigint (cents) in DB.
- Dates: date-fns.
- Charts: Recharts or Tremor for comprehensive data visualization.
- Advanced charts: Chart.js or D3.js for complex financial visualizations.
- Theme management: next-themes for seamless dark/light mode switching.
- Tables: TanStack Table.
- Icons: lucide-react.
- Env validation: zod + next-runtime-env or t3-env style.
- Background jobs: Inngest or Trigger.dev; scheduled tasks via Vercel Cron.
- Queue/caching: Upstash Redis (rate limits, dedupe, sessions if needed).
- Observability: Sentry (errors) (chosen). Optional product analytics: PostHog or Umami (to be decided).
- Security: @next-safe/middleware, helmet-like headers, csrf (where needed), OWASP best practices.

## 6) High-Level Architecture

- Next.js App Router with server components; server actions for mutations with schema-validated inputs.
- Drizzle ORM with Neon’s serverless (HTTP) driver. Migrations via drizzle-kit.
- Provider abstraction for CDR aggregators (Plaid/Basiq/etc.).
- Webhook endpoints for transaction/account updates; signature verification.
- Background jobs for sync, backfill, categorization, subscription detection.
- Caching and rate-limiting at the edge where possible.
- Hosting: Vercel (web/app), Neon (DB), Upstash (Redis), aggregator’s infra for bank data.

### Pages (App Router)
- / (marketing/landing or redirect to dashboard)
- /dashboard (enhanced with comprehensive insights and interactive charts)
- /accounts (connect/disconnect)
- /transactions (filters, bulk edit)
- /budgets
- /rules
- /insights (detailed analytics and advanced charts)
- /settings (profile, data export/delete, providers, theme preferences)
- /api/webhooks/[provider]
- /api/import/csv (server action)

### API/Service Contracts (conceptual)
- POST /api/webhooks/{provider}: receives account/transaction updates; idempotent processing.
- Server Action: connectProvider(provider) → returns redirect/link token.
- Server Action: importCsv(file) → staged rows, preview, confirm import.
- Server Action: upsertRule(rule) → reprocess pending matches.
- Server Action: upsertBudget(budget) → projections & alerts update.

## 7) Data Model (Drizzle ORM, Postgres)

Guidelines:
- Use bigint for amounts in minor units (cents).
- Use UUID primary keys; created_at/updated_at with timezone.
- Multi-tenant via user_id foreign keys.

Core tables (draft):
- users: id, email, name, image, theme_preference (light/dark/auto), color_scheme (default/forest/sunset/ocean/monochrome), created_at.
- institutions: id, name, country_code, provider, provider_institution_id.
- connections: id, user_id, provider, provider_item_id, status, consent_expires_at, scopes, meta.
- accounts: id, user_id, connection_id, institution_id, name, official_name, mask, type, subtype, currency, balance_current, balance_available.
- transactions: id, user_id, account_id, connection_id, posted_at, effective_at, description_raw, description_clean, merchant_name, amount_minor (signed), currency, category_id (nullable), hash_dedupe, is_transfer, is_recurring, transfer_pair_id (nullable), bank_category, payment_type, receipt_number, bank_transaction_id, from_account, to_account, notes jsonb, updated_by_rule_id (nullable), manual_category_locked boolean default false.
- categories: id, user_id (nullable for system), name, slug, parent_id (nullable), color (nullable), icon (nullable), is_system boolean default false, sort_order int.
- rules: id, user_id, name, match_type (contains/regex/amount/merchant), predicate, actions (jsonb), is_active, priority.
- budgets: id, user_id, name, period (monthly), category_id (nullable for overall), amount_minor, rollover, start_month, end_month.
- budget_actuals: id, budget_id, period_month, spent_minor, projected_minor.
- recurring_merchants: id, user_id, merchant_name, cadence (weekly/monthly), last_seen_at, avg_amount_minor.
- tags: id, user_id, name; transaction_tags: (transaction_id, tag_id).
- user_preferences: id, user_id, dashboard_layout jsonb, chart_preferences jsonb, notification_settings jsonb, created_at, updated_at.
- insights: id, user_id, type (spending_pattern/budget_alert/anomaly), title, description, data jsonb, is_read boolean default false, priority (low/medium/high), created_at.
- csv_imports: id, user_id, filename, file_size, status (uploading/processing/completed/failed), rows_total, rows_processed, rows_failed, bank_format_detected, column_mappings jsonb, error_log jsonb, created_at, completed_at.
- bank_category_mappings: id, user_id, bank_name, bank_category, user_category_id, confidence_score, is_verified boolean default false, created_at.
- transaction_staging: id, csv_import_id, row_number, raw_data jsonb, parsed_data jsonb, validation_errors jsonb, status (pending/processed/failed), created_at.
- audit_logs: id, user_id, entity, entity_id, action, diff, created_at.

Indexes:
- transactions(account_id, posted_at desc)
- transactions(user_id, hash_dedupe) unique for idempotency
- categories(user_id, parent_id, sort_order)
- rules(user_id, priority)
- accounts(user_id), connections(user_id)

## 8) User Flows

Onboarding:
1) Create account → 2) Connect bank (or skip) → 3) Auto import → 4) Pick starter budgets → 5) See dashboard.

Connect bank (CDR):
1) User selects provider → 2) Redirect to aggregator Link → 3) Consent with bank → 4) Redirect back → 5) We exchange tokens → 6) Webhook triggers backfill → 7) UI shows progress and results.

CSV import:
1) Upload → 2) Map columns → 3) Preview dedupe → 4) Confirm → 5) Categorize + rules applied.

Budget alerting:
- Background job computes burn rate and projections; send in-app and email alerts when risk of overspend.

## 8.1) Categories & Subcategories (Flexible Model)

Objectives:
- Allow users to create an arbitrary hierarchy depth of categories (practically 2 levels recommended for UX: category → subcategory), with colors/icons, ordering, and per-user custom trees in addition to system defaults.
- Allow assigning any transaction to any category/subcategory; support bulk assignment, and allow manual overrides that persist against future syncs.
- Enable rules that auto-assign categories; if a user manually changes a category, mark the transaction as locked and prefer user choice unless the user opts to “learn a rule”.

Scope (MVP):
- 1–2 level hierarchy in UI; backend supports N-level with parent_id.
- CRUD for categories (create, rename, delete/merge), choose color/icon, and re-order.
- Transaction category assignment: inline in table row, detail drawer, or bulk edit.
- Rules integration: create rule from selection (e.g., "If description contains 'Uber' then category = Transport:Rideshare").
- Category management page with drag-and-drop reordering and nesting (basic DnD; deep nesting optional).

Behavioral rules:
- Manual category change sets manual_category_locked = true on that transaction.
- New transactions from same merchant are candidates for auto rule suggestion; prompt user to "Create rule".
- Deleting a category with children:
  - Option A: re-parent children to the deleted category’s parent.
  - Option B: block deletion until children are moved.
- Deleting a category with assigned transactions:
  - Require user to pick a replacement category (merge), or leave uncategorized (not recommended).

Edge cases:
- Transfers flagged transactions should be excluded from category budgets by default.
- Splits (Phase 2): allow splitting a single transaction into multiple categories with amounts; store in a transaction_splits table.

Analytics impact:
- Budgets sum by leaf categories; parents aggregate child totals.
- Category changes retroactively affect analytics unless locked to period snapshots (out of scope initially).

## 8.2) Dashboard Insights and Visualizations

The dashboard serves as the primary interface for users to understand their financial health through interactive charts and actionable insights.

### Core Dashboard Components:

1. **Financial Overview Cards**
   - Total balance across all accounts
   - Monthly income vs expenses
   - Current month's spending vs budget
   - Savings rate percentage
   - Net cash flow trend indicator

2. **Interactive Charts and Graphs**
   - **Spending by Category**: Donut chart with drill-down to subcategories
   - **Monthly Trends**: Line chart showing spending patterns over time
   - **Cash Flow**: Waterfall chart displaying income, expenses, and net flow
   - **Budget Progress**: Horizontal bar charts with percentage completion
   - **Daily Spending**: Bar chart showing daily expense patterns
   - **Year-over-Year Comparison**: Side-by-side charts comparing current vs previous year
   - **Top Merchants**: Horizontal bar chart of highest spending merchants

3. **Smart Insights Panel**
   - Automated spending pattern detection
   - Budget variance alerts and recommendations
   - Unusual transaction notifications
   - Subscription renewal reminders
   - Cashflow projections for the month
   - Personalized saving opportunities

4. **Quick Actions Widget**
   - Add manual transaction
   - Create new budget
   - Set up spending rule
   - Export recent data
   - Connect new account

### Advanced Analytics Features:

- **Predictive Analytics**: ML-powered spending forecasts
- **Trend Analysis**: Identify seasonal spending patterns
- **Goal Tracking**: Visual progress towards savings goals
- **Comparison Tools**: Benchmark against previous periods
- **Drill-down Capabilities**: Click any chart element to view detailed transactions

## 8.3) Modern Theming and Design System

The application features a comprehensive theming system that provides users with a modern, accessible, and customizable interface.

### Theme Architecture:

1. **Core Theme System**
   - Built on CSS custom properties (CSS variables)
   - Seamless integration with Tailwind CSS
   - Dynamic theme switching without page reload
   - System preference detection and auto-switching

2. **Theme Variants**
   - **Light Theme**: Clean, minimal design with high contrast
   - **Dark Theme**: Easy on the eyes with carefully chosen dark colors
   - **Auto Theme**: Follows system preference with manual override
   - **Custom Themes**: User-defined color schemes (Phase 2)

3. **Color Schemes**
   - **Default**: Modern blue-based palette
   - **Forest**: Green-focused theme for nature lovers
   - **Sunset**: Warm orange/red gradient theme
   - **Ocean**: Cool blue/teal combination
   - **Monochrome**: High-contrast black and white
   - **Custom**: User-defined brand colors

4. **Design Principles**
   - **Glassmorphism**: Subtle transparency and blur effects
   - **Neumorphism**: Soft, extruded design elements
   - **Card-based Layout**: Information organized in clean cards
   - **Micro-interactions**: Smooth hover states and transitions
   - **Progressive Disclosure**: Information revealed as needed

### Accessibility Features:

- WCAG 2.1 AA compliance
- High contrast mode support
- Reduced motion preference respect
- Keyboard navigation optimization
- Screen reader compatibility
- Color-blind friendly palettes

### Implementation Details:

- Theme state persisted in localStorage and user preferences
- CSS-in-JS or CSS variables for theme switching
- Tailwind CSS custom color configuration
- shadcn/ui component theming integration
- Animation and transition consistency across themes

## 9) Security, Privacy, and Compliance

- CDR-aligned consent and data minimization; no raw bank credentials.
- Encrypt at rest (DB) and in transit (TLS). Consider field-level encryption for PII.
- Store only tokens necessary for refresh; rotate regularly; handle revocation.
- Role-based access (future multi-user spaces).
- Audit logging for sensitive actions and webhooks.
- DSG/Privacy: clear data export and delete-my-data flow.

## 10) Metrics and Success Criteria

- Time-to-first-insight (TTFI): < 3 minutes from signup to seeing categorized spend.
- Bank connection success rate: > 85%.
- Categorization accuracy (top-1): ≥ 85% after 1 week of rules auto-learning.
- Budget alert engagement: ≥ 30% clickthrough.
- Weekly active users / retention (W1, W4).

## 11) Milestones and Timeline (Indicative)

Milestone 0: PRD sign-off (this doc).

Milestone 1 (Week 1-2): Project setup
- Repo scaffolding, CI, lint/test.
- Auth, layout, shadcn/ui, Tailwind base.
- Drizzle + Neon schema v1 + migrations.

Milestone 2 (Week 3-4): Ingestion + CSV
- CSV import flow, staging, dedupe, basic categorization, rules.
- Transactions list with filters and bulk edit.

Milestone 3 (Week 5-6): Enhanced Dashboard + Theming
- Budget create/edit, projections, alerts scaffolding.
- Comprehensive dashboard with interactive charts and insights.
- Modern theming system with dark/light mode and color schemes.
- Advanced data visualizations and analytics components.

Milestone 4 (Week 7-8): Bank integration (sandbox)
- Provider abstraction (Plaid/Basiq) + Link flow.
- Webhooks and backfill, idempotency, error handling.

Milestone 5 (Week 9): Hardening & Beta
- Observability, rate limiting, docs, perf passes.
- Invite-only beta.

## 12) Risks and Mitigations

- Aggregator onboarding delays → Start with CSV import; keep provider-agnostic layer ready.
- CDR consent expiries and reauth → Background reminders; UX for reconnect flow.
- Categorization quality → Rules-first with user feedback; ML later.
- Serverless DB connection limits → Neon HTTP driver and query batching; move heavy jobs off-request.
- Cost creep for webhooks and jobs → Batch, backoff, idempotency; use queues.

## 13) Open Questions

- Preferred auth provider (Auth.js vs Clerk)?
- Which aggregator to start with (Plaid AU vs Basiq)? Access/keys?
- Do we need sole trader features (GST) in Phase 1?
- Any specific Australian banks to prioritize for QA?

## 14) Acceptance Criteria (MVP)

- A user can sign up, link at least one AU bank in sandbox, or import CSV.
- Transactions appear within minutes; categorization + editable rules work.
- User can create and manage categories and subcategories, assign them to any transaction (single or bulk), and manual overrides persist; rules can be created from selections.
- User can create budgets and see projections and alerts.
- Dashboard displays comprehensive financial insights with interactive charts and visualizations.
- Users can toggle between light/dark themes and select different color schemes.
- Application provides modern, responsive design with smooth animations and accessibility compliance.
- Smart insights and anomaly detection alerts are generated automatically.
- Data export and delete-my-data are available.
- Error monitoring enabled; basic analytics captured.

---

Appendix A: Provider Abstraction Sketch

Interface (conceptual):
- getLinkToken(userId)
- exchangePublicToken(userId, publicToken) → { accessToken, itemId }
- fetchAccounts(accessToken)
- fetchTransactions(accessToken, startDate, endDate, cursor?)
- webhookHandler(payload, signature) → normalized events

Appendix B: CSV Schema Examples

**UBank CSV Format (Real Example):**
```csv
"Date and time","Description","Debit","Credit","From account","To account","Payment type","Category","Receipt number","Transaction ID"
"20:38 20-08-25","Direct Credit Vanguard71546444 - 5797014","","$200.00","","Bills account","Direct Entry","Uncategorised","","""32386696455553721066359122555886"""
"02:04 20-08-25","Med*aldimobile Chatswood AU","$25.00","","Bills Account","","Visa","Home & Bills","","""32385462715156553127221993579363"""
```

**Generic CSV Schema (Minimal):**
- date, description, amount, currency, account (optional), balance (optional)

**CSV Import Mapping Considerations:**
- **Date formats**: Handle various formats (DD-MM-YY, DD/MM/YYYY, YYYY-MM-DD, with time)
- **Amount handling**: 
  - Separate debit/credit columns vs single signed amount
  - Currency symbols ($, AUD) and formatting (commas, decimals)
  - Negative vs positive conventions for debits/credits
- **Transaction identification**:
  - Unique transaction IDs for deduplication
  - Receipt numbers for reference
  - Account identification (from/to accounts)
- **Categorization**:
  - Bank-provided categories that can be mapped to user categories
  - Payment types (Visa, BPAY, Direct Entry, Osko, Internal Transfer)
- **Transfer detection**:
  - Internal transfers with matching receipt numbers
  - From/To account patterns for automated transfer flagging
- **Description cleaning**:
  - Merchant name extraction from transaction descriptions
  - Location information parsing (AU, VIC, etc.)
  - Payment reference cleaning

**Import wizard requirements:**
1. **Auto-detection**: Recognize common AU bank formats (UBank, CBA, ANZ, Westpac, NAB)
2. **Column mapping**: Flexible mapping interface for unknown formats
3. **Preview & validation**: Show parsed transactions before import
4. **Deduplication**: Use transaction ID, amount, date, and description hash
5. **Transfer linking**: Automatically link internal transfers with matching receipt numbers

Appendix C: UI Components (shadcn/ui)

- App shell: sidebar, top bar, user menu.
- Tables: transactions with selection, inline edit.
- Forms: budgets, rules; zod-resolved RHF forms.
- Charts: spend over time, category donut, cashflow bar.
