# Quick Start Guide: Bill & Debt Email Notifications

This guide will help you get email notifications up and running quickly.

## Prerequisites

- A Resend account (free tier is fine for testing)
- Access to your project's environment variables
- Database access (for running migrations)

## Setup Steps

### 1. Sign Up for Resend (5 minutes)

1. Go to [https://resend.com](https://resend.com)
2. Sign up for a free account (no credit card required)
3. Verify your email address

### 2. Get Your API Key (2 minutes)

1. In Resend dashboard, go to **API Keys**
2. Click **Create API Key**
3. Name it something like "Expense Tracker"
4. Copy the API key (starts with `re_`)

### 3. Configure Environment Variables (3 minutes)

Add these to your `.env.local` file:

```bash
# Resend API Key
RESEND_API_KEY=re_your_api_key_here

# Email from address (use your domain or resend's test domain)
EMAIL_FROM="Expense Tracker <onboarding@resend.dev>"

# Your app URL (for links in emails)
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Cron job security (generate a random string)
CRON_SECRET=$(openssl rand -base64 32)
```

**For production:**
```bash
EMAIL_FROM="Expense Tracker <noreply@yourdomain.com>"
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 4. Run Database Migration (2 minutes)

The migration file is already created. Apply it to your database:

**Option A: Using Drizzle Kit (recommended)**
```bash
# If you have DATABASE_URL set in .env
pnpm run db:push
```

**Option B: Manual SQL**
```bash
# Run the SQL file directly against your database
psql $DATABASE_URL < drizzle/0003_notifications.sql
```

**Option C: Using a DB client**
- Open your database client (Neon, Supabase, etc.)
- Copy and paste the contents of `drizzle/0003_notifications.sql`
- Execute the SQL

### 5. Verify Domain (Optional but Recommended)

**For testing:** Skip this step - you can send to your own email without verification.

**For production:**
1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the DNS records to your domain registrar
5. Wait for verification (usually 5-15 minutes)

### 6. Test the System (5 minutes)

#### A. Test Email Sending Manually

Create a test file `test-email.ts`:

```typescript
import { sendBillReminderEmail } from '@/lib/notifications/email-service'

async function testEmail() {
  const result = await sendBillReminderEmail({
    userId: 'your-clerk-user-id', // Get from Clerk dashboard
    billId: 'test-bill-id',
    billName: 'Internet Bill',
    amount: '$79.99',
    dueDate: 'Dec 15, 2025',
    daysUntilDue: 2,
    isAutoPay: false,
  })
  
  console.log('Result:', result)
}

testEmail()
```

Run it:
```bash
npx tsx test-email.ts
```

#### B. Test the Cron Endpoint

```bash
# Start your dev server
pnpm dev

# In another terminal, test the cron endpoint
curl -X GET http://localhost:3001/api/cron/check-reminders \
  -H "Authorization: Bearer your-cron-secret-from-env"
```

You should see:
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

#### C. Test with Real Data

1. Create a bill in your app with a due date 2-3 days from now
2. Make sure you have an email in the system (check `users` table)
3. Run the cron endpoint again
4. Check your email inbox!

### 7. Deploy to Production (10 minutes)

#### A. Add Environment Variables to Vercel

```bash
# Using Vercel CLI
vercel env add RESEND_API_KEY
vercel env add EMAIL_FROM
vercel env add CRON_SECRET
vercel env add NEXT_PUBLIC_APP_URL
```

Or add them in the Vercel dashboard:
1. Go to your project settings
2. Navigate to **Environment Variables**
3. Add each variable for Production, Preview, and Development

#### B. Deploy

```bash
pnpm run deploy:vercel
```

#### C. Verify Cron Job

1. Go to Vercel Dashboard → Your Project
2. Navigate to **Cron Jobs** tab
3. You should see: `check-reminders` scheduled for `0 8 * * *` (8 AM daily)

#### D. Test in Production

```bash
# Test the production cron endpoint
curl -X GET https://yourdomain.com/api/cron/check-reminders \
  -H "Authorization: Bearer your-production-cron-secret"
```

## Troubleshooting

### "Emails not sending"

**Check:**
1. ✅ Is `RESEND_API_KEY` set correctly?
2. ✅ Is `EMAIL_FROM` in the correct format?
3. ✅ Are notifications enabled in user preferences?
4. ✅ Check the `notifications` table - is status `failed`?
5. ✅ Check Resend dashboard for errors

**Common fixes:**
- If using a custom domain, verify it in Resend
- For testing, use `onboarding@resend.dev` as sender
- Check Resend logs for detailed error messages

### "Cron job not running"

**Check:**
1. ✅ Is `vercel.json` committed to git?
2. ✅ Did you redeploy after adding cron config?
3. ✅ Is `CRON_SECRET` set in Vercel env vars?
4. ✅ Check Vercel → Deployments → Logs

**Common fixes:**
- Redeploy your project
- Verify cron syntax in `vercel.json`
- Check deployment region (some don't support cron)

### "Getting 401 Unauthorized"

The cron endpoint is protected. Make sure:
1. Authorization header matches: `Bearer YOUR_CRON_SECRET`
2. `CRON_SECRET` env var is set
3. No extra spaces in the secret

### "Database errors"

**Check:**
1. ✅ Did migration run successfully?
2. ✅ Do tables exist? Run: `SELECT * FROM notifications LIMIT 1;`
3. ✅ Check foreign key constraints

**Fix:**
```bash
# Rerun migration
psql $DATABASE_URL < drizzle/0003_notifications.sql
```

## Next Steps

### Add Notification Settings to UI

Add the notification settings component to your settings page:

```tsx
import { NotificationSettings } from '@/components/notification-settings'

export default function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      <NotificationSettings />
    </div>
  )
}
```

### Monitor Notifications

Check the database:
```sql
-- Recent notifications
SELECT * FROM notifications 
ORDER BY created_at DESC 
LIMIT 10;

-- Failed notifications
SELECT * FROM notifications 
WHERE status = 'failed'
ORDER BY created_at DESC;

-- User preferences
SELECT * FROM notification_preferences
WHERE user_id = 'your-user-id';
```

### Customize Email Templates

Edit the templates in `src/emails/`:
- `bill-reminder.tsx` - Bill payment reminder
- `debt-reminder.tsx` - Debt payment reminder

Preview changes:
```bash
# Install React Email dev tools
pnpm add -D @react-email/render

# Add script to package.json
"email:dev": "email dev"

# Run preview server
pnpm run email:dev
```

## Cost Estimates

**Resend Free Tier:**
- 100 emails/day
- 3,000 emails/month
- Perfect for testing and small apps

**Example usage:**
- 10 users × 5 bills each × 1 reminder/bill = 50 emails/month
- Well within free tier!

**Paid tiers:**
- Pro: $20/month for 50,000 emails
- Scale: Pay as you go

## Support

Need help?
1. Check the full docs: `docs/NOTIFICATION_SYSTEM.md`
2. Review Resend docs: https://resend.com/docs
3. Check cron logs in Vercel dashboard
4. Query `notifications` table for error details

## Checklist

- [ ] Signed up for Resend
- [ ] Got API key
- [ ] Added environment variables
- [ ] Ran database migration
- [ ] Tested email sending
- [ ] Tested cron endpoint
- [ ] Created test bill with due date
- [ ] Received test email
- [ ] Deployed to production
- [ ] Verified cron job in Vercel
- [ ] Added notification settings to UI

✅ All done? Your notification system is live!
