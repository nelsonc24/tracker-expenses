const { bankFormats, validateTransactionRow, parseCSVLine } = require('./src/lib/csv-processing.ts')

// Test Commonwealth Bank CSV parsing
const testCSVLine = '12/09/2025,"-508.02","Direct Debit 372582 Nissan Financial 00606686C051862242","+586.72"'

// Parse CSV line
const parseCSVLine = (line) => {
  const result = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current)
  return result
}

const fields = parseCSVLine(testCSVLine)
console.log('Parsed fields:', fields)

// Expected: ['12/09/2025', '"-508.02"', '"Direct Debit 372582 Nissan Financial 00606686C051862242"', '"+586.72"']

const commonwealthFormat = {
  name: 'Commonwealth Bank',
  columns: ['date', 'amount', 'description', 'balance'],
  dateFormat: 'DD/MM/YYYY',
  example: '12/09/2025,"-508.02","Direct Debit 372582 Nissan Financial","+586.72"',
  amountColumns: {
    amount: 'amount'
  },
  descriptionColumn: 'description',
  balanceColumn: 'balance',
  skipRows: 0
}

// Test transaction validation
const processedTransaction = validateTransactionRow(fields, commonwealthFormat, 0)
console.log('Processed transaction:', JSON.stringify(processedTransaction, null, 2))
