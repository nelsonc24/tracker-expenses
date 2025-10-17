import { parseCreditCardPDF, creditCardStatementToTransactions } from '@/lib/pdf-processing'
import fs from 'fs'
import path from 'path'

/**
 * Test script for PDF parsing functionality
 * Run with: npx ts-node scripts/test-pdf-parser.ts
 */

async function testPDFParsing() {
  console.log('🧪 Testing PDF Parsing Functionality\n')
  console.log('='.repeat(50))
  
  // Load the test PDF
  const pdfPath = path.join(process.cwd(), 'files/30_September_2025_statement-latitud.pdf')
  
  if (!fs.existsSync(pdfPath)) {
    console.error('❌ Test PDF not found at:', pdfPath)
    process.exit(1)
  }
  
  console.log('✅ Found test PDF:', path.basename(pdfPath))
  console.log('📄 File size:', (fs.statSync(pdfPath).size / 1024).toFixed(2), 'KB\n')
  
  try {
    // Read the PDF file
    const pdfBuffer = fs.readFileSync(pdfPath)
    console.log('📖 Reading PDF...')
    
    // Parse the PDF
    console.log('🔍 Parsing statement...\n')
    const statement = await parseCreditCardPDF(pdfBuffer.buffer)
    
    // Display results
    console.log('📊 Statement Metadata:')
    console.log('='.repeat(50))
    console.log('Statement Date:', statement.statementDate)
    console.log('Account Number:', statement.accountNumber)
    console.log('Opening Balance: $', statement.openingBalance.toFixed(2))
    console.log('Closing Balance: $', statement.closingBalance.toFixed(2))
    console.log('Credit Limit: $', statement.creditLimit.toFixed(2))
    console.log('Available Credit: $', statement.availableCredit.toFixed(2))
    console.log('Minimum Payment: $', statement.minimumPayment.toFixed(2))
    console.log('Due Date:', statement.dueDate)
    
    console.log('\n💳 Regular Transactions:')
    console.log('='.repeat(50))
    console.log(`Found ${statement.transactions.length} transactions\n`)
    
    statement.transactions.forEach((t, i) => {
      const amountStr = t.amount >= 0 
        ? `+$${t.amount.toFixed(2)}` 
        : `-$${Math.abs(t.amount).toFixed(2)}`
      console.log(`${i + 1}. ${t.date} | ${t.description}`)
      console.log(`   Card: ${t.card} | Amount: ${amountStr} | Type: ${t.type}`)
    })
    
    if (statement.interestFreeTransactions && statement.interestFreeTransactions.length > 0) {
      console.log('\n🎁 Interest-Free Transactions:')
      console.log('='.repeat(50))
      console.log(`Found ${statement.interestFreeTransactions.length} interest-free transactions\n`)
      
      statement.interestFreeTransactions.forEach((t, i) => {
        const amountStr = t.amount >= 0 
          ? `+$${t.amount.toFixed(2)}` 
          : `-$${Math.abs(t.amount).toFixed(2)}`
        console.log(`${i + 1}. ${t.date} | ${t.description}`)
        console.log(`   Card: ${t.card} | Amount: ${amountStr}`)
      })
    }
    
    // Test conversion to import format
    console.log('\n🔄 Converting to Import Format:')
    console.log('='.repeat(50))
    const transactions = creditCardStatementToTransactions(statement, 'test-account-id')
    console.log(`Total transactions ready for import: ${transactions.length}\n`)
    
    // Show sample transaction
    if (transactions.length > 0) {
      console.log('Sample Transaction (first one):')
      console.log(JSON.stringify(transactions[0], null, 2))
    }
    
    console.log('\n✅ PDF Parsing Test Complete!')
    console.log('='.repeat(50))
    console.log(`\n📝 Summary:`)
    console.log(`   - Regular Transactions: ${statement.transactions.length}`)
    console.log(`   - Interest-Free Transactions: ${statement.interestFreeTransactions?.length || 0}`)
    console.log(`   - Total for Import: ${transactions.length}`)
    console.log(`   - Account Balance: $${statement.closingBalance.toFixed(2)}`)
    
  } catch (error) {
    console.error('\n❌ Error during parsing:')
    console.error(error instanceof Error ? error.message : 'Unknown error')
    console.error('\nFull error:')
    console.error(error)
    process.exit(1)
  }
}

// Run the test
testPDFParsing().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
