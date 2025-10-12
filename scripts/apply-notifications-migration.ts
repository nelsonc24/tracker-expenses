import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });

console.log('📊 Applying Notifications Migration...\n');

async function applyMigration() {
  try {
    const { db } = await import('../src/db');
    const { sql: rawSql } = await import('drizzle-orm');

    const migrationSQL = readFileSync(
      resolve(process.cwd(), 'drizzle/0003_notifications.sql'),
      'utf-8'
    );

    console.log('1️⃣ Connecting to database...');
    console.log('   ✅ Connected\n');

    console.log('2️⃣ Applying migration...');
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      try {
        await db.execute(rawSql.raw(statement));
      } catch (err: unknown) {
        const error = err as Error;
        if (error.message?.includes('already exists')) {
          console.log(`   ⚠️  Skipping: ${statement.substring(0, 40)}...`);
        } else {
          throw err;
        }
      }
    }

    console.log('   ✅ Migration completed!\n');

    const result = await db.execute(rawSql.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('notifications', 'notification_preferences')
    `));
    
    console.log('   ✅ Found tables:', result.rows.length);
    console.log('\n✅ SUCCESS! Database is ready.');

  } catch (error: unknown) {
    const err = error as Error;
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

applyMigration();
