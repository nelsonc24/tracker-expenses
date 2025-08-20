# Implementation Plan – Phased Delivery with Review Gates

Last updated: 18 Aug 2025

This plan slices the work into reviewable phases. Each phase has scope, artifacts, acceptance criteria, and a review gate. We won’t start the next phase until you approve the current one.

## Phase 0 – Foundations & Decisions (Review Gate)

Scope:
- Auth provider: Clerk (chosen).
- AU Open Banking aggregator for sandbox: Basiq (chosen).
- Hosting stack: Vercel (app), Neon (DB), optional Upstash (Redis).
- Observability: Sentry (chosen); optional analytics PostHog/Umami later.

Deliverables:
- Finalized .env keys list (no secrets committed) and environment strategy.
- Updated PRD (if needed) reflecting decisions.

Acceptance criteria:
- Auth (Clerk) and aggregator (Basiq) decisions documented.
- Sandbox/test credentials plan confirmed (Clerk dev instance; Basiq sandbox keys).

### Environment variables (initial draft)
- Clerk
	- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
	- CLERK_SECRET_KEY
	- WEBHOOK_SECRET_CLERK (optional, if using Clerk webhooks)
- Basiq (CDR aggregator)
	- BASIQ_API_KEY
	- BASIQ_WEBHOOK_SECRET (for signature verification)
	- BASIQ_ENV (sandbox|production)
- Sentry
	- SENTRY_DSN
	- SENTRY_ENVIRONMENT
- Database
	- DATABASE_URL (Neon serverless)
	- DRIZZLE_LOG (optional)
- App
	- NEXT_PUBLIC_APP_URL
	- NEXT_PUBLIC_DEFAULT_THEME (light|dark|auto)
	- NEXT_PUBLIC_DEFAULT_COLOR_SCHEME (default|forest|sunset|ocean|monochrome)
- Analytics & Insights
	- ENABLE_SMART_INSIGHTS (true|false)
	- INSIGHTS_PROCESSING_SCHEDULE (cron expression)
	- ANOMALY_DETECTION_THRESHOLD (percentage for unusual spending alerts)

---

## Phase 1 – Project Scaffold & UI Base

Scope:
- Next.js (App Router), TypeScript, Tailwind, shadcn/ui setup.
- Modern app shell (sidebar, topbar, user menu) with comprehensive theming system.
- Multi-theme support: light/dark themes with system preference detection.
- Color scheme variants (default, forest, sunset, ocean, monochrome).
- Auth shell in place (provider selected in Phase 0) with sign-in/out flow.
- Chart libraries integration (Recharts/Tremor, Chart.js/D3.js for advanced visualizations).
- next-themes integration for seamless theme switching.
- Linting/formatting (ESLint, Prettier), basic CI workflow.
- Error & analytics hooks (Sentry and PostHog/Umami) stubbed.

Deliverables:
- A running app shell with sign-in/out and full theming capabilities.
- Component primitives (Button, Input, Dialog, Drawer, Table base) with theme variants.
- Chart component library setup and basic visualization components.
- Theme persistence and switching functionality.
- CI pipeline green.

Acceptance criteria:
- App boots locally, user can sign in/out.
- Theme switching works seamlessly between light/dark modes and color schemes.
- Base components and chart primitives visible in a styleguide page (e.g., /components).
- Accessibility compliance (WCAG 2.1 AA) for all theme variants.

---

## Phase 2 – Database & Drizzle Schema v1

Scope:
- Neon connection (serverless HTTP), Drizzle ORM, drizzle-kit migrations.
- Enhanced schema for: users (with theme preferences), categories, accounts, transactions, rules, budgets, user_preferences, insights tables.
- **CSV import tables**: 
  - csv_imports: import session tracking with file metadata and processing status
  - bank_category_mappings: mapping between bank categories and user categories
  - transaction_staging: temporary storage for CSV rows during import process
- New tables: user_preferences (dashboard layout, chart preferences), insights (smart alerts and recommendations).
- Migrations + seed script for system categories, default theme settings, and common bank category mappings.
- Data access layer patterns (repositories) and basic unit tests.

Deliverables:
- Drizzle schema files + first migration applied with enhanced user preferences and CSV import support.
- Seeded system categories, default theme configurations, and bank category mappings available after setup.

Acceptance criteria:
- Migrations run cleanly; all tables created including new preference, insights, and CSV import tables.
- Seed produces readable system categories, default user preference templates, and common AU bank category mappings.
- Theme preference and CSV import session persistence working in database layer.

---

## Phase 3 – CSV Import, Transactions, and Flexible Categories

Scope:
- **Advanced CSV upload flow**: 
  - File upload with drag-and-drop support
  - Auto-detection of common AU bank formats (UBank, CBA, ANZ, Westpac, NAB)
  - Flexible column mapping interface for unknown formats
  - Preview and validation with error highlighting
  - Sophisticated deduplication using transaction ID, amount, date, and description hash
- **Transaction processing**:
  - Handle various date formats (DD-MM-YY, DD/MM/YYYY, with time stamps)
  - Parse separate debit/credit columns vs single signed amounts
  - Currency symbol handling and amount formatting
  - Extract merchant names and clean descriptions
  - Automatic transfer detection and linking (using receipt numbers and from/to accounts)
- **Transactions list page**: filters (date/account/category), search, pagination, bulk operations.
- **Categories**: full CRUD, parent/child nesting, color/icon, sort order with drag-and-drop.
- **Category assignment**: single and bulk transaction categorization with manual override persistence.
- **Bank category mapping**: Import and map bank-provided categories to user categories.
- **Rules engine foundation**: create rules from transaction selections (contains text → set category/tag).

Deliverables:
- /transactions and /categories pages with full functionality.
- Robust CSV import wizard with Australian bank format support.
- Transaction staging and preview system.
- Advanced deduplication and transfer detection algorithms.

Acceptance criteria:
- **CSV Import**: Support UBank format and at least 2 other major AU bank formats out-of-the-box.
- **Auto-detection**: Correctly identify and parse UBank CSV with 95%+ accuracy.
- **Transfer linking**: Automatically detect and link internal transfers using receipt numbers.
- **Category management**: Users can create/rename/delete/merge categories with drag-and-drop ordering.
- **Bulk operations**: Users can assign categories to multiple transactions simultaneously.
- **Deduplication**: Prevent duplicate imports using multiple matching criteria.
- **Bank category mapping**: Successfully import and suggest mappings for bank-provided categories.

---

## Phase 4 – Enhanced Dashboard, Budgets and Advanced Analytics

Scope:
- Budgets CRUD: monthly budgets on categories or overall, rollover toggle.
- Projections and burn-rate calculations (server action + background job stub).
- Comprehensive dashboard with interactive charts and visualizations:
  - Financial overview cards (balance, income vs expenses, savings rate, cash flow)
  - Interactive spending charts (donut, line, waterfall, bar charts)
  - Category-wise spending distribution with drill-down capabilities
  - Monthly trends and year-over-year comparisons
  - Top merchants analysis and spending patterns
- Smart insights generation:
  - Automated spending pattern detection
  - Budget variance alerts and recommendations
  - Anomaly detection for unusual transactions
  - Cashflow projections and saving opportunities
- Advanced chart components with responsive design and theme integration.
- Dashboard customization: layout preferences, chart selections, widget arrangements.
- Alerts scaffolding (in-app toasts/banners; email hooks stubbed).

Deliverables:
- /budgets and enhanced /dashboard pages with comprehensive analytics.
- /insights page for detailed analytics and advanced visualizations.
- Smart insights engine with automated alert generation.
- Customizable dashboard widgets and layout system.

Acceptance criteria:
- User can create budgets and see actual vs budget, with detailed projections.
- Dashboard displays comprehensive financial insights with interactive charts.
- Smart insights automatically detect patterns and generate actionable recommendations.
- All visualizations work seamlessly across different themes and screen sizes.
- Users can customize dashboard layout and chart preferences.

---

## Phase 5 – AU Bank Integration (Sandbox) + Provider Abstraction

Scope:
- Provider abstraction (Plaid/Basiq): get link token, exchange, list accounts, fetch transactions.
- OAuth/Link UI flow using aggregator SDK.
- Webhook endpoint(s) with signature verification and idempotent processing.
- Backfill jobs, account linking UI, reconnect flow basics.

Deliverables:
- /accounts page: connect/disconnect providers; list accounts.
- Webhooks wired; background sync jobs triggered.

Acceptance criteria:
- User can connect sandbox bank and see accounts & transactions imported.
- Idempotent webhook processing (no duplicates), errors logged.

---

## Phase 6 – Rules Engine v1 and Background Jobs

Scope:
- Rules CRUD (priority, match types: contains/regex/merchant/amount).
- Background job to reprocess rules against new transactions.
- Subscription detection (basic recurring heuristic) optional.

Deliverables:
- /rules page + job wiring (Inngest/Trigger.dev or cron-driven server actions).

Acceptance criteria:
- Rules apply automatically on new imports; user can re-run rules on selection.

---

## Phase 7 – Privacy, Export, User Preferences and Data Management

Scope:
- Data export (CSV/JSON) for transactions and categories.
- Enhanced user preferences management:
  - Theme and color scheme persistence
  - Dashboard layout customization
  - Chart and visualization preferences
  - Notification settings for insights and alerts
- Delete-my-data flow (soft then hard delete), audit logs for sensitive ops.
- Rate limiting and security headers; finalize auth scopes.
- Theme preference migration and user onboarding for theming options.

Deliverables:
- /settings data management section with comprehensive preference controls.
- Theme management interface with preview capabilities.
- User preference synchronization across devices.

Acceptance criteria:
- User can export data and fully delete their account data.
- Theme and dashboard preferences persist across sessions and devices.
- User onboarding includes theme selection and dashboard customization options.

---

## Phase 8 – Beta Hardening and Polish

Scope:
- Performance passes (DB indexes, query tuning, pagination).
- Chart rendering optimization and lazy loading for large datasets.
- Theme switching performance optimization.
- Observability dashboards, error budgets, smoke tests.
- Accessibility checks and final polish across all themes.
- Mobile responsiveness testing for dashboard and charts.
- Advanced animations and micro-interactions polish.

Deliverables:
- Beta build and invite-only launch docs.
- Performance benchmarks for dashboard and chart rendering.
- Accessibility audit report and compliance certification.

Acceptance criteria:
- No critical errors in Sentry for a smoke test session; core flows under p95=200ms server action time (indicative).
- Dashboard charts render smoothly with large datasets (1000+ transactions).
- All theme variants pass accessibility compliance tests.
- Mobile experience provides full functionality with optimized touch interactions.

---

## Review Process
- End of each phase: demo + checklist review against acceptance criteria.
- Changes captured in docs, with a short changelog.
- Next phase only starts after sign-off.

## Dependencies & Decisions
- Phase 0 outcome is required before Phase 1 and Phase 5.
- If aggregator onboarding is delayed, we can complete Phases 1–4 first and stub Phase 5.
- Chart library selection (Recharts vs Chart.js vs D3.js) should be finalized in Phase 1.
- Theme system architecture must be established in Phase 1 before dashboard development in Phase 4.

## Enhanced Features Implementation Notes

### Theming System:
- CSS custom properties (variables) approach for dynamic theming
- Theme state management with React Context and localStorage persistence
- Tailwind CSS configuration for theme-aware utilities
- Component-level theme prop support in shadcn/ui components

### Dashboard Analytics:
- Chart component abstraction layer for consistent theming across visualizations
- Progressive data loading for large transaction datasets
- Responsive chart sizing and mobile-optimized interactions
- Real-time data updates with optimistic UI patterns

### Smart Insights Engine:
- Background job architecture for insight generation
- Pattern detection algorithms for spending analysis
- Configurable alert thresholds and user notification preferences
- Machine learning pipeline preparation for Phase 2 enhancements

## Risks & Mitigations (per phases)
- Auth provider changes mid-flight → abstract auth session utils; keep adapters minimal.
- Neon connection limits in serverless → HTTP driver, pool-less connections, batch queries.
- Webhook volume and dupes → idempotency keys and retries with backoff.
- Chart rendering performance with large datasets → implement virtualization, lazy loading, and data aggregation.
- Theme switching causing layout shifts → CSS custom properties with stable measurements, preload theme assets.
- Complex dashboard state management → use React Query for server state, Zustand for client state, proper cache invalidation.
- Cross-browser theme compatibility → comprehensive testing matrix, fallback theme strategies.
