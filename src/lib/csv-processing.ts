// Bank CSV format configurations
export interface BankFormat {
  name: string
  columns: string[]
  dateFormat: string
  example: string
  amountColumns: {
    debit?: string
    credit?: string
    amount?: string
  }
  descriptionColumn: string
  balanceColumn?: string
  skipRows?: number
}

export const bankFormats: Record<string, BankFormat> = {
  commonwealth: {
    name: 'Commonwealth Bank',
    columns: ['date', 'amount', 'description', 'balance'],
    dateFormat: 'DD/MM/YYYY',
    example: '12/09/2025,"-508.02","Direct Debit 372582 Nissan Financial","+586.72"',
    amountColumns: {
      amount: 'amount'
    },
    descriptionColumn: 'description',
    balanceColumn: 'balance',
    skipRows: 0 // No header row
  },
  westpac: {
    name: 'Westpac',
    columns: ['date', 'narrative', 'debit', 'credit', 'balance'],
    dateFormat: 'DD MMM YYYY',
    example: 'Date,Narrative,Debit Amount,Credit Amount,Balance',
    amountColumns: {
      debit: 'Debit Amount',
      credit: 'Credit Amount'
    },
    descriptionColumn: 'Narrative',
    balanceColumn: 'Balance'
  },
  anz: {
    name: 'ANZ',
    columns: ['date', 'amount', 'description', 'balance'],
    dateFormat: 'YYYY-MM-DD',
    example: 'Date,Amount,Transaction Details,Balance',
    amountColumns: {
      amount: 'Amount'
    },
    descriptionColumn: 'Transaction Details',
    balanceColumn: 'Balance'
  },
  nab: {
    name: 'NAB',
    columns: ['date', 'description', 'debit', 'credit', 'balance'],
    dateFormat: 'DD/MM/YYYY',
    example: 'Date,Description,Debit,Credit,Balance',
    amountColumns: {
      debit: 'Debit',
      credit: 'Credit'
    },
    descriptionColumn: 'Description',
    balanceColumn: 'Balance'
  },
  ubank: {
    name: 'UBank',
    columns: ['Date and time', 'Description', 'Debit', 'Credit', 'From account', 'To account', 'Payment type', 'Category', 'Receipt number', 'Transaction ID'],
    dateFormat: 'HH:MM DD-MM-YY',
    example: 'Date and time,Description,Debit,Credit,From account,To account,Payment type,Category,Receipt number,Transaction ID',
    amountColumns: {
      debit: 'Debit',
      credit: 'Credit'
    },
    descriptionColumn: 'Description',
    skipRows: 1 // Skip header row
  },
  latitud: {
    name: 'Latitud Credit Card',
    columns: ['Date', 'Card', 'Description', 'Debits', 'Credits'],
    dateFormat: 'DD/MM/YYYY',
    example: 'Date,Card,Description,Debits,Credits\n08/09/2025,7458,BPAY Payment Received--Thank You,,4160.00\n09/09/2025,7458,Woolworths Epping,54.15,',
    amountColumns: {
      debit: 'Debits',
      credit: 'Credits'
    },
    descriptionColumn: 'Description',
    skipRows: 1 // Skip header row
  },
  creditcard: {
    name: 'Generic Credit Card',
    columns: ['date', 'description', 'amount'],
    dateFormat: 'DD/MM/YYYY',
    example: 'Date,Description,Amount\n01/01/2025,Purchase at Store,-50.00\n05/01/2025,Payment Received,200.00',
    amountColumns: {
      amount: 'Amount'
    },
    descriptionColumn: 'Description',
    skipRows: 1
  },
  custom: {
    name: 'Custom Format',
    columns: [],
    dateFormat: 'YYYY-MM-DD',
    example: 'Define your own column mapping',
    amountColumns: {},
    descriptionColumn: 'description'
  }
}

// Transaction validation and processing
export interface ValidationError {
  field: string
  message: string
  value?: unknown
}

export interface ProcessedTransaction {
  id: string
  date: string
  description: string
  amount: number
  category: string
  account: string
  merchant?: string
  reference?: string
  transactionId?: string  // Bank's unique transaction identifier
  receiptNumber?: string  // Receipt number if available
  balance?: number
  isTransfer?: boolean    // Flag to indicate if this is a transfer between accounts
  status: 'valid' | 'error' | 'warning'
  errors: ValidationError[]
  rawData: Record<string, string> | string[]
}

// Date parsing utilities
export function parseDate(dateStr: string, format: string): Date | null {
  if (!dateStr) return null
  
  try {
    // Clean the date string
    const cleaned = dateStr.trim()
    
    switch (format) {
      case 'DD/MM/YYYY': {
        const [day, month, year] = cleaned.split('/')
        if (!day || !month || !year) return null
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      }
      
      case 'DD MMM YYYY': {
        // Handle formats like "01 Jan 2024"
        return new Date(cleaned)
      }
      
      case 'YYYY-MM-DD': {
        const [year, month, day] = cleaned.split('-')
        if (!year || !month || !day) return null
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      }
      
      case 'MM/DD/YYYY': {
        const [month, day, year] = cleaned.split('/')
        if (!month || !day || !year) return null
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      }
      
      case 'HH:MM DD-MM-YY': {
        // Handle UBank format like "13:03 26-09-25"
        const parts = cleaned.split(' ')
        if (parts.length !== 2) return null
        
        const [, datePart] = parts // ignore time, just use date
        const [day, month, year] = datePart.split('-')
        
        if (!day || !month || !year) return null
        
        // Convert 2-digit year to 4-digit year
        const fullYear = parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year)
        
        return new Date(fullYear, parseInt(month) - 1, parseInt(day))
      }
      
      default:
        // Try to parse as ISO date or let Date constructor handle it
        return new Date(cleaned)
    }
  } catch (error) {
    console.warn('Date parsing error:', error)
    return null
  }
}

// Amount parsing utilities
export function parseAmount(row: Record<string, string>, format: BankFormat): { amount: number; errors: ValidationError[] } {
  const errors: ValidationError[] = []
  let amount = 0
  
  try {
    const { debit, credit, amount: amountCol } = format.amountColumns
    
    if (debit && credit) {
      // Handle debit/credit columns - look for exact column names
      const debitValue = row[debit] || '0'
      const creditValue = row[credit] || '0'
      
      const debitVal = parseFloat(cleanAmount(debitValue))
      const creditVal = parseFloat(cleanAmount(creditValue))
      
      if (isNaN(debitVal) && isNaN(creditVal)) {
        errors.push({
          field: 'amount',
          message: 'Both debit and credit amounts are invalid',
          value: { debit: debitValue, credit: creditValue }
        })
      } else {
        amount = (creditVal || 0) - (debitVal || 0)
      }
    } else if (amountCol) {
      // Handle single amount column (can be positive or negative)
      const amountStr = row[amountCol] || '0'
      const amountVal = parseFloat(cleanAmount(amountStr))
      
      if (isNaN(amountVal)) {
        errors.push({
          field: 'amount',
          message: 'Invalid amount value',
          value: amountStr
        })
      } else {
        amount = amountVal
      }
    } else {
      errors.push({
        field: 'amount',
        message: 'No amount columns found in format configuration'
      })
    }
  } catch (error) {
    errors.push({
      field: 'amount',
      message: 'Error parsing amount',
      value: error
    })
  }
  
  return { amount, errors }
}

// Clean amount string (remove currency symbols, commas, quotes, etc.)
function cleanAmount(amountStr: string): string {
  if (typeof amountStr !== 'string') {
    return String(amountStr || '0')
  }
  
  return amountStr
    .replace(/[$,\s"]/g, '') // Remove dollar signs, commas, spaces, quotes
    .replace(/[()]/g, '') // Remove parentheses (sometimes used for negative amounts)
    .trim()
}

// Extract merchant name from transaction description
export function extractMerchant(description: string): string {
  if (!description) return 'Unknown'
  
  // Clean up the description
  const cleaned = description
    .replace(/^(EFTPOS|CARD|ATM|TRANSFER|DIRECT DEBIT|DD|PAYMENT)\s*/i, '')
    .replace(/\s+\d{2}\/\d{2}\/?\d{0,4}.*$/, '') // Remove dates
    .replace(/\s+\d{4,}.*$/, '') // Remove long numbers (card numbers, etc.)
    .replace(/\s+(AUS|AUSTRALIA|AU)\s*$/, '') // Remove country codes
    .replace(/\s+NSF.*$/, '') // Remove NSF fees
    .trim()
  
  // Extract meaningful merchant name (first 2-3 words)
  const words = cleaned.split(/\s+/).filter(word => 
    word.length > 1 && 
    !word.match(/^\d+$/) && // Skip pure numbers
    !word.match(/^[A-Z]{1,2}\d+$/) // Skip codes like "T1", "A123"
  )
  
  return words.slice(0, 3).join(' ') || 'Unknown Merchant'
}

// Categorize transaction based on description and merchant
export function categorizeTransaction(description: string, merchant: string, amount: number): string {
  const desc = description.toLowerCase()
  
  // Food & Dining
  if (desc.match(/(restaurant|cafe|coffee|pizza|mcdonald|kfc|subway|domino|uber eats|deliveroo|menulog)/)) {
    return 'Dining Out'
  }
  
  if (desc.match(/(woolworths|coles|iga|aldi|grocery|supermarket|food)/)) {
    return 'Groceries'
  }
  
  // Transport
  if (desc.match(/(uber|taxi|metro|train|bus|petrol|shell|bp|caltex|ampol|costco)/)) {
    return 'Transport'
  }
  
  // Entertainment
  if (desc.match(/(netflix|spotify|amazon prime|disney|cinema|movie|gym|fitness)/)) {
    return 'Entertainment'
  }
  
  // Utilities
  if (desc.match(/(electricity|gas|water|internet|phone|telstra|optus|energy)/)) {
    return 'Utilities'
  }
  
  // Healthcare
  if (desc.match(/(pharmacy|medical|doctor|dentist|hospital|health)/)) {
    return 'Healthcare'
  }
  
  // Shopping
  if (desc.match(/(amazon|ebay|target|kmart|bunnings|harvey norman|jb hi-fi)/)) {
    return 'Shopping'
  }
  
  // Income
  if (amount > 0 && desc.match(/(salary|wage|transfer|refund|interest)/)) {
    return 'Income'
  }
  
  // Bills & Finance
  if (desc.match(/(insurance|bank fee|loan|mortgage|rent)/)) {
    return 'Bills & Finance'
  }
  
  return 'Uncategorized'
}

// Detect if a transaction is a transfer between accounts
export function isTransferTransaction(description: string): boolean {
  const desc = description.toLowerCase()
  
  // Common transfer patterns in bank statements
  const transferPatterns = [
    /transfer to .* account/i,           // "Transfer To Ubank Bills Account"
    /transfer from .* account/i,         // "Transfer From Savings Account"
    /fast transfer (to|from)/i,          // "Fast Transfer From PERSON"
    /payid (payment|transfer)/i,         // "PayID Payment"
    /osko payment/i,                     // "Osko Payment"
    /bpay transfer/i,                    // "BPAY Transfer"
    /internal transfer/i,                // "Internal Transfer"
    /account transfer/i,                 // "Account Transfer"
    /transfer - .* to .*/i,              // "Transfer - Account A to Account B"
    /own account transfer/i,             // "Own Account Transfer"
  ]
  
  return transferPatterns.some(pattern => pattern.test(desc))
}


// Validate a single transaction row
export function validateTransactionRow(
  row: Record<string, string> | string[], 
  format: BankFormat, 
  rowIndex: number
): ProcessedTransaction {
  const errors: ValidationError[] = []
  const id = `tx_${Date.now()}_${rowIndex}`
  
  // Convert array to object for Commonwealth Bank format (no headers)
  let rowData: Record<string, string>
  if (Array.isArray(row)) {
    // For Commonwealth Bank CSV without headers
    rowData = {
      date: row[0] || '',
      amount: row[1] || '',
      description: row[2] || '',
      balance: row[3] || ''
    }
  } else {
    rowData = row
  }
  
  // Validate and parse date
  const dateColumn = format.columns.find(col => 
    col.toLowerCase().includes('date') || 
    col === 'Date and time' ||
    col.includes('date')
  ) || 'date'
  
  const dateStr = rowData[dateColumn] || ''
  const parsedDate = parseDate(dateStr, format.dateFormat)
  
  if (!parsedDate) {
    errors.push({
      field: 'date',
      message: `Invalid date format. Expected: ${format.dateFormat}`,
      value: dateStr
    })
  }
  
  // Validate and parse amount
  const { amount, errors: amountErrors } = parseAmount(rowData, format)
  errors.push(...amountErrors)
  
  // Validate description
  const description = rowData[format.descriptionColumn] || ''
  const cleanedDescription = description.replace(/^["']|["']$/g, '') // Remove surrounding quotes
  if (!cleanedDescription.trim()) {
    errors.push({
      field: 'description',
      message: 'Transaction description is required',
      value: description
    })
  }
  
  // Parse balance if available
  let balance: number | undefined
  if (format.balanceColumn && rowData[format.balanceColumn]) {
    const balanceVal = parseFloat(cleanAmount(rowData[format.balanceColumn]))
    if (!isNaN(balanceVal)) {
      balance = balanceVal
    }
  }
  
  // Extract merchant and categorize
  const merchant = extractMerchant(cleanedDescription)
  const category = categorizeTransaction(cleanedDescription, merchant, amount)
  
  // Detect if this is a transfer transaction
  const isTransfer = isTransferTransaction(cleanedDescription)
  
  // Extract transaction identifiers (UBank has 'Transaction ID', others may have different names)
  const transactionId = (rowData as Record<string, string>)['Transaction ID'] || 
                        (rowData as Record<string, string>).transactionId || 
                        (rowData as Record<string, string>).transactionID || 
                        ''
  
  const receiptNumber = (rowData as Record<string, string>)['Receipt number'] || 
                        (rowData as Record<string, string>).receiptNumber || 
                        (rowData as Record<string, string>).receipt || 
                        ''
  
  // Clean transaction ID (remove extra quotes)
  const cleanedTransactionId = transactionId.replace(/^["\']+|["\']+$/g, '').trim()
  const cleanedReceiptNumber = receiptNumber.replace(/^["\']+|["\']+$/g, '').trim()
  
  const transaction: ProcessedTransaction = {
    id,
    date: parsedDate ? parsedDate.toISOString().split('T')[0] : dateStr,
    description: cleanedDescription.trim(),
    amount,
    category,
    account: 'Imported Account', // Default, can be customized
    merchant,
    reference: (rowData as Record<string, string>).reference || (rowData as Record<string, string>).Reference || '',
    transactionId: cleanedTransactionId || undefined,
    receiptNumber: cleanedReceiptNumber || undefined,
    balance,
    isTransfer,  // Add the transfer flag
    status: errors.length > 0 ? 'error' : 'valid',
    errors,
    rawData: rowData
  }
  
  return transaction
  
  return transaction
}

// Validate file before processing
export function validateCSVFile(file: File): ValidationError[] {
  const errors: ValidationError[] = []
  
  // Check file type
  if (!file.type.includes('csv') && !file.name.toLowerCase().endsWith('.csv')) {
    errors.push({
      field: 'file',
      message: 'File must be in CSV format',
      value: file.type
    })
  }
  
  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    errors.push({
      field: 'file',
      message: `File size must be less than ${maxSize / 1024 / 1024}MB`,
      value: `${(file.size / 1024 / 1024).toFixed(2)}MB`
    })
  }
  
  // Check if file is empty
  if (file.size === 0) {
    errors.push({
      field: 'file',
      message: 'File cannot be empty',
      value: file.size
    })
  }
  
  return errors
}

// Validate parsed transactions before allowing import
export function validateParsedTransactions(transactions: ProcessedTransaction[]): {
  isValid: boolean
  errors: string[]
  warnings: string[]
  stats: {
    total: number
    valid: number
    errors: number
    warnings: number
  }
} {
  const errors: string[] = []
  const warnings: string[] = []
  
  const errorTransactions = transactions.filter(tx => tx.status === 'error')
  const validTransactions = transactions.filter(tx => tx.status === 'valid')
  const warningTransactions = transactions.filter(tx => tx.status === 'warning')
  
  // Critical validation - if more than 80% of transactions have errors, something is wrong
  const errorRate = errorTransactions.length / transactions.length
  if (errorRate > 0.8) {
    errors.push(`${Math.round(errorRate * 100)}% of transactions have errors. Please check the CSV format.`)
  }
  
  // Check for common error patterns
  const dateErrors = errorTransactions.filter(tx => 
    tx.errors.some(e => e.field === 'date')
  ).length
  
  if (dateErrors > 0) {
    errors.push(`${dateErrors} transactions have date format errors.`)
  }
  
  const amountErrors = errorTransactions.filter(tx => 
    tx.errors.some(e => e.field === 'amount')
  ).length
  
  if (amountErrors > 0) {
    errors.push(`${amountErrors} transactions have amount parsing errors.`)
  }
  
  // Warnings for minor issues
  if (transactions.length === 0) {
    errors.push('No transactions found in the CSV file.')
  }
  
  if (validTransactions.length === 0 && transactions.length > 0) {
    errors.push('No valid transactions found. All transactions have errors.')
  }
  
  if (validTransactions.length < transactions.length / 2) {
    warnings.push(`Only ${validTransactions.length} out of ${transactions.length} transactions are valid.`)
  }
  
  return {
    isValid: errors.length === 0 && validTransactions.length > 0,
    errors,
    warnings,
    stats: {
      total: transactions.length,
      valid: validTransactions.length,
      errors: errorTransactions.length,
      warnings: warningTransactions.length
    }
  }
}

// Generate upload summary
export interface UploadSummary {
  totalRows: number
  validRows: number
  errorRows: number
  warningRows: number
  categories: Record<string, number>
  dateRange: {
    earliest: string | null
    latest: string | null
  }
  totalAmount: number
  averageAmount: number
}

export function generateUploadSummary(transactions: ProcessedTransaction[]): UploadSummary {
  const validTransactions = transactions.filter(tx => tx.status === 'valid')
  const errorTransactions = transactions.filter(tx => tx.status === 'error')
  const warningTransactions = transactions.filter(tx => tx.status === 'warning')
  
  // Calculate categories
  const categories: Record<string, number> = {}
  validTransactions.forEach(tx => {
    categories[tx.category] = (categories[tx.category] || 0) + 1
  })
  
  // Calculate date range
  const dates = validTransactions
    .map(tx => tx.date)
    .filter(date => date)
    .sort()
  
  // Calculate amounts
  const amounts = validTransactions.map(tx => tx.amount)
  const totalAmount = amounts.reduce((sum, amount) => sum + amount, 0)
  const averageAmount = amounts.length > 0 ? totalAmount / amounts.length : 0
  
  return {
    totalRows: transactions.length,
    validRows: validTransactions.length,
    errorRows: errorTransactions.length,
    warningRows: warningTransactions.length,
    categories,
    dateRange: {
      earliest: dates[0] || null,
      latest: dates[dates.length - 1] || null
    },
    totalAmount,
    averageAmount
  }
}
