# Linking Transactions to Debt Payments

## Overview

You can now link your existing bank transactions to debt payments, creating a complete audit trail of how your debt balances are being reduced over time.

## How to Link a Transaction to a Debt Payment

### Step 1: Navigate to Your Transactions
Go to the **Transactions** page from the sidebar.

### Step 2: Find the Payment Transaction
Locate the transaction that represents a payment toward one of your debts (e.g., credit card payment, loan payment).

### Step 3: Open the Actions Menu
Click the three-dot menu (⋮) on the right side of the transaction row.

### Step 4: Select "Link to Debt Payment"
Click on **"Link to Debt Payment"** from the dropdown menu.

### Step 5: Configure the Payment Details

The dialog will show:
- **Transaction Details**: The amount, description, and date from your bank transaction
- **Debt Account**: Select which debt this payment is for
- **Payment Breakdown**: 
  - **Principal Amount**: The portion that reduces your debt balance
  - **Interest Amount**: The portion that covers interest charges
  - **Fees**: Any late fees, processing fees, etc.
- **Extra Payment**: Check this if the payment was above the minimum payment
- **Notes**: Add any additional context

### Step 6: Save the Link
Click **"Link to Debt"** to create the connection.

## What Happens When You Link a Transaction?

1. ✅ A **debt payment record** is created
2. ✅ The payment is **linked to your transaction** (preserved in the database via `transactionId`)
3. ✅ The **debt balance is automatically updated** (reduced by the principal amount)
4. ✅ Your **payment history** is tracked
5. ✅ The transaction becomes part of your **debt payoff audit trail**

## Payment Breakdown Example

Let's say you made a $500 credit card payment:

```
Total Transaction Amount: $500.00
├─ Principal Amount: $450.00 (reduces balance)
├─ Interest Amount: $45.00 (interest charges)
└─ Fees: $5.00 (late fee)
```

The debt balance will be reduced by **$450.00** (the principal amount).

## Benefits of Linking Transactions

### 1. **Accurate Debt Tracking**
- See exactly which bank transactions paid down your debts
- Track the split between principal, interest, and fees

### 2. **Payment History**
- View a complete history of all payments made toward each debt
- Track your progress over time

### 3. **Interest Analysis**
- See how much you're paying in interest over time
- Identify opportunities to save by paying down high-interest debts faster

### 4. **Reconciliation**
- Verify that all your debt payments are accounted for
- Match bank transactions to debt balances

### 5. **Audit Trail**
- Maintain a complete record for tax purposes or financial planning
- Prove payment history if needed

## Use Cases

### Monthly Credit Card Payments
Link each monthly credit card payment to see:
- How much went to principal vs. interest
- Whether you're making progress on the balance

### Loan Payments
Track mortgage, car loan, or student loan payments:
- Monitor the principal paydown
- See how interest changes over time

### Extra Payments
Mark extra payments above the minimum to:
- Track your debt acceleration efforts
- See the impact of additional payments on your payoff timeline

### Multiple Debts
If you paid multiple debts in one month:
- Link each transaction to the corresponding debt
- Get a clear picture of your overall debt reduction

## Tips for Best Results

1. **Link payments regularly** - Don't wait too long to link transactions
2. **Be accurate with splits** - Properly categorize principal vs. interest for better insights
3. **Use notes** - Add context like "Extra payment from tax refund" or "Minimum payment"
4. **Check your debt statements** - Use your creditor's statement to get the exact principal/interest split

## Future Enhancements (Coming Soon)

- 🔄 **Automatic Suggestions**: The system will suggest transactions that might be debt payments based on amount and merchant
- 📊 **Payment History View**: See all linked transactions directly on the debt details page
- 📈 **Payoff Projections**: Calculate how long it will take to pay off debts based on historical payment patterns
- 💡 **Smart Recommendations**: Get suggestions on which debts to prioritize based on your payment history

## API Details (For Developers)

The debt payment API endpoint accepts a `transactionId` field:

```typescript
POST /api/debts/{debtId}/payments
{
  "transactionId": "uuid-of-transaction",
  "paymentDate": "2025-04-01",
  "principalAmount": "450.00",
  "interestAmount": "45.00",
  "feesAmount": "5.00",
  "paymentMethod": "bank_transfer",
  "isExtraPayment": false,
  "notes": "Monthly payment"
}
```

The `transactionId` creates a foreign key relationship between the `transactions` table and the `debt_payments` table, enabling complete transaction reconciliation.

## Database Schema

```sql
CREATE TABLE "debt_payments" (
  -- ... other fields
  "transaction_id" uuid REFERENCES "transactions"("id") ON DELETE SET NULL,
  -- ... other fields
);
```

If a transaction is deleted, the payment record remains but the `transaction_id` is set to `NULL`.

---

**Questions or Issues?**  
If you encounter any problems or have suggestions for improvements, please create an issue or contact support.
