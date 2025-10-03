# Spending Trend Chart Fix - October 3, 2025

## Issue Summary

The Spending Trend chart was displaying incorrect dates due to timezone conversion issues when parsing ISO date strings (YYYY-MM-DD format).

## Root Cause

When a date string like "2024-09-27" is passed to JavaScript's `Date` constructor:
```javascript
const d = new Date("2024-09-27")
```

JavaScript interprets this as **UTC midnight** (2024-09-27T00:00:00Z). Depending on the user's timezone, this could display as:
- **September 26** (in timezones west of UTC, like PST/PDT)
- **September 27** (in UTC and nearby timezones)
- **Could affect date calculations** in the chart rendering

### Example of the Problem
- User compares data for September 27th in transaction list ✅ (shows correct transactions)
- User looks at Spending Trend chart for September 27th ❌ (might show as Sep 26 or wrong total)
- **Discrepancy!** The date label might shift by ±1 day depending on timezone

## The Fix

### Changes Made in `src/components/charts.tsx`

**Before:**
```typescript
tickFormatter={(date) => {
  const d = new Date(date)  // ❌ UTC interpretation, timezone issues
  return `${d.getDate()}/${d.getMonth() + 1}`
}}
```

**After:**
```typescript
const formatDate = (dateStr: string, format: 'short' | 'long' = 'short') => {
  // Parse YYYY-MM-DD without timezone conversion
  const [year, month, day] = dateStr.split('-').map(Number)
  if (format === 'long') {
    const date = new Date(year, month - 1, day)  // ✅ Local timezone, correct date
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  return `${month}/${day}`  // ✅ Direct string manipulation, no timezone issues
}

tickFormatter={(date) => formatDate(date, 'short')}
```

### Additional Improvements

1. **Added date to tooltip**: Users can now see the full date (e.g., "Sep 27, 2024") when hovering over a chart point
2. **Consistent date parsing**: Both axis labels and tooltips use the same timezone-safe parsing method
3. **Better UX**: Tooltip now shows "Spending" instead of generic "Amount"

## Verification

### Debug Endpoint Created
A new debug endpoint was added: `/api/debug/spending-trend`

This endpoint compares:
- Dashboard page calculation (initial data)
- API endpoint calculation (dynamic data)
- Per-date transaction details

Usage:
```bash
# Get comparison data
curl "https://your-domain/api/debug/spending-trend"

# Get specific date details
curl "https://your-domain/api/debug/spending-trend?date=2024-09-27"
```

### Testing the Fix

1. **Local Testing**: 
   - Navigate to Dashboard
   - Check Spending Trend chart
   - Hover over data points to verify dates match tooltips

2. **Cross-Reference**:
   - Compare dates in Spending Trend chart
   - With transaction list dates
   - Should now match exactly

3. **Timezone Testing**:
   - Change system timezone
   - Dates should remain consistent
   - No ±1 day shifts

## Technical Details

### Why Direct String Parsing Works

```typescript
// BEFORE - Timezone dependent
const d = new Date("2024-09-27")  // Interprets as UTC midnight
// In PST (UTC-7): Shows as Sep 26, 5:00 PM
// In EST (UTC-5): Shows as Sep 26, 7:00 PM

// AFTER - Timezone independent
const [year, month, day] = "2024-09-27".split('-').map(Number)
const d = new Date(year, month - 1, day)  // Creates date in LOCAL timezone
// In PST: Shows as Sep 27, 12:00 AM PST
// In EST: Shows as Sep 27, 12:00 AM EST

// Even better for axis labels - no Date object needed
const formatDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number)
  return `${month}/${day}`  // Just string manipulation, perfect accuracy
}
```

## Files Modified

1. `src/components/charts.tsx` - Fixed date formatting in SpendingTrendChart
2. `src/app/api/debug/spending-trend/route.ts` - New debug endpoint
3. `scripts/verify-spending-trend.js` - Verification script (development use)

## Deployment

```bash
# Committed and pushed
git add -A
git commit -m "Fix: Correct timezone issue in Spending Trend chart date formatting"
git push origin main

# Deployed to production
vercel --prod
```

## Expected Behavior After Fix

✅ **Dates in Spending Trend chart match transaction list dates**
✅ **Tooltip shows full date (e.g., "Sep 27, 2024") and spending amount**
✅ **No timezone-related date shifts**
✅ **Consistent display across all timezones**

## Monitoring

If issues persist:
1. Check browser console for errors
2. Use debug endpoint to verify data aggregation
3. Clear browser cache (client-side caching might show old chart)
4. Verify the deployment was successful on Vercel

## Related Files

- `/src/app/(dashboard)/dashboard/page.tsx` - Dashboard data aggregation
- `/src/app/api/analytics/spending-trend/route.ts` - Dynamic trend data API
- `/src/components/spending-trend-card.tsx` - Trend card component
- `/src/components/charts.tsx` - Chart rendering logic (FIXED)

## Notes

- The data aggregation logic itself was correct
- The issue was purely in the **display/rendering** layer
- All dates are stored correctly in the database
- The fix ensures dates are displayed exactly as stored, without timezone interpretation
