# ✅ Verify Your Resend Setup

Quick guide to verify your Resend email configuration is working correctly.

## Step 1: Quick Configuration Test (30 seconds)

Check if your environment variables are set correctly:

```bash
# Test Resend configuration (no email sent)
npx tsx scripts/test-resend.ts --check-only
```

**Expected output:**
```
✅ RESEND_API_KEY is set
✅ EMAIL_FROM is set to: ...
✅ Email template rendered successfully
✅ Configuration check complete!
```

## Step 2: Send a Test Email (1 minute)

Send yourself a test email to verify Resend is working:

```bash
# Replace with your actual email
npx tsx scripts/test-resend.ts your-email@example.com
```

**Expected output:**
```
✅ RESEND_API_KEY is set
✅ EMAIL_FROM is set
✅ Email template rendered successfully
✅ Email sent successfully!
   Message ID: abc123...
📬 Check your inbox at: your-email@example.com
```

**Then check:**
1. Your email inbox (may take a few seconds)
2. Spam/Junk folder (if not in inbox)
3. Resend dashboard: https://resend.com/emails

## Step 3: Test Complete System (2 minutes)

Test the entire notification system including database:

```bash
# Check database and system setup
npx tsx scripts/test-notification-system.ts
```

**This will verify:**
- ✅ Database connection
- ✅ Notification tables exist
- ✅ Users in database
- ✅ Bills and debts
- ✅ Notification preferences

**To send a real notification:**
```bash
# Creates a notification record and sends email
npx tsx scripts/test-notification-system.ts your-email@example.com
```

## Step 4: Test the Cron Endpoint (30 seconds)

Make sure your dev server is running:

```bash
# Terminal 1: Start dev server
pnpm dev
```

In another terminal:

```bash
# Terminal 2: Test cron endpoint
curl -X GET http://localhost:3001/api/cron/check-reminders \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Replace `YOUR_CRON_SECRET`** with the value from your `.env.local`

**Expected response:**
```json
{
  "success": true,
  "timestamp": "2025-10-12T...",
  "billsProcessed": 0,
  "billsNotified": 0,
  "debtsProcessed": 0,
  "debtsNotified": 0,
  "errors": []
}
```

## Common Issues & Fixes

### ❌ "RESEND_API_KEY is not set"

**Fix:** Add to `.env.local`:
```bash
RESEND_API_KEY=re_your_key_here
```

### ❌ "Domain not verified" or "403 Forbidden"

**For testing:**
```bash
# Use Resend's test domain
EMAIL_FROM="Expense Tracker <onboarding@resend.dev>"
```

**For production:**
1. Go to Resend dashboard → Domains
2. Add and verify your domain
3. Use `EMAIL_FROM="Expense Tracker <noreply@yourdomain.com>"`

### ❌ "notifications table does not exist"

**Fix:** Run the migration:
```bash
psql $DATABASE_URL < drizzle/0003_notifications.sql
```

### ❌ Email not arriving

**Check:**
1. ✅ Spam/Junk folder
2. ✅ Resend dashboard for delivery status
3. ✅ Correct email address
4. ✅ API key is valid

### ❌ "401 Unauthorized" on cron endpoint

**Fix:** Make sure the Authorization header matches your `CRON_SECRET`:
```bash
# Check your .env.local for CRON_SECRET value
cat .env.local | grep CRON_SECRET
```

## Test with Real Data

1. **Create a test bill:**
   - Go to your app
   - Create a bill with a due date 2-3 days from now
   - Make sure it's active

2. **Run the cron endpoint:**
   ```bash
   curl -X GET http://localhost:3001/api/cron/check-reminders \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

3. **Check the response:**
   - `billsProcessed` should be > 0
   - `billsNotified` should be > 0 (if within reminder window)
   - Check your email inbox!

4. **Verify in database:**
   ```sql
   SELECT * FROM notifications 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

## Production Checklist

Before deploying to production, verify:

- [ ] Resend API key is valid
- [ ] Domain verified in Resend (optional but recommended)
- [ ] Environment variables added to Vercel:
  - `RESEND_API_KEY`
  - `EMAIL_FROM`
  - `CRON_SECRET`
  - `NEXT_PUBLIC_APP_URL`
- [ ] Database migration applied
- [ ] Test email sent successfully
- [ ] Cron endpoint tested locally
- [ ] `vercel.json` includes cron configuration

## Quick Reference

**Environment Variables:**
```bash
RESEND_API_KEY=re_xxxxx
EMAIL_FROM="Expense Tracker <noreply@yourdomain.com>"
CRON_SECRET=your-secret
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

**Test Commands:**
```bash
# Configuration check
npx tsx scripts/test-resend.ts --check-only

# Send test email
npx tsx scripts/test-resend.ts your@email.com

# System check
npx tsx scripts/test-notification-system.ts

# Cron test
curl -X GET http://localhost:3001/api/cron/check-reminders \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Success Indicators

Your setup is working if:
- ✅ Test email arrives in inbox
- ✅ Email appears in Resend dashboard
- ✅ Cron endpoint returns `success: true`
- ✅ Notifications appear in database
- ✅ No errors in console

## Next Steps

Once verified:
1. Deploy to production
2. Add notification settings to your UI
3. Monitor the `notifications` table
4. Check Resend dashboard regularly

Need help? Check the full docs in `docs/NOTIFICATION_SYSTEM.md`
