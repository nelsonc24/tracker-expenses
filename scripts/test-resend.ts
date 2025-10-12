/**
 * Test script to verify Resend email configuration
 * Run with: npx tsx scripts/test-resend.ts
 */

// Load environment variables from .env.local
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { resend, EMAIL_FROM } from '../src/lib/notifications/resend-client'
import { render } from '@react-email/components'
import { BillReminderEmail } from '../src/emails/bill-reminder'

async function testResendSetup() {
  console.log('🔍 Testing Resend Configuration...\n')
  
  // Step 1: Check environment variables
  console.log('1️⃣ Checking environment variables...')
  
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY is not set in environment variables')
    console.log('   Add it to your .env.local file')
    return
  }
  console.log('✅ RESEND_API_KEY is set')
  
  if (!process.env.EMAIL_FROM) {
    console.log('⚠️  EMAIL_FROM is not set, using default')
  } else {
    console.log(`✅ EMAIL_FROM is set to: ${process.env.EMAIL_FROM}`)
  }
  
  // Step 2: Test email rendering
  console.log('\n2️⃣ Testing email template rendering...')
  try {
    const emailHtml = await render(
      BillReminderEmail({
        billName: 'Test Bill',
        amount: '$99.99',
        dueDate: 'Oct 15, 2025',
        daysUntilDue: 3,
        isAutoPay: false,
        userName: 'Test User',
      })
    )
    console.log('✅ Email template rendered successfully')
    console.log(`   HTML length: ${emailHtml.length} characters`)
  } catch (error) {
    console.error('❌ Error rendering email template:', error)
    return
  }
  
  // Step 3: Test Resend API connection
  console.log('\n3️⃣ Testing Resend API connection...')
  console.log('   Please provide your email address to receive a test email:')
  console.log('   (Make sure you have access to this inbox)\n')
  
  // Get email from command line argument or use a default
  const testEmail = process.argv[2]
  
  if (!testEmail) {
    console.log('❌ No email address provided')
    console.log('\n📝 Usage: npx tsx scripts/test-resend.ts your-email@example.com')
    console.log('\nOr run this to test the API key only (without sending):')
    console.log('   npx tsx scripts/test-resend.ts --check-only')
    return
  }
  
  if (testEmail === '--check-only') {
    console.log('✅ Configuration check complete!')
    console.log('\n📧 To send a test email, run:')
    console.log('   npx tsx scripts/test-resend.ts your-email@example.com')
    return
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(testEmail)) {
    console.error('❌ Invalid email format')
    return
  }
  
  console.log(`   Sending test email to: ${testEmail}`)
  
  try {
    const emailHtml = await render(
      BillReminderEmail({
        billName: 'Test Internet Bill',
        amount: '$79.99',
        dueDate: 'Oct 15, 2025',
        daysUntilDue: 3,
        isAutoPay: false,
        userName: 'there',
      })
    )
    
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: testEmail,
      subject: '🔔 Test Bill Reminder - Expense Tracker',
      html: emailHtml,
    })
    
    if (error) {
      console.error('❌ Failed to send email:', error)
      console.log('\n🔧 Troubleshooting:')
      console.log('   - Check if your RESEND_API_KEY is valid')
      console.log('   - Verify your domain in Resend dashboard (for custom domains)')
      console.log('   - For testing, use EMAIL_FROM="onboarding@resend.dev"')
      console.log('   - Check Resend dashboard for detailed error logs')
      return
    }
    
    console.log('✅ Email sent successfully!')
    console.log(`   Message ID: ${data?.id}`)
    console.log(`\n📬 Check your inbox at: ${testEmail}`)
    console.log('   (It may take a few seconds to arrive)')
    
    console.log('\n🎉 Resend is configured correctly!')
    console.log('\n📊 Next steps:')
    console.log('   1. Check your email inbox')
    console.log('   2. View the email in Resend dashboard: https://resend.com/emails')
    console.log('   3. Run the cron test: curl -X GET http://localhost:3001/api/cron/check-reminders \\')
    console.log('      -H "Authorization: Bearer YOUR_CRON_SECRET"')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    if (error instanceof Error) {
      console.log(`   ${error.message}`)
    }
  }
}

// Run the test
testResendSetup().catch(console.error)
