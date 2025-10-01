#!/bin/bash

# Budget Period Migration Script
# This script applies the budget_periods migration to the database

echo "🚀 Starting budget periods migration..."
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo "Please set DATABASE_URL to your PostgreSQL connection string"
    exit 1
fi

# Apply migration
echo "📝 Applying migration 0001_budget_periods.sql..."
psql $DATABASE_URL -f drizzle/0001_budget_periods.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "Summary of changes:"
    echo "  - Added auto-reset columns to budgets table"
    echo "  - Created budget_periods table for historical tracking"
    echo "  - Created indexes for performance"
    echo "  - Backfilled existing budgets with initial periods"
    echo ""
    echo "Next steps:"
    echo "  1. Set CRON_SECRET environment variable for the cron job"
    echo "  2. Deploy to Vercel to activate the cron job"
    echo "  3. Test budget creation with auto-reset enabled"
else
    echo ""
    echo "❌ Migration failed!"
    echo "Please check the error messages above and fix any issues"
    exit 1
fi
