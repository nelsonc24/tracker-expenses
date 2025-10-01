/**
 * Initialize existing budgets with proper period dates
 * This script sets up current_period_start, current_period_end, and next_reset_date
 * for budgets that don't have these values yet.
 */

const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL || process.argv[2];

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is required');
  console.log('Usage: node initialize-budget-periods-prod.js "postgresql://..."');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

function getStartOfMonth(date = new Date()) {
  const d = new Date(date);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function getEndOfMonth(date = new Date()) {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

function getNextResetDate(period, currentPeriodEnd) {
  const nextReset = new Date(currentPeriodEnd);
  nextReset.setDate(nextReset.getDate() + 1);
  nextReset.setHours(0, 0, 0, 0);
  return nextReset;
}

async function initializeBudgetPeriods() {
  try {
    console.log('🔍 Checking budgets...');

    // Get all budgets that need initialization
    const budgets = await sql`
      SELECT id, name, period, start_date, end_date, current_period_start
      FROM budgets
      WHERE current_period_start IS NULL OR current_period_end IS NULL OR next_reset_date IS NULL
    `;

    if (budgets.length === 0) {
      console.log('✅ All budgets already initialized!');
      return;
    }

    console.log(`📊 Found ${budgets.length} budgets to initialize:`);
    budgets.forEach(b => console.log(`   - ${b.name} (${b.period})`));
    console.log('');

    for (const budget of budgets) {
      console.log(`⚙️  Initializing: ${budget.name}`);

      let periodStart, periodEnd, nextReset;

      if (budget.period === 'monthly') {
        periodStart = getStartOfMonth();
        periodEnd = getEndOfMonth();
        nextReset = getNextResetDate(budget.period, periodEnd);
      } else if (budget.period === 'weekly') {
        // Start from current week's Monday
        periodStart = new Date();
        const day = periodStart.getDay();
        const diff = periodStart.getDate() - day + (day === 0 ? -6 : 1);
        periodStart.setDate(diff);
        periodStart.setHours(0, 0, 0, 0);
        
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + 6);
        periodEnd.setHours(23, 59, 59, 999);
        
        nextReset = getNextResetDate(budget.period, periodEnd);
      } else if (budget.period === 'quarterly') {
        const now = new Date();
        const currentMonth = now.getMonth();
        const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
        
        periodStart = new Date(now.getFullYear(), quarterStartMonth, 1);
        periodEnd = new Date(now.getFullYear(), quarterStartMonth + 3, 0, 23, 59, 59, 999);
        nextReset = getNextResetDate(budget.period, periodEnd);
      } else if (budget.period === 'yearly') {
        const now = new Date();
        periodStart = new Date(now.getFullYear(), 0, 1);
        periodEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        nextReset = getNextResetDate(budget.period, periodEnd);
      } else {
        // One-time budget
        periodStart = budget.start_date || new Date();
        periodEnd = budget.end_date || getEndOfMonth();
        nextReset = null; // No auto-reset for one-time budgets
      }

      // Update the budget
      await sql`
        UPDATE budgets
        SET 
          current_period_start = ${periodStart.toISOString()},
          current_period_end = ${periodEnd.toISOString()},
          next_reset_date = ${nextReset?.toISOString() || null},
          auto_reset_enabled = ${budget.period !== 'one-time'}
        WHERE id = ${budget.id}
      `;

      console.log(`   ✅ ${budget.name}: ${periodStart.toISOString().split('T')[0]} → ${periodEnd.toISOString().split('T')[0]}`);

      // Create initial budget period record
      await sql`
        INSERT INTO budget_periods (
          budget_id,
          user_id,
          period_start,
          period_end,
          allocated_amount,
          rollover_amount,
          total_budget,
          spent_amount,
          status,
          period_label
        )
        SELECT 
          id,
          user_id,
          ${periodStart.toISOString()},
          ${periodEnd.toISOString()},
          amount,
          0.00,
          amount,
          0.00,
          'active',
          ${`${budget.period} - ${periodStart.toISOString().split('T')[0]} to ${periodEnd.toISOString().split('T')[0]}`}
        FROM budgets
        WHERE id = ${budget.id}
        ON CONFLICT DO NOTHING
      `;
    }

    console.log('');
    console.log('✅ All budgets initialized successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   - Budgets updated: ${budgets.length}`);
    console.log(`   - Period records created: ${budgets.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
initializeBudgetPeriods()
  .then(() => {
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
