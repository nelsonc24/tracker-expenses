/**
 * Test the complete notification system including database
 * Run with: npx tsx scripts/test-notification-system.ts
 */

// Load environment variables from .env.local FIRST
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

// Import after env is loaded
import { format } from 'date-fns'

async function testNotificationSystem() {
  console.log('🔍 Testing Complete Notification System...\n')
  
  try {
    // Dynamic imports after env is loaded
    const { db } = await import('../src/db')
    const { users, bills, debts, notifications, notificationPreferences } = await import('../src/db/schema')
    const { eq, and, isNotNull } = await import('drizzle-orm')
    const { sendBillReminderEmail } = await import('../src/lib/notifications/email-service')
    // Step 1: Check database connection
    console.log('1️⃣ Testing database connection...')
    await db.select().from(users).limit(1)
    console.log('✅ Database connected\n')
    
    // Step 2: Check if notification tables exist
    console.log('2️⃣ Checking notification tables...')
    try {
      await db.select().from(notifications).limit(1)
      console.log('✅ notifications table exists')
    } catch {
      console.error('❌ notifications table does not exist')
      console.log('   Run the migration: psql $DATABASE_URL < drizzle/0003_notifications.sql')
      return
    }
    
    try {
      await db.select().from(notificationPreferences).limit(1)
      console.log('✅ notification_preferences table exists\n')
    } catch {
      console.error('❌ notification_preferences table does not exist')
      console.log('   Run the migration: psql $DATABASE_URL < drizzle/0003_notifications.sql')
      return
    }
    
    // Step 3: Check for users
    console.log('3️⃣ Checking for users in database...')
    const allUsers = await db.select().from(users).limit(5)
    
    if (allUsers.length === 0) {
      console.log('⚠️  No users found in database')
      console.log('   Create a user by signing in to your app first')
      return
    }
    
    console.log(`✅ Found ${allUsers.length} user(s)`)
    allUsers.forEach((user, i) => {
      console.log(`   ${i + 1}. ${user.email} (${user.firstName || 'No name'})`)
    })
    console.log()
    
    // Step 4: Check for bills
    console.log('4️⃣ Checking for bills...')
    const allBills = await db
      .select()
      .from(bills)
      .where(and(eq(bills.isActive, true), isNotNull(bills.dueDate)))
      .limit(5)
    
    console.log(`   Found ${allBills.length} active bill(s) with due dates`)
    
    if (allBills.length > 0) {
      console.log('\n   📋 Bills found:')
      allBills.forEach((bill, i) => {
        const dueDate = bill.dueDate ? format(new Date(bill.dueDate), 'MMM dd, yyyy') : 'No due date'
        console.log(`   ${i + 1}. ${bill.name} - $${bill.amount} (Due: ${dueDate})`)
      })
    }
    console.log()
    
    // Step 5: Check for debts
    console.log('5️⃣ Checking for debts...')
    const allDebts = await db
      .select()
      .from(debts)
      .where(and(eq(debts.status, 'active'), isNotNull(debts.nextDueDate)))
      .limit(5)
    
    console.log(`   Found ${allDebts.length} active debt(s) with due dates`)
    
    if (allDebts.length > 0) {
      console.log('\n   💳 Debts found:')
      allDebts.forEach((debt, i) => {
        const dueDate = debt.nextDueDate ? format(new Date(debt.nextDueDate), 'MMM dd, yyyy') : 'No due date'
        console.log(`   ${i + 1}. ${debt.name} - $${debt.currentBalance} (Due: ${dueDate})`)
      })
    }
    console.log()
    
    // Step 6: Check notification preferences
    console.log('6️⃣ Checking notification preferences...')
    const prefs = await db.select().from(notificationPreferences).limit(5)
    
    if (prefs.length === 0) {
      console.log('   ℹ️  No notification preferences set yet')
      console.log('   They will be created automatically when users visit settings')
    } else {
      console.log(`   Found ${prefs.length} user(s) with preferences`)
      prefs.forEach((pref, i) => {
        console.log(`   ${i + 1}. Bills: ${pref.billRemindersEnabled ? '✅' : '❌'}, Debts: ${pref.debtRemindersEnabled ? '✅' : '❌'}`)
      })
    }
    console.log()
    
    // Step 7: Offer to send test email
    const testEmail = process.argv[2]
    
    if (!testEmail) {
      console.log('✅ System check complete!\n')
      console.log('📧 To send a test notification email, run:')
      console.log('   npx tsx scripts/test-notification-system.ts your-email@example.com')
      console.log('\n🔄 Or test the cron endpoint:')
      console.log('   curl -X GET http://localhost:3001/api/cron/check-reminders \\')
      console.log('      -H "Authorization: Bearer YOUR_CRON_SECRET"')
      return
    }
    
    console.log(`7️⃣ Sending test notification to ${testEmail}...\n`)
    
    // Send a test bill notification if bills exist
    if (allBills.length > 0 && allUsers.length > 0) {
      const testBill = allBills[0]
      const testUser = allUsers[0]
      
      const daysUntilDue = testBill.dueDate 
        ? Math.ceil((new Date(testBill.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 3
      
      console.log('   Sending bill reminder...')
      const result = await sendBillReminderEmail({
        userId: testUser.id,
        billId: testBill.id,
        billName: testBill.name,
        amount: `$${parseFloat(testBill.amount).toFixed(2)}`,
        dueDate: testBill.dueDate ? format(new Date(testBill.dueDate), 'MMM dd, yyyy') : 'TBD',
        daysUntilDue: Math.max(daysUntilDue, 0),
        isAutoPay: testBill.isAutoPay,
      })
      
      if (result.success) {
        console.log('   ✅ Test email sent successfully!')
        console.log(`   📧 Check your inbox: ${testEmail}`)
        console.log(`   💾 Notification ID: ${result.notificationId}`)
      } else {
        console.log(`   ❌ Failed to send: ${result.error}`)
      }
    } else {
      console.log('   ℹ️  No bills or users available for testing')
      console.log('   Create a bill in your app first, then run this test again')
    }
    
    // Check recent notifications
    console.log('\n8️⃣ Recent notifications:')
    const recentNotifications = await db
      .select()
      .from(notifications)
      .limit(5)
    
    if (recentNotifications.length === 0) {
      console.log('   No notifications sent yet')
    } else {
      recentNotifications.forEach((notif, i) => {
        const status = notif.status === 'sent' ? '✅' : notif.status === 'failed' ? '❌' : '⏳'
        console.log(`   ${i + 1}. ${status} ${notif.title} - ${notif.status}`)
      })
    }
    
    console.log('\n🎉 Testing complete!')
    
  } catch (error) {
    console.error('❌ Error during testing:', error)
    if (error instanceof Error) {
      console.log(`   ${error.message}`)
    }
  }
}

// Run the test
testNotificationSystem().catch(console.error)
