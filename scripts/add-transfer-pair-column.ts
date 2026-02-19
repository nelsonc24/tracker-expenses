import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function addColumn() {
  try {
    console.log('Checking if transfer_pair_id column exists...')
    
    const existingColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'transactions' 
      AND column_name = 'transfer_pair_id'
    `
    
    if (existingColumns.length > 0) {
      console.log('✅ Column already exists!')
      return
    }
    
    console.log('Adding transfer_pair_id column...')
    
    // Add the column
    await sql`ALTER TABLE "transactions" ADD COLUMN "transfer_pair_id" uuid`
    console.log('✅ Column added')
    
    // Add index
    await sql`CREATE INDEX IF NOT EXISTS "transactions_transfer_pair_id_idx" ON "transactions" ("transfer_pair_id")`
    console.log('✅ Index created')
    
    // Verify
    const verify = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'transactions' 
      AND column_name = 'transfer_pair_id'
    `
    console.log('✅ Verified:', verify)
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

addColumn()
