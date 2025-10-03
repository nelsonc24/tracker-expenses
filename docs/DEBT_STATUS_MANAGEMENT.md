# Debt Status Management

## Overview
Enhanced the Edit Debt functionality to properly manage debt status transitions, especially for paid-off debts that need to be reactivated or updated.

## Status Values
The debt `status` field supports the following values:
- `active` - Debt is currently being paid
- `paid_off` - Debt has been fully paid
- `in_collections` - Debt has been sent to collections
- `settled` - Debt was settled for less than full amount
- `archived` - Debt is archived for record-keeping

## Features Implemented

### 1. Status Field in Edit Dialog
- Added a dedicated Status dropdown in the EditDebtDialog
- Users can manually change the status of any debt
- Status changes are validated and saved to the database

### 2. Automatic Status Management
When editing a debt, the system automatically manages status transitions:

**Auto-activation of Paid-off Debts:**
- If a debt is marked as `paid_off` and the balance is increased to > $0
- Status automatically changes to `active`
- User receives a toast notification: "Status automatically changed to Active (balance > $0)"

**Balance to $0 Suggestion:**
- If the current balance is changed to $0 or less
- User receives a toast notification: "Balance is $0. Consider changing status to Paid Off."
- User can manually update the status if desired

### 3. Warning Alerts

**Paid-off with Balance Warning:**
```
⚠️ Warning: This debt is marked as Paid Off but has a balance of $X.XX. 
Consider changing the status to Active or updating the balance to $0.
```
- Shows when editing a debt that is marked as `paid_off` but has a balance > $0
- Helps users identify data inconsistencies

**Reactivation Notice:**
```
ℹ️ You are reactivating a paid-off debt. Make sure the balance and payment details are correct.
```
- Shows when manually changing status from `paid_off` to `active`
- Reminds users to verify all debt details are current

## User Workflows

### Scenario 1: Reactivating a Paid-off Debt
1. User clicks Edit on a debt with status `paid_off`
2. User increases the balance (e.g., from $0 to $500)
3. System automatically changes status to `active`
4. Toast notification confirms the automatic change
5. User can continue editing or save

### Scenario 2: Manually Marking as Paid Off
1. User clicks Edit on an active debt
2. User changes balance to $0
3. System suggests changing status to Paid Off
4. User manually changes status from `active` to `paid_off`
5. User saves the debt

### Scenario 3: Editing Paid-off Debt (Inconsistent Data)
1. User clicks Edit on a debt with status `paid_off` and balance $100
2. Warning alert appears highlighting the inconsistency
3. User can either:
   - Change status to `active` (debt is still owed)
   - Change balance to $0 (debt is actually paid off)
   - Leave as-is if intentional (e.g., overpayment scenario)

## API Changes

### Updated Endpoints
- **PUT /api/debts/[id]** - Now accepts `status` field in payload
- Validation schema updated to include `one_time` payment frequency
- Status field is optional in updates (maintains existing status if not provided)

### Validation Schema
```typescript
{
  status: z.enum(['active', 'paid_off', 'in_collections', 'settled', 'archived']).optional()
}
```

## Component Changes

### EditDebtDialog.tsx
**New Features:**
- Status field with dropdown selector
- Auto-update logic when balance changes
- Warning banners for status inconsistencies
- Toast notifications for automatic changes

**State Management:**
```typescript
const [formData, setFormData] = useState({
  // ... existing fields
  status: 'active',
})
const [showStatusWarning, setShowStatusWarning] = useState(false)
```

**Auto-update Logic:**
```typescript
if (debt.status === 'paid_off' && newBalance > 0) {
  updated.status = 'active'
  setShowStatusWarning(false)
  toast.info('Status automatically changed to Active (balance > $0)')
}
```

### DebtsPage.tsx
- Updated type assertion to include `status` field
- Status now passed to EditDebtDialog component

## Testing Checklist
- [x] Edit active debt → no warnings shown
- [x] Edit paid-off debt with $0 balance → no warnings
- [x] Edit paid-off debt with > $0 balance → warning shown
- [x] Change balance on paid-off debt from $0 to $100 → auto-changes to active
- [x] Change balance to $0 → suggestion to mark as paid off
- [x] Manually change status from paid_off to active → reactivation notice shown
- [x] Save changes with new status → persists to database
- [x] Validation accepts all status values

## Benefits
1. **Data Integrity** - Prevents inconsistent debt records (paid off with balance)
2. **User Experience** - Automatic status management reduces manual work
3. **Clarity** - Clear warnings and notifications guide users
4. **Flexibility** - Users can still manually override automatic changes if needed

## Future Enhancements
- [ ] Automatic status change to `paid_off` when final payment reduces balance to $0
- [ ] Status change history tracking
- [ ] Bulk status updates for multiple debts
- [ ] Status-based filtering and reporting
