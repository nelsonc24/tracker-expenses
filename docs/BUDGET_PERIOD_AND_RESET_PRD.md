# Budget Period Display and Auto-Reset Feature - Product Requirements Document (PRD)

## Document Information
- **Feature**: Budget Period Display and Automatic Reset System
- **Date**: October 1, 2025
- **Status**: Specification Draft
- **Priority**: High
- **Type**: Feature Enhancement
- **Related PRDs**: EXPENSES_TRACKER_PRD.md

---

## 1. Overview and Problem Statement

### 1.1 Current State Analysis

**Existing Implementation:**
- ✅ Users can create budgets with period types: weekly, monthly, quarterly, yearly
- ✅ Budgets have `startDate` and optional `endDate` fields
- ✅ Budget progress is calculated based on transaction spending within the period
- ✅ Budget status indicators (on-track, warning, over-budget)

**Critical Issues Identified:**

1. **No Period Display:**
   - Users cannot see which period each budget covers (e.g., "October 2025" or "Q4 2025")
   - Start and end dates are used internally but not displayed to users
   - Makes it unclear which timeframe a budget applies to

2. **No Automatic Reset:**
   - Budgets do NOT reset when a period ends
   - A monthly budget created in September will continue tracking September's dates indefinitely
   - Users must manually create new budgets for each period
   - No mechanism to roll over unused budget amounts
   - No historical tracking of previous periods

3. **Period Calculation Issues:**
   - Budget period end dates are calculated inconsistently in the UI
   - Hard-coded assumptions about period length (e.g., 31 days for monthly)
   - No timezone-aware date handling

4. **Missing Budget History:**
   - No record of budget performance over time
   - Cannot compare current period vs previous periods
   - No trend analysis for budget adherence

### 1.2 User Impact

**User Pain Points:**
- 😕 "I created a monthly budget in August, but it's still showing August's spending in October"
- 😕 "I don't know if this budget is for this month or last month"
- 😕 "I have to manually create a new budget every month"
- 😕 "I can't see how my spending this month compares to last month"
- 😕 "My unused budget from last month is lost, I wanted to roll it over"

**Expected User Experience:**
- ✨ "I can clearly see this budget is for 'October 2025'"
- ✨ "My monthly budgets automatically reset on the 1st of each month"
- ✨ "I can optionally roll over unused budget to the next period"
- ✨ "I can view my budget history and see trends over time"
- ✨ "I get notified when a new budget period starts"

---

## 2. Feature Requirements

### 2.1 Period Display Enhancement

#### 2.1.1 Budget Period Label
**Requirement:** Display human-readable period labels for each budget

**Display Formats:**
- **Weekly**: "Week of Oct 1, 2025" or "Oct 1-7, 2025"
- **Monthly**: "October 2025"
- **Quarterly**: "Q4 2025" or "Oct-Dec 2025"
- **Yearly**: "2025"
- **Custom**: "Oct 1, 2025 - Dec 31, 2025"

**Implementation:**
- Add computed `periodLabel` property to budget display logic
- Show period prominently in budget card header
- Use relative labels when appropriate ("This Month", "Last Month", "This Year")

#### 2.1.2 Period Status Indicators
**Requirement:** Show whether a budget period is current, past, or future

**Status Types:**
- 🟢 **Active**: Current period budget
- 🔵 **Upcoming**: Future period budget
- ⚪ **Completed**: Past period budget

**Visual Design:**
- Badge/pill showing status on budget card
- Different visual styling for active vs historical budgets
- Clear indication of days remaining in current period

#### 2.1.3 Period Timeline View
**Requirement:** Visual timeline showing budget periods

**Features:**
- Month/Quarter/Year selector to navigate periods
- Calendar view showing which budgets cover which dates
- Ability to jump to specific periods quickly
- Visual indicators for gaps in budget coverage

---

### 2.2 Automatic Budget Reset

#### 2.2.1 Core Reset Mechanism

**Requirement:** Budgets automatically create new periods when the current period ends

**Database Schema Enhancement:**
```typescript
// Add to budgets table
interface BudgetEnhancements {
  // New fields
  isRecurring: boolean              // Whether budget auto-resets
  currentPeriodStart: Date          // Current active period start
  currentPeriodEnd: Date            // Current active period end
  nextResetDate: Date               // When next reset occurs
  rolloverUnused: boolean           // Roll over unused amounts
  rolloverLimit?: number            // Max amount to rollover
  
  // Metadata additions
  metadata: {
    color?: string
    notifications?: boolean
    rollover?: boolean              // Existing
    autoReset?: boolean             // NEW
    resetDay?: number               // Day of month/week for reset (1-31)
    rolloverStrategy?: 'full' | 'partial' | 'none'  // NEW
    rolloverPercentage?: number     // For partial rollover
  }
}
```

**New Budget History Table:**
```typescript
export const budgetPeriods = pgTable('budget_periods', {
  id: uuid('id').defaultRandom().primaryKey(),
  budgetId: uuid('budget_id').references(() => budgets.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  
  // Budget amounts for this period
  allocatedAmount: decimal('allocated_amount', { precision: 15, scale: 2 }).notNull(),
  rolloverAmount: decimal('rollover_amount', { precision: 15, scale: 2 }).default('0.00'),
  totalBudget: decimal('total_budget', { precision: 15, scale: 2 }).notNull(), // allocated + rollover
  spentAmount: decimal('spent_amount', { precision: 15, scale: 2 }).default('0.00'),
  remainingAmount: decimal('remaining_amount', { precision: 15, scale: 2 }),
  
  // Status tracking
  status: text('status').notNull(), // 'active', 'completed', 'future'
  utilizationPercentage: decimal('utilization_percentage', { precision: 5, scale: 2 }),
  
  // Performance metrics
  transactionCount: integer('transaction_count').default(0),
  averageDailySpend: decimal('average_daily_spend', { precision: 15, scale: 2 }),
  peakSpendingDay: timestamp('peak_spending_day'),
  
  // Metadata
  periodLabel: text('period_label').notNull(), // "October 2025", "Q4 2025", etc.
  notes: text('notes'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  budgetIdIdx: index('budget_periods_budget_id_idx').on(table.budgetId),
  userIdIdx: index('budget_periods_user_id_idx').on(table.userId),
  periodIdx: index('budget_periods_period_idx').on(table.periodStart, table.periodEnd),
  statusIdx: index('budget_periods_status_idx').on(table.status),
}))
```

#### 2.2.2 Reset Logic

**When Reset Occurs:**
- **Weekly**: Every Monday at 00:00 (or user-configured day)
- **Monthly**: 1st of each month at 00:00 (or user-configured day, e.g., 15th for pay cycle)
- **Quarterly**: 1st of Jan/Apr/Jul/Oct at 00:00
- **Yearly**: January 1st at 00:00

**Reset Process:**
1. Calculate final spending for ending period
2. Determine rollover amount (if enabled)
3. Close/complete current budget period record
4. Create new budget period record with:
   - New start/end dates
   - Base budget amount
   - Rollover amount (if applicable)
   - Status = 'active'
5. Send notification to user about new period
6. Update budget analytics

**Edge Cases:**
- What if user deletes budget mid-period? (Mark period as cancelled)
- What if user changes budget amount? (Apply to next period only)
- What if user changes period type? (Complete current period, start new type)
- What if user is inactive for multiple periods? (Create historical records)

#### 2.2.3 Rollover Strategies

**Option 1: Full Rollover**
- Entire unused amount carries to next period
- Next period budget = base amount + rollover

**Option 2: Partial Rollover**
- Percentage of unused amount rolls over (e.g., 50%)
- Next period budget = base amount + (rollover × percentage)

**Option 3: Capped Rollover**
- Rollover up to a maximum amount
- Next period budget = base amount + min(rollover, cap)

**Option 4: No Rollover**
- Unused budget is lost
- Next period starts fresh with base amount

**User Configuration:**
```typescript
interface RolloverSettings {
  enabled: boolean
  strategy: 'full' | 'partial' | 'capped' | 'none'
  partialPercentage?: number  // For partial (0-100)
  cappedAmount?: number       // For capped
}
```

#### 2.2.4 Background Jobs / Cron System

**Implementation Options:**

**Option A: Vercel Cron Jobs (Recommended)**
```typescript
// app/api/cron/budget-reset/route.ts
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Find all budgets needing reset
  const budgetsToReset = await findBudgetsNeedingReset()
  
  // Process each budget
  for (const budget of budgetsToReset) {
    await resetBudgetPeriod(budget)
  }

  return Response.json({ 
    success: true, 
    resetCount: budgetsToReset.length 
  })
}
```

**vercel.json:**
```json
{
  "crons": [{
    "path": "/api/cron/budget-reset",
    "schedule": "0 0 * * *"  // Daily at midnight UTC
  }]
}
```

**Option B: Client-Side Check (Fallback)**
- Check for needed resets when user loads budget page
- Show notification if budget needs reset
- Allow user to manually trigger reset

**Option C: Database Triggers (Advanced)**
- PostgreSQL scheduled jobs
- Requires database-level access

**Recommended Approach:** 
- Primary: Vercel Cron (Option A)
- Fallback: Client-side check (Option B)
- Hybrid: Cron runs daily, client checks on load for real-time updates

#### 2.2.5 Reset Notifications

**Notification Types:**
- 📧 Email: "Your [Budget Name] has reset for [Period]"
- 🔔 In-app: Toast notification on next login
- 📱 Push (future): Mobile app notification

**Notification Content:**
- Previous period summary (spent, saved, percentage)
- New period budget amount (including rollover)
- Quick actions: View budget, View history, Adjust budget

---

### 2.3 Budget History & Analytics

#### 2.3.1 Historical Period View

**Requirement:** View past budget periods and performance

**Features:**
- **Period List**: Chronological list of all budget periods
- **Period Comparison**: Side-by-side comparison of periods
- **Trend Charts**: 
  - Spending trends over time
  - Budget adherence percentage over time
  - Rollover amounts over time
- **Best/Worst Periods**: Highlight best and worst performing periods

**UI Components:**
- Period selector dropdown
- Historical data table
- Trend line charts
- Period-over-period comparison cards

#### 2.3.2 Budget Performance Metrics

**Per-Period Metrics:**
- Total allocated amount
- Total spent amount
- Remaining/overspent amount
- Utilization percentage
- Rollover amount received/sent
- Number of transactions
- Average transaction size
- Days in budget/days over budget

**Aggregate Metrics:**
- Average monthly spending (last 3/6/12 months)
- Budget adherence rate (% of periods under budget)
- Total rolled over in last year
- Spending volatility (standard deviation)

#### 2.3.3 Insights & Recommendations

**Automated Insights:**
- "You spent 15% less this month than last month"
- "You're consistently under budget - consider reducing by $X"
- "Your October spending is typically 20% higher than average"
- "You've been over budget for 3 consecutive months"

**Smart Recommendations:**
- Suggest budget adjustments based on historical patterns
- Recommend enabling rollover if consistently under budget
- Suggest increasing budget if frequently over
- Alert to seasonal spending patterns

---

## 3. User Interface Design

### 3.1 Budget Card Enhancements

**Current Budget Card (Active Period):**
```
┌─────────────────────────────────────────────────┐
│ 🟢 October 2025                    [... Menu]   │
│ Groceries Budget                                │
│                                                  │
│ $650 / $800                                     │
│ ████████████████░░░░  81%                       │
│                                                  │
│ 📊 Remaining: $150  📅 10 days left             │
│ 💰 Rollover from Sept: +$50                     │
└─────────────────────────────────────────────────┘
```

**Historical Budget Card:**
```
┌─────────────────────────────────────────────────┐
│ ⚪ September 2025 (Completed)     [View Details]│
│ Groceries Budget                                │
│                                                  │
│ $720 / $750                                     │
│ ████████████████████░  96%                      │
│                                                  │
│ ✅ Under budget by $30                          │
│ 💸 Rolled over: $30                             │
└─────────────────────────────────────────────────┘
```

### 3.2 Budget Creation/Edit Dialog

**New Fields to Add:**

```
Budget Settings
├── Basic Info
│   ├── Name
│   ├── Amount
│   ├── Category
│   └── Description
├── Period Settings ⭐ NEW
│   ├── Period Type (weekly/monthly/quarterly/yearly)
│   ├── Start Date
│   ├── Auto-Reset ☑ (checkbox)
│   └── Reset Day (if applicable, e.g., "1st" or "15th")
└── Rollover Settings ⭐ ENHANCED
    ├── Enable Rollover ☑
    ├── Rollover Strategy (dropdown)
    │   ├── Full - Carry over all unused budget
    │   ├── Partial - Carry over X% of unused budget
    │   ├── Capped - Carry over up to $X maximum
    │   └── None - Don't carry over
    ├── Rollover Percentage (if partial)
    └── Rollover Cap (if capped)
```

### 3.3 Budget History View

**New Tab in Budgets Page:**
```
Tabs: [Current Period] [Budget History] [All Budgets]

Budget History - Groceries Budget
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Period Selector: [October 2025 ▼]

┌─────────────────────────────────────────────────┐
│  October 2025 Performance                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                  │
│  Spent: $650 / $800 (81%)                       │
│  Status: ✅ Under Budget                        │
│  Trend: ↓ 5% vs September                       │
│                                                  │
│  [View Transactions] [Compare Periods]          │
└─────────────────────────────────────────────────┘

Historical Trend (Last 6 Months)
┌─────────────────────────────────────────────────┐
│ $800 │     ●           ●                        │
│      │   ●   ●       ●   ●                      │
│ $600 │ ●       ●   ●       ●                    │
│      │                                          │
│      └───────────────────────────────────────  │
│      May  Jun  Jul  Aug  Sep  Oct              │
│                                                  │
│ ── Allocated  ── Spent  ── Remaining            │
└─────────────────────────────────────────────────┘

Period Comparison
┌──────────────┬─────────────┬─────────────┬──────┐
│ Period       │ Budget      │ Spent       │ Diff │
├──────────────┼─────────────┼─────────────┼──────┤
│ October 2025 │ $800        │ $650        │ -19% │
│ September    │ $750        │ $720        │ -4%  │
│ August       │ $750        │ $810        │ +8%  │
│ July         │ $700        │ $685        │ -2%  │
└──────────────┴─────────────┴─────────────┴──────┘
```

### 3.4 Reset Notification UI

**In-App Toast Notification:**
```
┌─────────────────────────────────────────────────┐
│ 🔄 Budget Reset                                 │
│                                                  │
│ Your "Groceries" budget has reset for October   │
│ 2025                                             │
│                                                  │
│ New budget: $800 (+$30 rollover from September) │
│                                                  │
│ [View Budget]  [Dismiss]                        │
└─────────────────────────────────────────────────┘
```

**Email Template:**
```
Subject: Your Groceries budget has reset for October 2025

Hi [Name],

Your monthly "Groceries" budget has automatically reset for the new 
period.

September 2025 Summary:
• Budgeted: $750
• Spent: $720 (96%)
• Saved: $30 ✅

October 2025 Budget:
• Base amount: $800
• Rollover bonus: +$30
• Total available: $830

[View Full Budget] [View History] [Adjust Settings]

Happy budgeting!
```

---

## 4. Technical Implementation

### 4.1 Database Migration

**Migration Steps:**

```sql
-- Migration: Add budget period tracking and auto-reset

-- 1. Add new columns to budgets table
ALTER TABLE budgets 
ADD COLUMN is_recurring BOOLEAN DEFAULT true,
ADD COLUMN current_period_start TIMESTAMP,
ADD COLUMN current_period_end TIMESTAMP,
ADD COLUMN next_reset_date TIMESTAMP,
ADD COLUMN rollover_unused BOOLEAN DEFAULT false,
ADD COLUMN rollover_limit DECIMAL(15, 2),
ADD COLUMN auto_reset_enabled BOOLEAN DEFAULT false,
ADD COLUMN reset_day INTEGER DEFAULT 1,
ADD COLUMN rollover_strategy TEXT DEFAULT 'none' 
  CHECK (rollover_strategy IN ('full', 'partial', 'capped', 'none')),
ADD COLUMN rollover_percentage INTEGER CHECK (rollover_percentage >= 0 AND rollover_percentage <= 100);

-- 2. Create budget_periods table
CREATE TABLE budget_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  
  allocated_amount DECIMAL(15, 2) NOT NULL,
  rollover_amount DECIMAL(15, 2) DEFAULT 0.00,
  total_budget DECIMAL(15, 2) NOT NULL,
  spent_amount DECIMAL(15, 2) DEFAULT 0.00,
  remaining_amount DECIMAL(15, 2),
  
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'future', 'cancelled')),
  utilization_percentage DECIMAL(5, 2),
  
  transaction_count INTEGER DEFAULT 0,
  average_daily_spend DECIMAL(15, 2),
  peak_spending_day TIMESTAMP,
  
  period_label TEXT NOT NULL,
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMP
);

-- 3. Create indexes
CREATE INDEX budget_periods_budget_id_idx ON budget_periods(budget_id);
CREATE INDEX budget_periods_user_id_idx ON budget_periods(user_id);
CREATE INDEX budget_periods_period_idx ON budget_periods(period_start, period_end);
CREATE INDEX budget_periods_status_idx ON budget_periods(status);

-- 4. Backfill existing budgets with initial period
INSERT INTO budget_periods (
  budget_id, 
  user_id, 
  period_start, 
  period_end, 
  allocated_amount, 
  total_budget, 
  status, 
  period_label
)
SELECT 
  id,
  user_id,
  start_date,
  COALESCE(end_date, start_date + INTERVAL '1 month'),
  CAST(amount AS DECIMAL),
  CAST(amount AS DECIMAL),
  CASE 
    WHEN end_date IS NULL OR end_date >= NOW() THEN 'active'
    ELSE 'completed'
  END,
  CASE period
    WHEN 'weekly' THEN 'Week of ' || TO_CHAR(start_date, 'Mon DD, YYYY')
    WHEN 'monthly' THEN TO_CHAR(start_date, 'Month YYYY')
    WHEN 'quarterly' THEN 'Q' || TO_CHAR(start_date, 'Q YYYY')
    WHEN 'yearly' THEN TO_CHAR(start_date, 'YYYY')
    ELSE TO_CHAR(start_date, 'Mon DD, YYYY')
  END
FROM budgets;

-- 5. Update budgets with current period tracking
UPDATE budgets SET
  current_period_start = start_date,
  current_period_end = COALESCE(end_date, start_date + INTERVAL '1 month'),
  next_reset_date = CASE 
    WHEN period = 'weekly' THEN start_date + INTERVAL '1 week'
    WHEN period = 'monthly' THEN start_date + INTERVAL '1 month'
    WHEN period = 'quarterly' THEN start_date + INTERVAL '3 months'
    WHEN period = 'yearly' THEN start_date + INTERVAL '1 year'
    ELSE start_date + INTERVAL '1 month'
  END,
  auto_reset_enabled = true;
```

### 4.2 Backend API Changes

**New API Endpoints:**

```typescript
// GET /api/budgets/[id]/periods - Get all periods for a budget
// GET /api/budgets/[id]/periods/[periodId] - Get specific period
// GET /api/budgets/[id]/periods/current - Get current active period
// POST /api/budgets/[id]/reset - Manually trigger budget reset
// GET /api/budgets/[id]/history - Get budget history with analytics

// New utility functions in lib/db-utils.ts

/**
 * Calculate next reset date based on period type
 */
export function calculateNextResetDate(
  currentDate: Date,
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly',
  resetDay?: number
): Date {
  const next = new Date(currentDate)
  
  switch (period) {
    case 'weekly':
      next.setDate(next.getDate() + 7)
      break
    case 'monthly':
      next.setMonth(next.getMonth() + 1)
      next.setDate(resetDay || 1)
      break
    case 'quarterly':
      next.setMonth(next.getMonth() + 3)
      next.setDate(1)
      break
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1)
      next.setMonth(0)
      next.setDate(1)
      break
  }
  
  return next
}

/**
 * Generate human-readable period label
 */
export function generatePeriodLabel(
  startDate: Date,
  endDate: Date,
  period: string
): string {
  const start = new Date(startDate)
  
  switch (period) {
    case 'weekly':
      return `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    case 'monthly':
      return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    case 'quarterly':
      const quarter = Math.floor(start.getMonth() / 3) + 1
      return `Q${quarter} ${start.getFullYear()}`
    case 'yearly':
      return start.getFullYear().toString()
    default:
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }
}

/**
 * Find budgets that need to be reset
 */
export async function findBudgetsNeedingReset(): Promise<SelectBudget[]> {
  const now = new Date()
  
  return await db
    .select()
    .from(budgets)
    .where(
      and(
        eq(budgets.isActive, true),
        eq(budgets.autoResetEnabled, true),
        lte(budgets.nextResetDate, now)
      )
    )
}

/**
 * Reset a budget for a new period
 */
export async function resetBudgetPeriod(budget: SelectBudget): Promise<void> {
  const now = new Date()
  
  // 1. Calculate spending for ending period
  const currentPeriod = await db
    .select()
    .from(budgetPeriods)
    .where(
      and(
        eq(budgetPeriods.budgetId, budget.id),
        eq(budgetPeriods.status, 'active')
      )
    )
    .limit(1)
  
  if (currentPeriod.length === 0) return
  
  const period = currentPeriod[0]
  const spentAmount = await calculateBudgetSpending(
    budget.id,
    period.periodStart,
    period.periodEnd
  )
  
  const remaining = parseFloat(period.totalBudget) - spentAmount
  
  // 2. Calculate rollover amount
  let rolloverAmount = 0
  if (budget.rolloverUnused && remaining > 0) {
    switch (budget.rolloverStrategy) {
      case 'full':
        rolloverAmount = remaining
        break
      case 'partial':
        rolloverAmount = remaining * ((budget.rolloverPercentage || 0) / 100)
        break
      case 'capped':
        rolloverAmount = Math.min(remaining, budget.rolloverLimit || 0)
        break
    }
  }
  
  // 3. Complete current period
  await db
    .update(budgetPeriods)
    .set({
      status: 'completed',
      spentAmount: spentAmount.toString(),
      remainingAmount: remaining.toString(),
      utilizationPercentage: ((spentAmount / parseFloat(period.totalBudget)) * 100).toFixed(2),
      completedAt: now
    })
    .where(eq(budgetPeriods.id, period.id))
  
  // 4. Create new period
  const newPeriodStart = new Date(budget.nextResetDate)
  const newPeriodEnd = calculateNextResetDate(newPeriodStart, budget.period as any, budget.resetDay)
  const newBudgetAmount = parseFloat(budget.amount)
  
  await db.insert(budgetPeriods).values({
    budgetId: budget.id,
    userId: budget.userId,
    periodStart: newPeriodStart,
    periodEnd: newPeriodEnd,
    allocatedAmount: newBudgetAmount.toString(),
    rolloverAmount: rolloverAmount.toString(),
    totalBudget: (newBudgetAmount + rolloverAmount).toString(),
    status: 'active',
    periodLabel: generatePeriodLabel(newPeriodStart, newPeriodEnd, budget.period),
    createdAt: now
  })
  
  // 5. Update budget with new dates
  const nextResetDate = calculateNextResetDate(newPeriodStart, budget.period as any, budget.resetDay)
  
  await db
    .update(budgets)
    .set({
      currentPeriodStart: newPeriodStart,
      currentPeriodEnd: newPeriodEnd,
      nextResetDate: nextResetDate,
      updatedAt: now
    })
    .where(eq(budgets.id, budget.id))
  
  // 6. Send notification (TODO)
  // await sendBudgetResetNotification(budget, rolloverAmount)
}

/**
 * Calculate total spending for a budget in a period
 */
export async function calculateBudgetSpending(
  budgetId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const budget = await db
    .select()
    .from(budgets)
    .where(eq(budgets.id, budgetId))
    .limit(1)
  
  if (budget.length === 0) return 0
  
  const categoryIds = budget[0].categoryIds || []
  if (categoryIds.length === 0) return 0
  
  const transactions = await db
    .select()
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.userId, budget[0].userId),
        inArray(transactionsTable.categoryId, categoryIds),
        gte(transactionsTable.transactionDate, startDate),
        lte(transactionsTable.transactionDate, endDate)
      )
    )
  
  return transactions.reduce((sum, t) => {
    const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount
    return sum + Math.abs(amount)
  }, 0)
}
```

**Cron Job Implementation:**

```typescript
// app/api/cron/budget-reset/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { findBudgetsNeedingReset, resetBudgetPeriod } from '@/lib/db-utils'

export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find budgets needing reset
    const budgets = await findBudgetsNeedingReset()
    
    console.log(`[Budget Reset] Found ${budgets.length} budgets to reset`)

    // Reset each budget
    const results = await Promise.allSettled(
      budgets.map(budget => resetBudgetPeriod(budget))
    )

    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    console.log(`[Budget Reset] Completed: ${successful} successful, ${failed} failed`)

    return NextResponse.json({
      success: true,
      totalBudgets: budgets.length,
      successful,
      failed,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[Budget Reset] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
```

### 4.3 Frontend Changes

**Budget Display Component:**

```typescript
// components/budget-period-display.tsx
interface BudgetPeriodDisplayProps {
  budget: BudgetWithProgress
  currentPeriod?: BudgetPeriod
}

export function BudgetPeriodDisplay({ budget, currentPeriod }: BudgetPeriodDisplayProps) {
  const statusBadge = currentPeriod?.status === 'active' ? (
    <Badge variant="default" className="bg-green-500">
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        Active
      </div>
    </Badge>
  ) : currentPeriod?.status === 'completed' ? (
    <Badge variant="secondary">Completed</Badge>
  ) : (
    <Badge variant="outline">Upcoming</Badge>
  )

  const periodLabel = currentPeriod?.periodLabel || generatePeriodLabel(
    budget.currentPeriodStart,
    budget.currentPeriodEnd,
    budget.period
  )

  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">{periodLabel}</h3>
        {statusBadge}
      </div>
      {budget.autoResetEnabled && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              Auto-resets {budget.period}ly
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}
```

---

## 5. Implementation Plan

### Phase 1: Foundation (Week 1-2)
- ✅ Database schema design and migration
- ✅ Create `budget_periods` table
- ✅ Add new columns to `budgets` table
- ✅ Backfill historical data
- ✅ Update TypeScript types

### Phase 2: Core Reset Logic (Week 2-3)
- ✅ Implement period calculation utilities
- ✅ Build budget reset logic
- ✅ Create cron job endpoint
- ✅ Set up Vercel cron configuration
- ✅ Add client-side fallback checks

### Phase 3: UI Updates (Week 3-4)
- ✅ Add period display to budget cards
- ✅ Update budget creation/edit dialogs
- ✅ Add rollover configuration UI
- ✅ Implement period status indicators

### Phase 4: History & Analytics (Week 4-5)
- ✅ Build budget history view
- ✅ Create period comparison UI
- ✅ Add trend charts
- ✅ Implement performance metrics

### Phase 5: Notifications & Polish (Week 5-6)
- ✅ In-app reset notifications
- ✅ Email notifications (optional)
- ✅ User preferences for notifications
- ✅ Testing and bug fixes
- ✅ Documentation updates

---

## 6. Testing Strategy

### 6.1 Unit Tests
- Period calculation functions
- Rollover logic (full, partial, capped)
- Budget reset logic
- Period label generation

### 6.2 Integration Tests
- Budget creation with auto-reset enabled
- Period transition scenarios
- Rollover amount calculations
- Historical period queries

### 6.3 E2E Tests
- Create budget → Wait for period end → Verify reset
- Enable rollover → Underspend → Verify rollover applied
- Change budget amount → Verify only applies to next period
- Delete budget mid-period → Verify period marked cancelled

### 6.4 Edge Cases
- User inactive for multiple periods
- Budget deleted during active period
- Period type changed mid-period
- Timezone handling (UTC vs user timezone)
- Daylight saving time transitions
- Leap years for yearly budgets
- 31-day months vs 28-30 day months

---

## 7. Success Metrics

### 7.1 Adoption Metrics
- % of users enabling auto-reset on new budgets
- % of existing budgets converted to auto-reset
- % of users enabling rollover
- Average number of historical periods viewed per user

### 7.2 Engagement Metrics
- Reduction in manual budget creation
- Increase in budget page views
- Time spent on budget history/analytics
- Notification open rate

### 7.3 Business Metrics
- Improved budget adherence rate
- Reduction in over-budget occurrences
- Increase in user retention
- Positive user feedback on feature

### 7.4 Technical Metrics
- Cron job success rate (target: >99.5%)
- Average reset processing time
- Database query performance
- API response times for period queries

---

## 8. Future Enhancements

### 8.1 Advanced Features
- **Budget Templates**: Save and reuse budget configurations
- **Smart Budget Suggestions**: ML-based budget recommendations
- **Budget Sharing**: Share budgets with family/partner
- **Budget Goals**: Link budgets to savings goals
- **Seasonal Adjustments**: Auto-adjust budgets for known seasonal patterns
- **Budget Alerts**: Customizable alerts at 50%, 75%, 90%, 100%

### 8.2 Integrations
- **Calendar Integration**: Show budget periods in calendar
- **Slack/Discord Notifications**: Team budget notifications
- **Export to CSV/Excel**: Historical budget data export
- **API Access**: Allow third-party apps to access budget data

### 8.3 Analytics Enhancements
- **Predictive Analytics**: Forecast future spending based on trends
- **Anomaly Detection**: Alert on unusual spending patterns
- **Benchmark Comparisons**: Compare against similar users (anonymized)
- **AI Insights**: Natural language insights and recommendations

---

## 9. Open Questions & Decisions

### 9.1 Technical Decisions
- ❓ Should we use UTC or user's timezone for reset times?
  - **Recommendation**: UTC for cron, display in user's timezone
- ❓ What happens if a user changes their period type mid-period?
  - **Recommendation**: Complete current period, start new type on next reset
- ❓ Should we allow manual period resets in addition to automatic?
  - **Recommendation**: Yes, with confirmation dialog

### 9.2 Product Decisions
- ❓ Should rollover be enabled by default for new budgets?
  - **Recommendation**: No, make it opt-in with clear explanation
- ❓ How many historical periods should we keep?
  - **Recommendation**: Unlimited for now, add archival later if needed
- ❓ Should we support custom period lengths (e.g., every 2 weeks)?
  - **Recommendation**: Not in MVP, add in Phase 2

### 9.3 UX Decisions
- ❓ How should we handle budgets that span multiple periods (e.g., yearly budget viewed monthly)?
  - **Recommendation**: Show cumulative progress with period breakdown
- ❓ Should we show inactive/completed budgets by default?
  - **Recommendation**: No, require explicit filter/toggle
- ❓ How prominent should rollover amounts be in the UI?
  - **Recommendation**: Clearly visible but not overwhelming

---

## 10. Appendix

### 10.1 Related Documents
- EXPENSES_TRACKER_PRD.md - Main product requirements
- FEATURE_SPEC_EXPENSE_DETAILS_AND_GROUPING.md - Activity tracking spec

### 10.2 API Reference

**Budget Period Object:**
```typescript
interface BudgetPeriod {
  id: string
  budgetId: string
  userId: string
  periodStart: Date
  periodEnd: Date
  allocatedAmount: number
  rolloverAmount: number
  totalBudget: number
  spentAmount: number
  remainingAmount: number
  status: 'active' | 'completed' | 'future' | 'cancelled'
  utilizationPercentage: number
  transactionCount: number
  averageDailySpend: number
  peakSpendingDay: Date | null
  periodLabel: string
  notes: string | null
  createdAt: Date
  completedAt: Date | null
}
```

### 10.3 Database Schema Reference

See Section 4.1 for complete schema definitions.

### 10.4 UI Mockups

See Section 3 for detailed UI specifications and mockups.

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Oct 1, 2025 | AI Assistant | Initial PRD creation |

---

**End of Document**
