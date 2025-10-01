# Budget Period Display and Auto-Reset Feature

## Overview

This feature implements automatic budget period tracking and reset functionality, allowing budgets to automatically renew when their period ends, with optional rollover of unused amounts.

## Features

### ✅ Implemented

1. **Period Display**
   - Human-readable period labels (e.g., "October 2025", "Q4 2025")
   - Status indicators (Active, Completed, Future, Cancelled)
   - Visual period badges on budget cards

2. **Automatic Reset**
   - Daily cron job checks for budgets needing reset
   - Configurable reset day for monthly budgets
   - Automatic creation of new periods when old ones end
   - Historical period tracking

3. **Rollover Support**
   - Four rollover strategies:
     - **Full**: Carry over all unused budget
     - **Partial**: Carry over a percentage (e.g., 50%)
     - **Capped**: Up to a maximum amount
     - **None**: Don't carry over
   - Configurable per budget

4. **Historical Tracking**
   - New `budget_periods` table tracks all periods
   - Performance metrics per period
   - Spending trends and analytics

5. **API Endpoints**
   - `GET /api/budgets/[id]/periods` - Get all periods
   - `GET /api/budgets/[id]/periods?current=true` - Get current period
   - `POST /api/budgets/[id]/periods` - Manually trigger reset
   - `GET /api/cron/budget-reset` - Cron job endpoint

## Database Schema

### New Tables

#### `budget_periods`
Tracks historical budget periods with spending data:
- Period start/end dates
- Allocated vs spent amounts
- Rollover amounts
- Performance metrics
- Status tracking

### Enhanced Tables

#### `budgets` (new columns)
- `is_recurring` - Whether budget auto-resets
- `current_period_start` - Current period start date
- `current_period_end` - Current period end date
- `next_reset_date` - When next reset occurs
- `auto_reset_enabled` - Enable/disable auto-reset
- `reset_day` - Day of month for reset (1-31)
- `rollover_unused` - Enable rollover
- `rollover_strategy` - 'full', 'partial', 'capped', 'none'
- `rollover_percentage` - For partial rollover (0-100)
- `rollover_limit` - Max amount for capped rollover

## Installation & Setup

### 1. Database Migration

Run the migration to create new tables and columns:

```bash
# Using the migration script
./scripts/migrate-budget-periods.sh

# Or manually with psql
psql $DATABASE_URL -f drizzle/0001_budget_periods.sql
```

### 2. Environment Variables

Add to your `.env.local`:

```bash
# Generate a secure secret
CRON_SECRET=$(openssl rand -hex 32)

# Optional: for manual reset triggers in production
ADMIN_API_KEY=your-admin-api-key
```

### 3. Vercel Configuration

The `vercel.json` file is already configured for daily cron job at 00:00 UTC:

```json
{
  "crons": [
    {
      "path": "/api/cron/budget-reset",
      "schedule": "0 0 * * *"
    }
  ]
}
```

On Vercel dashboard:
1. Go to Settings → Environment Variables
2. Add `CRON_SECRET` with the same value from `.env.local`
3. Deploy

### 4. Verify Installation

Test the cron job locally:

```bash
curl -X POST http://localhost:3000/api/cron/budget-reset \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Usage

### Creating a Budget with Auto-Reset

1. Navigate to Budgets page
2. Click "Create Budget"
3. Fill in basic details (name, amount, category)
4. **Budget Period Settings:**
   - ✅ Check "Automatically reset for next period"
   - Select reset day (for monthly budgets)
5. **Rollover Settings:**
   - ✅ Check "Roll over unused budget to next period"
   - Choose strategy:
     - Full (all unused carries over)
     - Partial (specify percentage)
     - Capped (specify max amount)
6. Save

### Viewing Budget History

1. Go to budget details
2. Click "View History" from dropdown menu
3. See:
   - All previous periods
   - Spending trends
   - Budget adherence
   - Rollover amounts

### Manual Reset

To manually trigger a budget reset:

```bash
curl -X POST https://your-app.vercel.app/api/budgets/[budget-id]/periods \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## How It Works

### Daily Cron Job

1. **Trigger**: Vercel Cron calls `/api/cron/budget-reset` daily at 00:00 UTC
2. **Find Budgets**: Query budgets where `next_reset_date <= NOW()`
3. **For Each Budget**:
   - Calculate spending for ending period
   - Determine rollover amount based on strategy
   - Mark current period as "completed"
   - Create new period with rollover
   - Update budget with new dates
4. **Return**: Summary of resets (successful/failed)

### Period Calculation

```typescript
// Weekly: +7 days
// Monthly: +1 month, on reset_day
// Quarterly: +3 months, on 1st
// Yearly: +1 year, on Jan 1st

const nextDate = calculateNextResetDate(current, period, resetDay)
```

### Rollover Logic

```typescript
// Full
rollover = unused

// Partial (50%)
rollover = unused * 0.5

// Capped ($100 max)
rollover = min(unused, 100)

// Next period
newBudget = baseAmount + rollover
```

## API Reference

### Get Budget Periods

```typescript
GET /api/budgets/[id]/periods

// Response
[
  {
    id: string
    periodStart: Date
    periodEnd: Date
    allocatedAmount: number
    rolloverAmount: number
    spentAmount: number
    status: 'active' | 'completed' | 'future'
    periodLabel: string
  }
]
```

### Get Current Period

```typescript
GET /api/budgets/[id]/periods?current=true

// Response
{
  id: string
  periodStart: Date
  periodEnd: Date
  totalBudget: number  // allocated + rollover
  spentAmount: number
  status: 'active'
}
```

### Trigger Manual Reset

```typescript
POST /api/budgets/[id]/periods

// Response
{
  success: true
  message: "Budget reset successfully"
  period: { ...newPeriod }
}
```

### Cron Job (Internal)

```typescript
GET /api/cron/budget-reset
Headers: { Authorization: "Bearer CRON_SECRET" }

// Response
{
  success: true
  totalBudgets: number
  successful: number
  failed: number
  duration: number
  timestamp: string
}
```

## Testing

### Test Period Calculation

```typescript
import { calculateNextResetDate, generatePeriodLabel } from '@/lib/db-utils'

const start = new Date('2025-10-01')
const period = 'monthly'
const resetDay = 15

const next = calculateNextResetDate(start, period, resetDay)
// Result: 2025-11-15

const label = generatePeriodLabel(start, next, period)
// Result: "October 2025"
```

### Test Rollover

```typescript
// Create budget with $500, spend $300
// Rollover strategy: Full
// Expected next period: $500 + $200 = $700

// Create budget with $500, spend $300
// Rollover strategy: Partial 50%
// Expected next period: $500 + $100 = $600

// Create budget with $500, spend $300
// Rollover strategy: Capped $50
// Expected next period: $500 + $50 = $550
```

### Test Cron Job

```bash
# Set up test budget with next_reset_date in the past
UPDATE budgets 
SET next_reset_date = NOW() - INTERVAL '1 day'
WHERE id = 'test-budget-id';

# Trigger cron
curl -X POST http://localhost:3000/api/cron/budget-reset \
  -H "Authorization: Bearer $CRON_SECRET"

# Check results
SELECT * FROM budget_periods 
WHERE budget_id = 'test-budget-id'
ORDER BY period_start DESC;
```

## Troubleshooting

### Cron Job Not Running

1. Check Vercel Logs for cron executions
2. Verify `CRON_SECRET` is set in Vercel env vars
3. Check `vercel.json` cron configuration
4. Ensure app is deployed (cron only works in production)

### Budget Not Resetting

1. Check `auto_reset_enabled = true`
2. Verify `next_reset_date` is in the past
3. Check logs for errors during reset
4. Manually trigger reset via API

### Rollover Not Working

1. Verify `rollover_unused = true`
2. Check `rollover_strategy` is not 'none'
3. For partial, check `rollover_percentage` is set
4. For capped, check `rollover_limit` is set
5. Ensure there's unused budget to rollover

### Migration Issues

```bash
# Check if migration already applied
psql $DATABASE_URL -c "\d budget_periods"

# Rollback if needed
psql $DATABASE_URL -c "DROP TABLE IF EXISTS budget_periods CASCADE;"
psql $DATABASE_URL -c "ALTER TABLE budgets DROP COLUMN IF EXISTS is_recurring;"
# ... etc

# Re-run migration
./scripts/migrate-budget-periods.sh
```

## Performance Considerations

### Indexes

The following indexes are created for optimal performance:

- `budgets_next_reset_idx` on `next_reset_date` (for cron queries)
- `budget_periods_budget_id_idx` on `budget_id`
- `budget_periods_period_idx` on `period_start, period_end`
- `budget_periods_status_idx` on `status`

### Cron Job Optimization

- Processes budgets in parallel using `Promise.allSettled()`
- Filters budgets at DB level (`WHERE next_reset_date <= NOW()`)
- Only processes budgets with `auto_reset_enabled = true`

### Query Optimization

```sql
-- Efficient query for finding budgets to reset
SELECT * FROM budgets 
WHERE is_active = true 
  AND auto_reset_enabled = true 
  AND next_reset_date <= NOW()
LIMIT 100;

-- Use prepared statements
-- Add connection pooling for cron job
```

## Future Enhancements

### Planned Features

1. **Notifications**
   - Email when budget resets
   - Push notifications for mobile
   - Slack/Discord webhooks

2. **Advanced Analytics**
   - Budget vs actual trending
   - Seasonal spending patterns
   - Predictive budget suggestions

3. **Budget Templates**
   - Save budget configurations
   - Quick setup for common budgets

4. **Shared Budgets**
   - Family/partner budget sharing
   - Combined spending tracking

5. **Smart Adjustments**
   - Auto-adjust based on spending patterns
   - ML-based budget recommendations

## Support

For issues or questions:
1. Check the PRD: `docs/BUDGET_PERIOD_AND_RESET_PRD.md`
2. Review migration logs
3. Check Vercel cron logs
4. Open an issue on GitHub

## License

Same as main project license.
