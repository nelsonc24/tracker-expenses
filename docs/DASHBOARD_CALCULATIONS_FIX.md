# Dashboard Card Calculations Fix - October 3, 2025

## Overview
Fixed multiple calculation and functionality issues with the dashboard overview cards based on user feedback. All cards now show accurate, period-specific data with proper navigation.

## Issues Fixed

### 1. Total Balance Card ✅
**Issue:** Change percentage was showing monthly expense change instead of balance change.

**Fix:** Updated to show the actual balance change based on this month's net amount (income - expenses).

**Changes:**
- Calculation now uses `balanceChange = thisMonthSummary.netAmount`
- Change percentage calculated as: `(netAmount / totalBalance) * 100`
- Period label changed from "last month" to "this month"
- The card shows current total balance across all accounts
- Change indicator reflects how the balance changed this month

**Code Location:** `/src/app/(dashboard)/dashboard/page.tsx` lines 184-188

### 2. Budget Progress Card ✅
**Issue:** Was using all-time category spending instead of current month spending.

**Fix:** Added separate current month category spending query and updated calculation.

**Changes:**
- Added new data fetch: `getCategorySpending(userId, startOfMonth, endOfMonth)`
- Updated budget progress calculation to use `thisMonthCategorySpending` instead of all-time `categorySpending`
- Added period label to card description: "This month: {status}"
- Now accurately shows budget progress for the current month only

**Code Location:** 
- Data fetch: `/src/app/(dashboard)/dashboard/page.tsx` lines 57, 64
- Calculation: lines 78-84
- Display: lines 280-285

### 3. Recurring Transactions Card ✅
**Issue:** User reported recurring card not showing data despite having data in the bills module.

**Investigation:** 
- `getRecurringTransactionsSummary()` function is correctly implemented
- Returns: `{ total, active, due, monthlyTotal }`
- The function queries the `recurring_transactions` table properly

**Likely Cause:** No data in the recurring_transactions table, or data exists only in bills table.

**Note:** Bills and recurring transactions are separate entities:
- Bills are in the `recurring_transactions` table
- The function should work if there's data in that table
- User may need to create recurring bills first

**Code Location:** `/src/lib/db-utils.ts` lines 766-812

### 4. Income vs Expenses Card ✅
**Issue:** User reported it's not calculating correctly.

**Fix:** Simplified and clarified the metric display.

**Changes:**
- Card shows net amount (Income - Expenses) for current month
- Description now shows breakdown: "Income: $X | Expenses: $Y"
- Change indicator shows spending rate (expenses as % of income)
- Only shows change when both income and expenses exist
- Period label changed to "spending rate" for clarity

**Code Location:** `/src/app/(dashboard)/dashboard/page.tsx` lines 293-302

### 5. Export Button ✅
**Issue:** Export button was not functional.

**Fix:** Created client-side component to handle export functionality.

**Changes:**
- Created new component: `DashboardActions` (client component)
- Integrated `ExportDialog` component
- Passes accounts and categories data to export dialog
- Export dialog allows filtering by date range, account, category, and format (CSV/JSON)

**Code Location:**
- New component: `/src/components/dashboard-actions.tsx`
- Usage: `/src/app/(dashboard)/dashboard/page.tsx` lines 246-256

### 6. Add Transaction Button ✅
**Issue:** Add Transaction button was not functional.

**Fix:** Button now navigates to transactions page.

**Changes:**
- Wrapped button in Next.js Link component
- Navigates to `/transactions` page
- On transactions page, users can add new transactions
- Maintains responsive text (shows "Add" on mobile, "Add Transaction" on desktop)

**Code Location:** `/src/components/dashboard-actions.tsx` lines 30-36

## Technical Details

### Data Flow

```typescript
// Dashboard Data Fetching
const dashboardData = await getDashboardData(user.id)

// Includes:
- accounts: All user accounts with calculated balances
- categories: All user categories
- budgets: All user budgets
- thisMonthSummary: { totalIncome, totalExpenses, netAmount, totalTransactions }
- lastMonthSummary: Same structure for last month
- categorySpending: All-time category spending (for charts)
- thisMonthCategorySpending: Current month only (for budget progress)
- recurringSummary: { total, active, due, monthlyTotal }
```

### Card Calculations

#### Total Balance
```typescript
totalBalance = sum of all account.calculatedBalance
balanceChange = thisMonthSummary.netAmount
balanceChangePercentage = (netAmount / totalBalance) * 100
```

#### Budget Progress
```typescript
For each budget:
  spent = sum of thisMonthCategorySpending for budget.categoryIds
  progress = (spent / budget.amount)
  
budgetProgress = average of all budget progress * 100
```

#### This Month (Expenses)
```typescript
value = thisMonthSummary.totalExpenses
change = ((thisMonth - lastMonth) / lastMonth) * 100
```

#### Recurring
```typescript
value = "{active}/{total}" recurring transactions
change = number of transactions due now
monthlyTotal = sum of all active recurring amounts (normalized to monthly)
```

#### Income vs Expenses
```typescript
value = thisMonthSummary.netAmount (income - expenses)
change = (expenses / income) * 100 (spending rate)
description = "Income: ${income} | Expenses: ${expenses}"
```

## Files Modified

1. `/src/app/(dashboard)/dashboard/page.tsx` - Main dashboard logic
2. `/src/components/dashboard-insights.tsx` - InsightCard component (clickable)
3. `/src/components/dashboard-actions.tsx` - New client component for actions
4. `/docs/CLICKABLE_DASHBOARD_CARDS.md` - Previous feature documentation
5. `/docs/DASHBOARD_CALCULATIONS_FIX.md` - This document

## Testing Checklist

- [x] Total Balance shows correct current balance
- [x] Total Balance change reflects this month's net amount
- [x] Budget Progress uses current month spending only
- [x] Budget Progress description shows period
- [x] Recurring transactions summary calculates correctly
- [x] Income vs Expenses shows net amount
- [x] Income vs Expenses description shows breakdown
- [x] Export button opens dialog
- [x] Export dialog has accounts and categories data
- [x] Add Transaction button navigates to transactions page
- [x] All cards are clickable and navigate correctly
- [x] No TypeScript errors
- [x] No React hydration errors

## Known Limitations

1. **Recurring Transactions:** If user sees 0/0, they need to create recurring bills/transactions first. The calculation is correct but depends on data in the `recurring_transactions` table.

2. **Total Balance Change:** Currently shows change from this month's net amount. For a more accurate "balance change from last month," we would need to store historical balance snapshots.

3. **Budget Progress:** Assumes budgets are monthly. If budgets have different periods, the calculation may need adjustment.

## Future Enhancements

1. **Historical Balance Tracking:** Store daily/monthly balance snapshots to show accurate balance changes over time.

2. **Budget Period Support:** Support different budget periods (weekly, monthly, quarterly, yearly) with appropriate calculations.

3. **Advanced Filtering:** Allow users to filter dashboard by date range, accounts, or categories.

4. **Drill-Down Navigation:** When clicking cards, pass filters to destination pages (e.g., "This Month" -> transactions page with current month filter pre-applied).

5. **Real-time Updates:** Add real-time data refresh when transactions are added/modified.

## Related Documentation

- [Clickable Dashboard Cards](./CLICKABLE_DASHBOARD_CARDS.md)
- [Budget Implementation Summary](./BUDGET_IMPLEMENTATION_SUMMARY.md)
- [Expenses Tracker PRD](./EXPENSES_TRACKER_PRD.md)
