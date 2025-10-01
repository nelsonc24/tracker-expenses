# Budget Auto-Reset - Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Run Database Migration (2 min)

```bash
# Make script executable (if not already)
chmod +x scripts/migrate-budget-periods.sh

# Run migration
export DATABASE_URL="your-postgresql-connection-string"
./scripts/migrate-budget-periods.sh
```

### Step 2: Configure Cron Secret (1 min)

```bash
# Generate secret
openssl rand -hex 32

# Copy output and add to .env.local
echo "CRON_SECRET=<paste-generated-secret>" >> .env.local
```

### Step 3: Add to Vercel (1 min)

1. Go to Vercel Dashboard → Your Project
2. Settings → Environment Variables
3. Add: `CRON_SECRET` = `<your-generated-secret>`
4. Save

### Step 4: Deploy (1 min)

```bash
git add .
git commit -m "feat: add budget auto-reset"
git push
```

Vercel will auto-deploy and activate the cron job!

## ✅ Verify It Works

### Test Locally

```bash
# Start dev server
npm run dev

# In another terminal, test cron
curl -X POST http://localhost:3000/api/cron/budget-reset \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Should return JSON with reset count
```

### Create Your First Auto-Reset Budget

1. Go to http://localhost:3000/budgets
2. Click **"Create Budget"**
3. Fill in:
   - Name: "Monthly Groceries"
   - Amount: 500
   - Category: Groceries
   - Period: Monthly
4. **Enable**: ✅ "Automatically reset for next period"
5. **Enable**: ✅ "Roll over unused budget to next period"
6. Choose rollover: "Full - Carry over all unused budget"
7. Click **"Create Budget"**

Done! Your budget will now auto-reset monthly 🎉

### Simulate a Reset (Optional)

```bash
# Connect to your database
psql $DATABASE_URL

# Set budget to reset immediately
UPDATE budgets 
SET next_reset_date = NOW() - INTERVAL '1 day'
WHERE name = 'Monthly Groceries';

# Trigger cron manually
curl -X POST http://localhost:3000/api/cron/budget-reset \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Check new period created
SELECT * FROM budget_periods 
WHERE budget_id = (SELECT id FROM budgets WHERE name = 'Monthly Groceries')
ORDER BY period_start DESC;
```

## 📊 Check Vercel Cron Logs

1. Vercel Dashboard → Your Project
2. Deployments → Latest
3. Functions → Look for `/api/cron/budget-reset`
4. See execution logs (runs daily at 00:00 UTC)

## 🎯 What Happens Next?

- **Every day at 00:00 UTC**: Cron job runs
- **Checks**: Budgets where `next_reset_date <= NOW()`
- **Resets**: Each expired budget automatically
  - Calculates spending
  - Applies rollover (if enabled)
  - Creates new period
  - Updates dates

## 🔧 Rollover Examples

### Full Rollover
```
Budget: $500
Spent: $300
Unused: $200

→ Next period: $500 + $200 = $700
```

### Partial (50%)
```
Budget: $500
Spent: $300
Unused: $200

→ Next period: $500 + $100 = $600
```

### Capped ($50 max)
```
Budget: $500
Spent: $100
Unused: $400

→ Next period: $500 + $50 = $550 (capped)
```

### None
```
Budget: $500
Spent: $300
Unused: $200

→ Next period: $500 + $0 = $500 (fresh start)
```

## 🐛 Troubleshooting

### Cron not running?
- Check `CRON_SECRET` is set in Vercel
- Verify `vercel.json` is committed
- Check Vercel logs for errors
- Cron only works in production (not preview)

### Budget not resetting?
- Verify `auto_reset_enabled = true`
- Check `next_reset_date` is in the past
- Look at cron logs for errors
- Try manual reset via API

### No rollover happening?
- Ensure `rollover_unused = true`
- Check `rollover_strategy` is not 'none'
- Verify there's unused budget (spent < allocated)
- Check `rollover_percentage` or `rollover_limit` settings

## 📚 More Resources

- **Full Documentation**: `docs/BUDGET_PERIOD_RESET_README.md`
- **PRD**: `docs/BUDGET_PERIOD_AND_RESET_PRD.md`
- **Implementation**: `docs/BUDGET_IMPLEMENTATION_SUMMARY.md`
- **Tests**: `tests/budget-period.test.ts`

## 🎉 You're Done!

Your budgets will now automatically reset and roll over unused amounts. Set it and forget it! 🚀

Need help? Check the docs or open an issue.
