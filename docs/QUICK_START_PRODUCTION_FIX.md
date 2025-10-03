# Quick Start - Production Duplicate Fix

## 🚀 Fast Track (5 minutes)

### 1. Check Current State
```bash
npx tsx --env-file=.env.prod scripts/production-health-check.ts
```

This shows:
- How many duplicates exist
- Account balances (stored vs calculated)
- Categories and budgets count
- Overall database health

### 2. Remove Duplicates
```bash
npx tsx --env-file=.env.prod scripts/production-remove-duplicates.ts
```

This will:
- Show preview of what will be deleted
- Keep first occurrence of each duplicate
- Delete duplicate copies
- Update account balances
- Preserve categories and budgets

### 3. Verify Clean State
```bash
npx tsx --env-file=.env.prod scripts/production-health-check.ts
```

Should show: `✅ Database is healthy! No issues found.`

### 4. Deploy Code
```bash
git add src/lib/csv-processing.ts src/app/\(dashboard\)/import/page.tsx
git commit -m "Fix: Add Transaction ID support for duplicate detection"
git push origin main
```

Vercel will auto-deploy.

### 5. Test
- Go to https://tracker-expenses.avilacode.tech/import
- Upload UBank CSV
- Verify no false duplicates

## ✅ Done!

---

## Scripts Reference

| Script | Purpose | When to Run |
|--------|---------|-------------|
| `production-health-check.ts` | Check database health | Before & after cleanup |
| `production-remove-duplicates.ts` | Remove duplicate transactions | Once on production |
| `clear-all-transactions.ts` | Clear all transactions | Development only ⚠️ |

---

## Safety Notes

✅ **Safe to run:**
- `production-health-check.ts` - Read only
- `production-remove-duplicates.ts` - Only deletes duplicates, preserves everything else

⚠️ **Dangerous:**
- `clear-all-transactions.ts` - Deletes ALL transactions (dev only!)

---

## Environment Files

- `.env.local` - Development database
- `.env.prod` - Production database

Always double-check which env file you're using!

---

## Need Help?

See detailed guide: `docs/PRODUCTION_DUPLICATE_FIX.md`
