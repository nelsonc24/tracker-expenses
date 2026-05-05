/**
 * Test script: sends a Telegram message to verify bot token + chat ID.
 * Usage: npx tsx scripts/test-telegram.ts
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '8658432153:AAEzlB4Pfg403y-M0HdB6r1LT5TqJbZ4peQ'
const CHAT_ID = '1567080569'

async function main() {
  console.log(`Sending test message to chat ${CHAT_ID}...`)

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: '✅ <b>Expense Tracker connected!</b>\n\nYour Telegram notifications are working. You\'ll receive bill, subscription, and debt payment reminders here.',
      parse_mode: 'HTML',
    }),
  })

  const json = await res.json()

  if (json.ok) {
    console.log('✅ Message sent successfully! Check your Telegram.')
    console.log(`   Message ID: ${json.result.message_id}`)
  } else {
    console.error('❌ Failed:', json.description)
    console.error('   Error code:', json.error_code)
  }
}

main()
