# Spending Trend Chart Fix - October 3, 2025

## Issue Summary

The Spending Trend chart was displaying **incorrect totals** that didn't match the actual expenses shown in the transaction list. For example, on September 27, 2025:
- **Chart showed**: $480.34
- **Actual expenses**: $280.39
- **Discrepancy**: $199.95

## Root Cause

The chart was incorrectly including **BOTH income AND expenses** in the spending total, instead of only counting expenses.

### The Math That Revealed the Issue

Looking at the transaction data for Sep 27, 2025:
- Income: **+$199.95**
- Expenses: **-$280.39**
- Chart total: **$480.34** = $199.95 + $280.39 ✅ (all transactions)
- Expected: **$280.39** (expenses only) ❌

The code was using `Math.abs()` on ALL transactions, making both income (+) and expenses (-) positive numbers, then summing them together.

## The Fix

### Changes Made

**1. API Endpoint** (`src/app/api/analytics/spending-trend/route.ts`)

**Before:**
```typescript
const amount = Math.abs(parseFloat(transaction.amount))
spendingMap.set(key, (spendingMap.get(key) || 0) + amount)
```

**After:**
```typescript
// Only count expenses (negative amounts), not income
const amount = parseFloat(transaction.amount)
if (amount < 0) {
  const expense = Math.abs(amount)
  spendingMap.set(key, (spendingMap.get(key) || 0) + expense)
}
```

**2. Dashboard Page** (`src/app/(dashboard)/dashboard/page.tsx`)

**Before:**
```typescript
last30DaysTransactions.forEach(({ transaction }) => {
  const date = transaction.transactionDate.toISOString().split('T')[0]
  const amount = Math.abs(parseFloat(transaction.amount))
  dailySpending.set(date, (dailySpending.get(date) || 0) + amount)
})
```

**After:**
```typescript
// Group transactions by date and sum ONLY expenses (negative amounts)
last30DaysTransactions.forEach(({ transaction }) => {
  const date = transaction.transactionDate.toISOString().split('T')[0]
  const amount = parseFloat(transaction.amount)
  // Only count expenses (negative amounts)
  if (amount < 0) {
    const expense = Math.abs(amount)
    dailySpending.set(date, (dailySpending.get(date) || 0) + expense)
  }
})
```

### Additional Improvements from Earlier Fix

Also fixed timezone issue in chart display (`src/components/charts.tsx`):
- Date labels now parse correctly without timezone shifts
- Tooltip shows full date (e.g., "Sep 27, 2025") for clarity
- Label changed from "Amount" to "Spending"

## Expected Behavior After Fix

✅ **Spending Trend chart only counts expenses**  
✅ **Income transactions are excluded from the trend**  
✅ **Chart totals match transaction page expense totals**  
✅ **Dates display correctly without timezone issues**  

## Example

For September 27, 2025:
- Transactions:
  - Kmart: -$4.00
  - McDonald's: -$4.40
  - Credit Card Payment: -$200.00
  - Fast Transfer (income): +$199.95
  - Point cook: -$50.00
  - M & C* Momo: -$21.99

**Before fix**: $480.34 (all absolute values)  
**After fix**: $280.39 (expenses only) ✅

## Files Modified

1. `src/app/api/analytics/spending-trend/route.ts` - Filter income from API
2. `src/app/(dashboard)/dashboard/page.tsx` - Filter income from initial data
3. `src/components/charts.tsx` - Fix timezone issue and improve tooltip

## Deployment

```bash
# Committed and deployed
git commit -m "Fix: Spending Trend now excludes income, only shows expenses"
git push origin main
vercel --prod
```

## Testing

After deployment:
1. Navigate to Dashboard
2. Check Spending Trend chart for Sep 27, 2025
3. Verify it shows **$280.39** (not $480.34)
4. Compare with transaction list - should match exactly
5. Hover over chart points to see full date and amount

## Notes

- The chart name "Spending Trend" correctly implies it should only show spending (expenses)
- Income should never be counted in a "spending" metric
- This fix makes the chart accurate and matches user expectations
