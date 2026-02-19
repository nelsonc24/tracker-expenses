import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function checkData() {
  try {
    console.log('Checking database...')
    console.log('Database URL:', process.env.DATABASE_URL?.substring(0, 50) + '...')
    
    const count = await sql`SELECT COUNT(*) as count FROM transactions`
    console.log('\n📊 Total transactions:', count[0].count)
    
    const users = await sql`SELECT id, email FROM users LIMIT 5`
    console.log('\n👥 Users:', users)
    
    const txByUser = await sql`
      SELECT user_id, COUNT(*) as count
      FROM transactions
      GROUP BY user_id
    `
    console.log('\n💰 Transactions by user:', txByUser)
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkData()
