#!/bin/bash

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# Run the migration
echo "Running database migration..."
pnpm drizzle-kit push

echo "✅ Migration complete! The debts tables have been created."
