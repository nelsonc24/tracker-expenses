import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

console.log('📊 Applying Notifications Migration to PRODUCTION...\n');
console.log('⚠️  WARNING: This will modify your PRODUCTION database!\n');

async function applyMigration() {
  try {
    // Get production DATABASE_URL from environment variable
    // Set this in your .env.local as PRODUCTION_DATABASE_URL before running
    const PROD_DATABASE_URL = process.env.PRODUCTION_DATABASE_URL;
    
    if (!PROD_DATABASE_URL) {
      console.error('❌ PRODUCTION_DATABASE_URL is not set');
      console.log('\n📝 To use this script:');
      console.log('   1. Uncomment the production DATABASE_URL in .env.local');
      console.log('   2. Temporarily set DATABASE_URL=<production-url>');
      console.log('   3. Run: npx tsx scripts/apply-notifications-migration-prod.ts');
      console.log('   4. Change DATABASE_URL back to development');
      console.log('\nOr just use the regular migration script after switching DATABASE_URL manually.');
      process.exit(1);
    }
    
    // Temporarily set the DATABASE_URL to production
    const originalUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = PROD_DATABASE_URL;

    const { db } = await import('../src/db');
    const { sql: rawSql } = await import('drizzle-orm');

    const migrationSQL = readFileSync(
      resolve(process.cwd(), 'drizzle/0003_notifications.sql'),
      'utf-8'
    );

    console.log('1️⃣ Connecting to PRODUCTION database...');
    console.log('   Database: ep-quiet-block-a7fcsd94 (PRODUCTION)');
    console.log('   ✅ Connected\n');

    console.log('2️⃣ Applying migration...');
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    let appliedCount = 0;
    let skippedCount = 0;

    for (const statement of statements) {
      try {
        await db.execute(rawSql.raw(statement));
        appliedCount++;
      } catch (err: unknown) {
        const error = err as Error;
        if (error.message?.includes('already exists')) {
          console.log(`   ⚠️  Skipping (already exists): ${statement.substring(0, 40)}...`);
          skippedCount++;
        } else {
          throw err;
        }
      }
    }

    console.log(`   ✅ Applied: ${appliedCount} statements`);
    console.log(`   ⏭️  Skipped: ${skippedCount} statements\n`);

    console.log('3️⃣ Verifying tables...');
    const result = await db.execute(rawSql.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('notifications', 'notification_preferences')
    `));
    
    console.log(`   ✅ Found ${result.rows.length} notification tables`);
    
    // Count existing notifications
    const notifCount = await db.execute(rawSql.raw(`
      SELECT COUNT(*) as count FROM notifications
    `));
    console.log(`   📊 Existing notifications: ${notifCount.rows[0].count}`);

    console.log('\n✅ SUCCESS! Production database is ready for notifications.');
    console.log('\n📝 Next steps:');
    console.log('   1. Deploy your app to Vercel');
    console.log('   2. Add RESEND_API_KEY to Vercel environment variables');
    console.log('   3. Add EMAIL_FROM to Vercel environment variables');
    console.log('   4. Verify cron job is set up in vercel.json');

    // Restore original DATABASE_URL
    process.env.DATABASE_URL = originalUrl;

  } catch (error: unknown) {
    const err = error as Error;
    console.error('\n❌ Error applying migration to production:', err.message);
    console.error('\nFull error:', err);
    process.exit(1);
  }
}

applyMigration();
