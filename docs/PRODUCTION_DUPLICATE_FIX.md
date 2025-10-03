# Production Deployment Guide - Duplicate Transaction Fix

## Overview
This guide covers deploying the duplicate transaction fix to production safely, preserving all existing data (categories, budgets, transactions).

---

## What's Being Fixed

### The Problem
- Duplicate transactions in production database
- Hash generation used CSV account name (varies between exports) instead of accountId
- UBank Transaction IDs not being used for duplicate detection

### The Solution
1. **Remove existing duplicates** using production-safe script
2. **Deploy improved code** with Transaction ID support
3. **Future imports** will use Transaction ID as primary duplicate detector

---

## Pre-Deployment Checklist

- [ ] Backup production database
- [ ] Verify `.env.prod` has correct production DATABASE_URL
- [ ] Confirm production Clerk keys are active
- [ ] Test script on local/staging database first

---

## Step-by-Step Deployment

### Step 1: Backup Production Database

```bash
# Using Neon console or pg_dump
# For Neon: Go to your project dashboard → Backups → Create backup
```

**Neon Production Database:**
- Endpoint: `ep-quiet-block-a7fcsd94-pooler.ap-southeast-2.aws.neon.tech`
- Database: `neondb`

### Step 2: Test on Local Database First (Optional but Recommended)

```bash
# Switch to production database temporarily in .env.local
# Then run the script to see what it would do
npx tsx --env-file=.env.local scripts/production-remove-duplicates.ts
```

### Step 3: Run Duplicate Removal Script on Production

```bash
# Run the production-safe duplicate removal script
npx tsx --env-file=.env.prod scripts/production-remove-duplicates.ts
```

**What This Script Does:**
- ✅ Finds duplicate transactions (same date, description, amount, account)
- ✅ Keeps the FIRST occurrence of each duplicate
- ✅ Deletes only duplicate copies
- ✅ Updates account balances based on remaining transactions
- ✅ Preserves all categories and budgets
- ✅ Shows detailed preview before deletion

**Expected Output:**
```
🔍 Production Duplicate Removal Tool
📊 Total transactions in database: XXX
⚠️  Found XX groups with duplicates
🗑️  Deleting duplicates...
✅ Deleted XX duplicate transactions
💰 Updating account balances...
✨ Production cleanup complete!
```

### Step 4: Deploy Code Changes to Vercel

The following files contain the fix and should be deployed:

**Modified Files:**
1. `/src/lib/csv-processing.ts` - Extracts Transaction ID from UBank CSV
2. `/src/app/(dashboard)/import/page.tsx` - Passes Transaction ID to API
3. `/src/app/api/transactions/import/route.ts` - Already supports Transaction ID in hash

```bash
# Commit the changes
git add src/lib/csv-processing.ts
git add src/app/(dashboard)/import/page.tsx
git commit -m "Fix: Add Transaction ID support for duplicate detection

- Extract Transaction ID from UBank CSV files
- Pass Transaction ID through import flow
- Prioritize Transaction ID over composite hash
- Prevents false duplicates for same-day transactions"

# Push to main branch (triggers Vercel deployment)
git push origin main
```

### Step 5: Verify Deployment

1. **Check Vercel Deployment:**
   - Go to Vercel dashboard
   - Verify deployment succeeded
   - Check build logs for errors

2. **Test in Production:**
   - Navigate to https://tracker-expenses.avilacode.tech
   - Go to Import page
   - Select "UBank" as bank format
   - Upload a test CSV with potential duplicates
   - Verify no false duplicates are flagged

3. **Verify Account Balances:**
   - Check each account's balance
   - Compare with bank statements
   - Ensure balances match expected values

---

## What Changes for Future Imports

### Before (Old Behavior):
```typescript
// Hash used account name from CSV (inconsistent)
hash = SHA256(userId + date + description + amount + accountName)
// Result: Same transaction from different CSV exports = different hash = duplicate!
```

### After (New Behavior):
```typescript
// Priority 1: Use Transaction ID if available (UBank, some banks)
if (transactionId) {
  hash = SHA256(userId + accountId + transactionId)
}

// Priority 2: Fallback to composite hash with accountId (consistent)
else {
  hash = SHA256(userId + accountId + date + description + amount)
}
// Result: Unique Transaction ID = unique hash, OR consistent accountId-based hash
```

---

## Bank Format Support

| Bank | Transaction ID Support | Duplicate Detection Method |
|------|----------------------|---------------------------|
| UBank | ✅ Yes | Transaction ID (primary) |
| Commonwealth Bank | ❌ No | Composite hash (fallback) |
| ANZ | ❌ No | Composite hash (fallback) |
| Westpac | ❌ No | Composite hash (fallback) |
| NAB | ❌ No | Composite hash (fallback) |

---

## Rollback Plan (If Needed)

If something goes wrong:

1. **Restore Database Backup:**
   - Go to Neon dashboard
   - Select the backup created in Step 1
   - Restore to production branch

2. **Revert Code Changes:**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

---

## Post-Deployment Tasks

- [ ] Run duplicate removal script on production
- [ ] Verify 0 duplicates remain
- [ ] Deploy code to Vercel
- [ ] Test import with UBank CSV
- [ ] Test import with Commonwealth Bank CSV
- [ ] Verify account balances match bank statements
- [ ] Update this document with actual results

---

## Monitoring

### Check for Duplicates After Deployment:

Create a simple query script if needed:

```typescript
// scripts/check-production-duplicates.ts
import { db } from '../src/db/index'
import { transactions } from '../src/db/schema'

async function checkDuplicates() {
  const allTransactions = await db.select().from(transactions)
  
  const hashMap = new Map()
  let duplicates = 0
  
  for (const tx of allTransactions) {
    if (tx.duplicateCheckHash) {
      if (hashMap.has(tx.duplicateCheckHash)) {
        duplicates++
      }
      hashMap.set(tx.duplicateCheckHash, tx)
    }
  }
  
  console.log(`Total transactions: ${allTransactions.length}`)
  console.log(`Duplicates found: ${duplicates}`)
}

checkDuplicates()
```

Run with: `npx tsx --env-file=.env.prod scripts/check-production-duplicates.ts`

---

## Expected Outcomes

✅ **Duplicates Removed:** All duplicate transactions deleted from production  
✅ **Balances Correct:** Account balances match bank statements  
✅ **Categories Preserved:** All transaction categories unchanged  
✅ **Budgets Intact:** All budget data unchanged  
✅ **Future Proof:** New imports won't create duplicates  

---

## Support & Troubleshooting

### Issue: Script shows no duplicates but UI shows wrong balances
**Solution:** Run the balance recalculation manually:
```typescript
// Update account balance from sum of transactions
const accountTransactions = await db
  .select()
  .from(transactions)
  .where(eq(transactions.accountId, accountId))

const balance = accountTransactions.reduce((sum, tx) => 
  sum + parseFloat(tx.amount), 0
)

await db.update(accounts)
  .set({ balance: balance.toFixed(2) })
  .where(eq(accounts.id, accountId))
```

### Issue: Too many duplicates to process
**Solution:** Run script in batches or contact database admin

### Issue: Categories/budgets missing
**Solution:** This shouldn't happen - the script doesn't touch categories or budgets. Restore from backup if needed.

---

## Notes

- The production database uses connection pooling (`-pooler` endpoint)
- Always use `.env.prod` for production operations
- Test scripts on development database first when possible
- Keep backups for at least 30 days

---

Last Updated: October 3, 2025
