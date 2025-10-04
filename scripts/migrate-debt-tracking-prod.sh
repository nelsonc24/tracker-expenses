#!/bin/bash

# Debt Tracking Migration Script for PRODUCTION
# This script applies the debt_tracking migration to the PRODUCTION database

echo "🚀 Starting debt tracking migration for PRODUCTION..."
echo ""
echo "⚠️  WARNING: This will modify the PRODUCTION database!"
echo ""

# Production Database URL
PROD_DATABASE_URL="postgresql://neondb_owner:npg_i1svrW6xEONX@ep-quiet-block-a7fcsd94-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Confirm before proceeding
read -p "Are you sure you want to run this migration on PRODUCTION? (yes/no): " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]
then
    echo "❌ Migration cancelled"
    exit 1
fi

# Check if psql is available
if ! command -v psql &> /dev/null
then
    echo "❌ ERROR: psql command not found"
    echo "Please install PostgreSQL client tools"
    exit 1
fi

# Apply migration
echo "📝 Applying migration 0002_debt_tracking.sql to PRODUCTION..."
echo ""
psql "$PROD_DATABASE_URL" -f drizzle/0002_debt_tracking.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully on PRODUCTION!"
    echo ""
    echo "Summary of changes:"
    echo "  - Created debts table for debt tracking"
    echo "  - Created debt_payments table for payment history"
    echo "  - Created debt_strategies table for payoff strategies"
    echo "  - Created debt_projections table for future projections"
    echo "  - Created indexes for performance"
    echo "  - Added foreign key constraints"
    echo ""
    echo "Next steps:"
    echo "  1. Test debt creation in production"
    echo "  2. Verify all debt features work correctly"
    echo "  3. Monitor for any errors"
else
    echo ""
    echo "❌ Migration failed on PRODUCTION!"
    echo "Please check the error messages above and fix any issues"
    exit 1
fi
