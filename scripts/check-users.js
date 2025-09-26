const { db } = require('./src/db/index.ts')
const { users } = require('./src/db/schema.ts')

async function checkUsers() {
  try {
    console.log('Checking users table...')
    const result = await db.select().from(users).limit(5)
    console.log('Users found:', result)
    console.log('Number of users:', result.length)
    if (result.length > 0) {
      console.log('Sample user structure:', result[0])
    }
  } catch (error) {
    console.error('Error querying users:', error)
  }
  process.exit(0)
}

checkUsers()
