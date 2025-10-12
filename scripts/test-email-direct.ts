#!/usr/bin/env tsx
/**
 * Direct test of Resend email sending
 * This ensures environment variables are loaded before initializing Resend
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables FIRST
config({ path: resolve(process.cwd(), '.env.local') });

// NOW import Resend after env vars are loaded
import { Resend } from 'resend';
import { render } from '@react-email/components';
import { BillReminderEmail } from '../src/emails/bill-reminder';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Expense Tracker <noreply@avilacode.tech>';

console.log('📧 Direct Resend Email Test\n');

console.log('1️⃣ Configuration:');
console.log(`   API Key: ${RESEND_API_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`   From: ${EMAIL_FROM}`);
console.log('');

if (!RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY is not set');
  process.exit(1);
}

// Get recipient email from command line
const recipientEmail = process.argv[2];

if (!recipientEmail) {
  console.log('Usage: npx tsx scripts/test-email-direct.ts your-email@example.com');
  process.exit(1);
}

async function sendTestEmail() {
  try {
    console.log('2️⃣ Initializing Resend client...');
    const resend = new Resend(RESEND_API_KEY);
    console.log('   ✅ Client initialized\n');

    console.log('3️⃣ Rendering email template...');
    const emailHtml = await render(
      BillReminderEmail({
        billName: 'Test Electric Bill',
        amount: '$125.50',
        dueDate: 'October 15, 2025',
        daysUntilDue: 3,
        isAutoPay: false,
      })
    );
    console.log(`   ✅ Template rendered (${emailHtml.length} chars)\n`);

    console.log(`4️⃣ Sending email to ${recipientEmail}...`);
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: recipientEmail,
      subject: '🧪 Test: Bill Payment Reminder',
      html: emailHtml,
    });

    console.log('   ✅ Email sent successfully!\n');
    console.log('📬 Result:', result);
    console.log('\n✅ SUCCESS! Check your inbox at:', recipientEmail);
    console.log('   (Don\'t forget to check spam folder)');

  } catch (error: any) {
    console.error('\n❌ Error sending email:');
    console.error(error);
    
    if (error.statusCode === 401) {
      console.log('\n🔧 API Key Issue:');
      console.log('   - The API key is invalid or revoked');
      console.log('   - Go to https://resend.com/api-keys');
      console.log('   - Create a new API key');
      console.log('   - Update RESEND_API_KEY in .env.local');
    } else if (error.statusCode === 403) {
      console.log('\n🔧 Domain/Email Issue:');
      console.log('   - Verify your domain at https://resend.com/domains');
      console.log('   - Or use your Resend account email as FROM address');
    }
  }
}

sendTestEmail();
