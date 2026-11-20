# 💰 ExpenseTracker - Australian Personal Finance Manager

A modern, feature-rich expense tracking application built with Next.js 15, featuring beautiful charts, CSV import capabilities, and smart financial insights.

![ExpenseTracker Dashboard](https://via.placeholder.com/800x400/0ea5e9/ffffff?text=ExpenseTracker+Dashboard)

## ✨ Features

### 🎨 **Modern UI & Theming**
- **Theme System**: Light, dark, and auto themes with seamless switching
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **shadcn/ui Components**: Beautiful, accessible UI components
- **Tailwind CSS v4**: Latest styling with CSS variables

### 📊 **Interactive Dashboard**
- **Real-time Charts**: Spending trends, category breakdowns, budget progress
- **Smart Insights**: AI-powered spending analysis and recommendations
- **Financial Overview**: Balance tracking, monthly summaries, trend analysis
- **Quick Actions**: Easy access to common tasks

### 💳 **Bank Integration & CSV Import**
- **Australian Banks**: Pre-configured templates for major AU banks
- **UBank Support**: Full compatibility with UBank CSV exports
- **Smart Parsing**: Automatic transaction categorization
- **Bulk Import**: Process hundreds of transactions at once

### 🔐 **Secure Authentication**
- **Clerk Integration**: Enterprise-grade authentication
- **User Management**: Profile management and preferences
- **Route Protection**: Secure dashboard and sensitive pages

### 💾 **Database & Performance**
- **Neon PostgreSQL**: Serverless, scalable database
- **Drizzle ORM**: Type-safe database operations
- **React Query**: Efficient data fetching and caching

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Neon account (for database)
- Clerk account (for authentication)

### 1. Clone & Install
```bash
git clone <your-repo>
cd tracker-expenses
npm install
```

### 2. Environment Setup
Copy `.env.local` and update with your credentials:

```bash
# Database (Neon)
DATABASE_URL=postgresql://username:password@host.neon.tech/dbname?sslmode=require

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### 3. Database Setup
```bash
# Generate migration files
npm run db:generate

# Push schema to database
npm run db:push

# (Optional) Open Drizzle Studio
npm run db:studio
```

#### Changing the schema and applying it (read this before touching the database)

**Do not run `pnpm db:migrate` against the Neon database.** Its `drizzle` migration log is empty (the tables were created outside Drizzle's migrator), so `db:migrate` tries to re-create every table from `0000` and fails with `relation "accounts" already exists`. `drizzle.config.ts` also only loads a file named `.env` (via `dotenv/config`), not `.env.local`, so `DATABASE_URL` must be exported in your shell.

Workflow when you change `src/db/schema.ts`:

1. **Generate the SQL** (this never touches the database; any dummy URL works):
   ```bash
   DATABASE_URL=postgres://u:p@localhost:5432/x pnpm db:generate
   ```
   Open the new `src/db/migrations/NNNN_*.sql` and check it. It must contain **only** your change (`ADD COLUMN`, `CREATE TABLE`, `CREATE INDEX`). If it contains `CREATE TABLE` for tables that already exist, delete those lines by hand (the snapshot in `src/db/migrations/meta` can lag behind).
2. **Make it re-runnable.** Copy the statements into a scratch file and add `IF NOT EXISTS` (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`). Put foreign keys inline in `CREATE TABLE`.
3. **Back up first.** In the Neon dashboard create a branch of the production database (instant, free restore point).
4. **Apply it in one transaction**, loading the URL from the env file without printing it:
   ```bash
   set -a && . ./.env.local && set +a
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -1 -f /path/to/your-change.sql
   ```
   `-1` wraps it in a single transaction (all or nothing) and `ON_ERROR_STOP` aborts on the first error.
5. **Verify** with a read-only query, for example:
   ```bash
   psql "$DATABASE_URL" -At -c "select column_name from information_schema.columns where table_name='transactions' and column_name='needs_review'"
   ```
6. Deploy the code **after** the columns exist (the app selects new columns, so deploying first causes errors).

Check which database you are pointing at before step 4. `.env.local` / `.env.vercel` use the `ep-blue-pine` Neon host; `.env.prod` uses a different one (`ep-quiet-block`). Never run migrations from another project folder (e.g. `expenses-tracker`): it has a different migration history.

Common errors:
- `password authentication failed`: stale or masked password in the connection string. Copy it again from Neon with "Show password" on.
- `relation "..." already exists` from `db:migrate`: see above, use the manual workflow.
- `column ... does not exist` at runtime: the migration was not applied to that database, or you deployed before applying it.

### 4. Start Development
```bash
npm run dev
```

Visit `http://localhost:3001` to see your app! 🎉

## 📖 Documentation

### Bank CSV Formats

#### UBank Format
```csv
Transaction Date,Effective Date,Description,Transaction Type,Debit Amount,Credit Amount,Balance
2024-01-15,2024-01-15,WOOLWORTHS 1234 SYDNEY NSW,Purchase,85.50,,1234.56
```

#### CommBank Format  
```csv
Date,Description,Amount,Balance
15/01/2024,WOOLWORTHS 1234,-85.50,1234.56
```

#### ANZ Format
```csv
Date,Description,Reference,Debit,Credit,Balance
15/01/2024,WOOLWORTHS 1234,REF123,85.50,,1234.56
```

### Project Structure
```
src/
├── app/                    # Next.js 15 App Router
│   ├── (dashboard)/       # Protected dashboard routes
│   ├── (auth)/           # Authentication pages
│   └── globals.css       # Global styles
├── components/           # Reusable UI components
│   ├── ui/              # shadcn/ui components
│   ├── charts.tsx       # Chart components
│   └── dashboard-insights.tsx
├── lib/                 # Utilities and configuration
│   ├── db/             # Database schema and connection
│   └── utils.ts        # Helper functions
└── middleware.ts       # Clerk authentication middleware
```

### Database Schema
- **Users**: User profiles and preferences
- **Accounts**: Bank accounts and connections
- **Transactions**: Financial transactions
- **Categories**: Expense categorization
- **Budgets**: Budget tracking and goals
- **Institutions**: Bank information

## 🛠️ Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run db:generate     # Generate migration files
npm run db:migrate      # Run migrations
npm run db:push         # Push schema changes
npm run db:studio       # Open Drizzle Studio

# Code Quality
npm run lint            # Run ESLint
```

## 🎯 Roadmap

### Phase 1 ✅ (Completed)
- [x] Project setup and theming
- [x] Authentication integration
- [x] Database schema design
- [x] Basic dashboard with charts
- [x] CSV import functionality

### Phase 2 🚧 (In Progress)
- [ ] Real transaction CRUD operations
- [ ] Advanced filtering and search
- [ ] Budget management system
- [ ] Category auto-suggestion

### Phase 3 📋 (Planned)
- [ ] Open Banking integration (Basiq)
- [ ] Advanced analytics and insights
- [ ] Expense splitting and sharing
- [ ] Mobile app (React Native)

## 🧪 Technology Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Framework** | Next.js 15 | React framework with App Router |
| **Language** | TypeScript | Type-safe development |
| **Styling** | Tailwind CSS v4 | Utility-first CSS framework |
| **UI Components** | shadcn/ui | Pre-built accessible components |
| **Charts** | Recharts | Interactive data visualization |
| **Authentication** | Clerk | User management and auth |
| **Database** | Neon PostgreSQL | Serverless database |
| **ORM** | Drizzle | Type-safe database operations |
| **State Management** | React Query | Server state management |
| **Theme** | next-themes | Dark/light mode support |

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [Clerk](https://clerk.com/) for authentication infrastructure
- [Neon](https://neon.tech/) for the serverless PostgreSQL database
- [Recharts](https://recharts.org/) for data visualization

---

**Built with ❤️ in Australia for Australian banking systems**

*Happy expense tracking! 📊✨*
