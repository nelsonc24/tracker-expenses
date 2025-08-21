#!/bin/bash

echo "🚀 Setting up ExpenseTracker App"
echo "================================="
echo ""

echo "📋 Setup Checklist:"
echo ""
echo "1. Database Setup (Neon):"
echo "   - Visit https://neon.tech"
echo "   - Create a new project"
echo "   - Copy your connection string"
echo "   - Update DATABASE_URL in .env.local"
echo ""

echo "2. Authentication Setup (Clerk):"
echo "   - Visit https://clerk.com"
echo "   - Create a new application"
echo "   - Copy your API keys"
echo "   - Update NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY in .env.local"
echo ""

echo "3. Run Database Migration:"
echo "   npm run db:push"
echo ""

echo "4. Start the Development Server:"
echo "   npm run dev"
echo ""

echo "📝 Your .env.local should look like this:"
echo "DATABASE_URL=postgresql://username:password@host.neon.tech/dbname?sslmode=require"
echo "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here"
echo "CLERK_SECRET_KEY=sk_test_your_key_here"
echo "NEXT_PUBLIC_APP_URL=http://localhost:3001"
echo ""

echo "✨ Features included:"
echo "   - 🎨 Modern theme system (light/dark/auto)"
echo "   - 📊 Interactive dashboards with charts"
echo "   - 💳 CSV import (UBank, CommBank, ANZ, Westpac)"
echo "   - 🔐 Secure authentication with Clerk"
echo "   - 💾 PostgreSQL database with Drizzle ORM"
echo "   - 📱 Responsive design with shadcn/ui"
echo ""

echo "🎯 Ready to track your expenses! Happy coding ❤️"
