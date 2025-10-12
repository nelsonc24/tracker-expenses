# Bill & Debt Notification System

This document describes the email notification system for bill and debt payment reminders.

## Overview

The notification system automatically sends email reminders to users when bills or debt payments are due soon. It uses:
- **Resend** for sending transactional emails
- **React Email** for beautiful, responsive email templates
- **Vercel Cron Jobs** for daily automated checks
- **Database tracking** for notification history and user preferences

## Features

✅ **Bill Reminders**
- Sends email reminders for upcoming bills based on user preferences
- Respects auto-pay status (different messaging for auto-pay bills)
- Customizable reminder days before due date (default: 3 days)
- Prevents duplicate notifications (won't send more than once per 24 hours)

✅ **Debt Payment Reminders**
- Sends reminders for upcoming debt payments
- Shows minimum payment amount and current balance
- Includes helpful tips about paying more than minimum
- Customizable reminder days before due date (default: 3 days)

✅ **User Preferences**
- Users can enable/disable notifications globally
- Separate controls for bills and debts
- Custom reminder days
- Preferred email address
- Quiet hours support (future enhancement)

✅ **Notification Tracking**
- All notifications are logged in the database
- Tracks delivery status (pending, sent, failed)
- Stores Resend message IDs for delivery tracking
- Error tracking and retry logic

## Environment Variables

Add these to your `.env.local` file:

```bash
# Resend API Key (get from https://resend.com/api-keys)
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Email from address (must be verified in Resend)
EMAIL_FROM="Expense Tracker <noreply@yourdomain.com>"

# App URL for email links
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Cron job security (generate a random string)
CRON_SECRET=your-random-secret-string
```

## Database Setup

1. **Run the migration:**
   ```bash
   # The migration file is already created at drizzle/0003_notifications.sql
   # Apply it to your database (method depends on your setup)
   ```

2. **Tables created:**
   - `notifications` - Tracks all sent notifications
   - `notification_preferences` - User notification settings

## Resend Setup

1. **Sign up for Resend:**
   - Go to https://resend.com
   - Create a free account (100 emails/day on free tier)

2. **Verify your domain (recommended):**
   - Add DNS records to verify your domain
   - This allows you to send from your@yourdomain.com
   - Without domain verification, you can only send to your own email

3. **Get API Key:**
   - Go to API Keys section
   - Create a new API key
   - Add it to your `.env.local` as `RESEND_API_KEY`

4. **Test the setup:**
   ```bash
   # You can test by manually calling the cron endpoint
   curl -X GET http://localhost:3001/api/cron/check-reminders \
     -H "Authorization: Bearer your-cron-secret"
   ```

## Cron Job Configuration

The system runs a daily check at 8 AM UTC via Vercel Cron Jobs.

**Schedule:** `0 8 * * *` (Every day at 8:00 AM UTC)

**What it does:**
1. Queries all active bills and debts due in the next 7 days
2. For each item, checks if it's within the reminder window
3. Verifies no duplicate notification was sent in the last 24 hours
4. Checks user preferences (are reminders enabled?)
5. Sends email via Resend
6. Logs notification to database

**To change the schedule:**
Edit `vercel.json` and modify the cron schedule using standard cron syntax.

## Email Templates

Email templates are located in `src/emails/`:

- `bill-reminder.tsx` - Bill payment reminder
- `debt-reminder.tsx` - Debt payment reminder

Both templates use React Email components for:
- Responsive design
- Beautiful styling
- Mobile-friendly layout
- Urgency indicators (color-coded by days until due)

## API Endpoints

### Cron Job Endpoint
`GET /api/cron/check-reminders`
- Protected by `CRON_SECRET` in authorization header
- Returns summary of notifications sent
- Automatically called by Vercel Cron

### Future Endpoints (to be implemented)
- `GET /api/notifications` - List user's notifications
- `POST /api/notifications/preferences` - Update user preferences
- `PATCH /api/notifications/:id/read` - Mark notification as read

## User Notification Preferences

Users can control their notification preferences:

```typescript
{
  emailNotificationsEnabled: true,      // Master switch
  billRemindersEnabled: true,           // Enable bill reminders
  billReminderDaysBefore: 3,           // Days before to remind
  debtRemindersEnabled: true,           // Enable debt reminders
  debtReminderDaysBefore: 3,           // Days before to remind
  preferredEmail: 'user@example.com',  // Override account email
  digestFrequency: 'daily',            // Future: digest mode
  quietHoursStart: '22:00',            // Future: quiet hours
  quietHoursEnd: '08:00',              // Future: quiet hours
}
```

## Notification Flow

```
Daily Cron Job (8 AM UTC)
    ↓
Check Bills & Debts Due Soon
    ↓
For Each Item:
    ├─→ Calculate days until due
    ├─→ Check if within reminder window
    ├─→ Check user preferences
    ├─→ Check for duplicate notifications
    └─→ Send email via Resend
        ├─→ Create notification record (pending)
        ├─→ Render email template
        ├─→ Send via Resend API
        └─→ Update notification record (sent/failed)
```

## Testing

### Manual Testing
```bash
# 1. Create a bill with a due date in 2-3 days
# 2. Ensure user has email notifications enabled
# 3. Run the cron job manually:
curl -X GET http://localhost:3001/api/cron/check-reminders \
  -H "Authorization: Bearer your-cron-secret"

# 4. Check your email inbox
# 5. Check the notifications table in the database
```

### Email Preview (Development)
```bash
# Install React Email dev tools
pnpm add -D @react-email/render

# Preview emails in browser
pnpm run email:dev
```

## Production Deployment

1. **Add environment variables to Vercel:**
   ```
   RESEND_API_KEY
   EMAIL_FROM
   NEXT_PUBLIC_APP_URL
   CRON_SECRET
   ```

2. **Deploy to Vercel:**
   ```bash
   pnpm run deploy:vercel
   ```

3. **Verify cron job is running:**
   - Check Vercel dashboard → Deployments → Cron Jobs
   - View execution logs

4. **Monitor notifications:**
   - Check database `notifications` table
   - View Resend dashboard for delivery stats
   - Set up error alerts if needed

## Troubleshooting

### Emails not sending
1. Check `RESEND_API_KEY` is set correctly
2. Verify domain in Resend dashboard
3. Check notification preferences are enabled
4. Review notification logs in database
5. Check Vercel cron job logs

### Duplicate notifications
- System prevents duplicates within 24 hours automatically
- Check `wasNotificationSentRecently()` logic
- Review `notifications` table for recent entries

### Cron not running
1. Verify `vercel.json` is deployed
2. Check Vercel dashboard for cron job status
3. Ensure `CRON_SECRET` matches between env and code
4. Check deployment region (some regions don't support cron)

## Future Enhancements

- [ ] Push notifications (Web Push API)
- [ ] SMS notifications via Twilio
- [ ] In-app notification center
- [ ] Notification digests (daily/weekly summaries)
- [ ] Quiet hours support
- [ ] Notification templates customization
- [ ] Multi-language support
- [ ] Rich notification analytics

## Cost Considerations

**Resend Pricing:**
- Free tier: 100 emails/day, 3,000/month
- Pro: $20/month for 50,000 emails
- Scale: Pay as you go

**Recommendations:**
- Start with free tier for testing
- Monitor usage in Resend dashboard
- Upgrade if you exceed limits
- Consider batch notifications for large user bases

## Support

For issues or questions:
1. Check this documentation
2. Review Resend documentation: https://resend.com/docs
3. Check React Email docs: https://react.email
4. Review notification logs in database
