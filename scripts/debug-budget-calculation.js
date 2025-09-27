#!/usr/bin/env node

/**
 * Debug script to test budget calculations
 * This script helps identify why budget spending calculations might be showing $0
 */

console.log('Budget Calculation Debug Script');
console.log('=====================================\n');

// Simulate the budget calculation logic
const simulateBudgetCalculation = () => {
  console.log('1. Testing budget calculation logic...');
  
  // Test with sample data
  const sampleTransactions = [
    { id: '1', amount: -50.00, description: 'Grocery Store', categoryId: 'groceries-id', date: '2025-09-25' },
    { id: '2', amount: -75.50, description: 'Supermarket', categoryId: 'groceries-id', date: '2025-09-26' },
    { id: '3', amount: 25.00, description: 'Refund', categoryId: 'groceries-id', date: '2025-09-27' }
  ];
  
  console.log('Sample transactions:', sampleTransactions);
  
  // Test the calculation logic
  const spentAmount = sampleTransactions.reduce((sum, t) => {
    const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount;
    console.log(`  Transaction: ${t.description} - Raw amount: ${amount}, Abs amount: ${Math.abs(amount)}`);
    const spendingAmount = amount < 0 ? Math.abs(amount) : amount;
    return sum + spendingAmount;
  }, 0);
  
  console.log(`Total calculated spending: $${spentAmount}`);
  console.log('');
};

// Test date range calculation
const testDateRange = () => {
  console.log('2. Testing date range calculation...');
  
  const budget = {
    name: 'Monthly Groceries',
    startDate: '2025-09-01T00:00:00Z',
    endDate: null // null means end of month
  };
  
  const budgetStart = new Date(budget.startDate);
  const budgetEnd = budget.endDate 
    ? new Date(budget.endDate) 
    : new Date(budgetStart.getFullYear(), budgetStart.getMonth() + 1, 0);
  
  console.log(`Budget start: ${budgetStart.toISOString().split('T')[0]}`);
  console.log(`Budget end: ${budgetEnd.toISOString().split('T')[0]}`);
  console.log(`Current date: ${new Date().toISOString().split('T')[0]}`);
  
  // Check if current date is within range
  const now = new Date();
  const isInRange = now >= budgetStart && now <= budgetEnd;
  console.log(`Is current date in budget range? ${isInRange}`);
  console.log('');
};

// Test API URL construction
const testAPIUrl = () => {
  console.log('3. Testing API URL construction...');
  
  const categoryId = 'sample-category-id';
  const budgetStart = new Date('2025-09-01');
  const budgetEnd = new Date('2025-09-30');
  
  const apiUrl = `/api/transactions?categoryId=${categoryId}&startDate=${budgetStart.toISOString().split('T')[0]}&endDate=${budgetEnd.toISOString().split('T')[0]}`;
  
  console.log(`API URL that would be called: ${apiUrl}`);
  console.log(`Full URL: http://localhost:3001${apiUrl}`);
  console.log('');
};

// Run all tests
const runTests = () => {
  simulateBudgetCalculation();
  testDateRange();
  testAPIUrl();
  
  console.log('Next steps:');
  console.log('1. Check browser console when loading the budgets page');
  console.log('2. Look for "=== BUDGET DEBUG: Monthly Groceries ===" output');
  console.log('3. Verify the category IDs and transaction amounts shown');
  console.log('4. Check if the date range matches your transactions');
  console.log('\nIf you don\'t see any transactions found, the issue is likely:');
  console.log('- Category ID mismatch between budget and transactions');
  console.log('- Transactions are outside the budget date range');
  console.log('- No transactions exist with that category');
};

runTests();