# One-Time Debt Payments Feature

## Overview
You can now track one-time debts in addition to recurring payment debts. This is perfect for:
- Medical bills
- One-time purchases
- Personal loans with lump-sum payment
- Settlement agreements
- Collections that need to be paid off once

## What's New

### Payment Frequency Options
When adding a debt, you now have 4 payment frequency options:
- **Weekly** - Payments due every week
- **Bi-weekly** - Payments due every 2 weeks  
- **Monthly** - Traditional monthly payments
- **One-time Payment** ⭐ NEW - For debts you plan to pay in full once

## How One-Time Debts Work

### Adding a One-Time Debt

1. **Go to Debts** → Click "Add Debt"
2. Fill in the debt details:
   - **Name**: e.g., "Medical Bill - Dr. Smith"
   - **Type**: Choose appropriate type (Medical, Personal, etc.)
   - **Creditor**: Who you owe
   - **Current Balance**: Total amount owed
   - **Interest Rate**: APR (can be 0% for interest-free debts)
   - **Payment Frequency**: Select **"One-time Payment"**
   - **Payment Amount**: Total you plan to pay

3. **What's Different for One-Time Debts:**
   - ✅ **No "Payment Due Day"** field (not needed!)
   - ✅ Label changes from "Minimum Payment" to "Payment Amount"
   - ✅ Helpful hints explain it will be marked paid once settled
   - ✅ Simplified workflow - just track and pay when ready

### Example Use Cases

#### Medical Bill
```
Name: Hospital Bill - Emergency Room
Type: Medical Debt
Creditor: City General Hospital
Current Balance: $2,850.00
Interest Rate: 0.00% (interest-free)
Payment Frequency: One-time Payment
Payment Amount: $2,850.00
```

#### Personal Debt
```
Name: Loan from Mom
Type: Personal Debt
Creditor: Mom
Current Balance: $500.00
Interest Rate: 0.00%
Payment Frequency: One-time Payment
Payment Amount: $500.00
```

#### BNPL Purchase
```
Name: Afterpay - New Laptop
Type: Buy Now Pay Later
Creditor: Afterpay
Current Balance: $1,200.00
Interest Rate: 0.00%
Payment Frequency: One-time Payment
Payment Amount: $1,200.00
```

## Linking Transactions to One-Time Debts

When you pay a one-time debt, you can link the transaction:

1. Go to **Transactions**
2. Find the payment transaction
3. Click menu (⋮) → **"Link to Debt Payment"**
4. Select your one-time debt
5. Fill in payment details
6. Click **"Link to Debt"**

The debt balance will update automatically!

## Auto-Completion

One-time debts will automatically be marked as **"Paid Off"** when:
- The current balance reaches $0.00
- You've linked payment(s) equal to or exceeding the original amount

## Benefits

✅ **Simple Tracking** - No need to set up recurring schedules  
✅ **Flexible Payments** - Pay whenever you're ready  
✅ **Clear Goals** - Know exactly how much you need to pay  
✅ **Complete History** - Track all payments and interest  
✅ **Better Budgeting** - See all debts (recurring and one-time) in one place

## Database Schema

The `payment_frequency` field now accepts:
- `weekly`
- `biweekly`
- `monthly`
- `one_time` ⭐ NEW

The `payment_due_day` field is:
- **Required** for weekly, biweekly, monthly
- **Optional/Null** for one_time

## API Changes

### Validation Schema Updated
```typescript
paymentFrequency: z.enum(['weekly', 'biweekly', 'monthly', 'one_time'])
```

This ensures backward compatibility while supporting the new feature!

---

**Created**: October 4, 2025  
**Feature**: One-Time Debt Payment Support
