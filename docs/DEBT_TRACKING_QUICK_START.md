# Quick Start: Debt Tracking Feature

## 🚀 Getting Started (5 minutes)

### Step 1: Run Database Migration

Make sure you have your `DATABASE_URL` configured in your `.env.local` or `.env.prod` file, then run:

```bash
# For local development
pnpm drizzle-kit push

# Or if you need to specify environment
pnpm drizzle-kit push --config=drizzle.config.ts
```

This will create 5 new tables:
- `debts`
- `debt_payments`
- `debt_strategies`
- `debt_projections`
- `debt_milestones`

### Step 2: Start the Development Server

```bash
pnpm dev
```

### Step 3: Navigate to Debts

Open your browser and go to:
```
http://localhost:3000/debts
```

Or click on "Debts" in the sidebar navigation.

### Step 4: Add Your First Debt

1. Click the **"Add Debt"** button
2. Fill in the form:
   - **Debt Name:** "My Credit Card"
   - **Type:** Credit Card
   - **Creditor:** "Bank Name"
   - **Balance:** 5000.00
   - **Interest Rate:** 19.99
   - **Min Payment:** 150.00
   - **Frequency:** Monthly
3. Click **"Add Debt"**

That's it! You should see your debt in the dashboard with automatically calculated statistics.

---

## 🎯 What You Can Do Now

✅ **Add unlimited debts** (credit cards, loans, mortgages, etc.)  
✅ **View total debt** across all accounts  
✅ **See monthly payment obligations**  
✅ **Track weighted average interest rate**  
✅ **Analyze debt breakdown** by type and interest rate  
✅ **Delete debts** you've paid off  
✅ **Monitor YTD interest** paid  

---

## 📱 Quick Demo

### Example Debts to Add:

**Credit Card Debt**
- Name: Chase Sapphire
- Type: Credit Card
- Creditor: Chase Bank
- Balance: $4,500
- Interest: 18.99%
- Min Payment: $135
- Frequency: Monthly

**Car Loan**
- Name: Toyota Camry Loan
- Type: Car Loan
- Creditor: Toyota Financial
- Balance: $18,000
- Interest: 4.5%
- Min Payment: $350
- Frequency: Monthly

**Student Loan**
- Name: Federal Student Loan
- Type: Student Loan
- Creditor: Dept of Education
- Balance: $25,000
- Interest: 6.8%
- Min Payment: $200
- Frequency: Monthly

After adding these, you'll see:
- **Total Debt:** $47,500
- **Monthly Payments:** $685
- **Avg Interest:** ~7.8%

---

## 🔧 Troubleshooting

### Migration Fails?
```bash
# Check DATABASE_URL is set
echo $DATABASE_URL

# Try manual migration
psql $DATABASE_URL < drizzle/0002_debt_tracking.sql
```

### Can't see Debts page?
- Make sure you're logged in (Clerk authentication)
- Check that you're navigating to `/debts`
- Check browser console for errors

### API Errors?
- Verify database tables were created
- Check server logs for detailed errors
- Ensure you're authenticated

---

## 📚 Next Features Coming

Once you've added some debts, you'll be ready for:

1. **Payment Logging** - Log payments and watch your balances decrease
2. **Payoff Strategies** - Create debt snowball or avalanche plans
3. **Projections** - See when you'll be debt-free
4. **Charts** - Visual representations of your progress

---

## 📖 Documentation

- **Full PRD:** `/docs/DEBT_TRACKING_PRD.md`
- **Implementation Details:** `/docs/DEBT_TRACKING_IMPLEMENTATION.md`
- **Database Schema:** `/src/db/schema.ts` (lines 443+)

---

## 🎉 You're All Set!

Start tracking your debts and take control of your financial freedom! 💪
