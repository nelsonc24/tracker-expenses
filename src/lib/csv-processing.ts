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
    columns: ['date', 'description', 'debit', 'credit', 'balance'],
    dateFormat: 'DD/MM/YYYY',
    example: 'Date,Description,Debit Amount,Credit Amount,Balance',
    amountColumns: {
      debit: 'Debit Amount',
      credit: 'Credit Amount'
    },
    descriptionColumn: 'Description',
    balanceColumn: 'Balance',
    skipRows: 1
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
  value?: any
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
  balance?: number
  status: 'valid' | 'error' | 'warning'
  errors: ValidationError[]
  rawData: any
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
export function parseAmount(row: any, format: BankFormat): { amount: number; errors: ValidationError[] } {
  const errors: ValidationError[] = []
  let amount = 0
  
  try {
    const { debit, credit, amount: amountCol } = format.amountColumns
    
    if (debit && credit) {
      // Handle debit/credit columns
      const debitVal = parseFloat(cleanAmount(row[debit] || '0'))
      const creditVal = parseFloat(cleanAmount(row[credit] || '0'))
      
      if (isNaN(debitVal) && isNaN(creditVal)) {
        errors.push({
          field: 'amount',
          message: 'Both debit and credit amounts are invalid',
          value: { debit: row[debit], credit: row[credit] }
        })
      } else {
        amount = (creditVal || 0) - (debitVal || 0)
      }
    } else if (amountCol) {
      // Handle single amount column
      const amountVal = parseFloat(cleanAmount(row[amountCol] || '0'))
      
      if (isNaN(amountVal)) {
        errors.push({
          field: 'amount',
          message: 'Invalid amount value',
          value: row[amountCol]
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

// Clean amount string (remove currency symbols, commas, etc.)
function cleanAmount(amountStr: string): string {
  if (typeof amountStr !== 'string') {
    return String(amountStr || '0')
  }
  
  return amountStr
    .replace(/[$,\s]/g, '') // Remove dollar signs, commas, spaces
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
  const merch = merchant.toLowerCase()
  
  // Food & Dining
  if (desc.match(/(restaurant|cafe|coffee|pizza|mcdonald|kfc|subway|domino|uber eats|deliveroo|menulog)/)) {
    return 'Dining Out'
  }
  
  if (desc.match(/(woolworths|coles|iga|aldi|grocery|supermarket|food)/)) {
    return 'Groceries'
  }
  
  // Transport
  if (desc.match(/(uber|taxi|metro|train|bus|petrol|shell|bp|caltex|ampol)/)) {
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

// Validate a single transaction row
export function validateTransactionRow(
  row: any, 
  format: BankFormat, 
  rowIndex: number
): ProcessedTransaction {
  const errors: ValidationError[] = []
  const id = `tx_${Date.now()}_${rowIndex}`
  
  // Validate and parse date
  const dateStr = row[format.columns.find(col => col.includes('date')) || 'Date'] || ''
  const parsedDate = parseDate(dateStr, format.dateFormat)
  
  if (!parsedDate) {
    errors.push({
      field: 'date',
      message: `Invalid date format. Expected: ${format.dateFormat}`,
      value: dateStr
    })
  }
  
  // Validate and parse amount
  const { amount, errors: amountErrors } = parseAmount(row, format)
  errors.push(...amountErrors)
  
  // Validate description
  const description = row[format.descriptionColumn] || ''
  if (!description.trim()) {
    errors.push({
      field: 'description',
      message: 'Transaction description is required',
      value: description
    })
  }
  
  // Parse balance if available
  let balance: number | undefined
  if (format.balanceColumn && row[format.balanceColumn]) {
    const balanceVal = parseFloat(cleanAmount(row[format.balanceColumn]))
    if (!isNaN(balanceVal)) {
      balance = balanceVal
    }
  }
  
  // Extract merchant and categorize
  const merchant = extractMerchant(description)
  const category = categorizeTransaction(description, merchant, amount)
  
  const transaction: ProcessedTransaction = {
    id,
    date: parsedDate ? parsedDate.toISOString().split('T')[0] : dateStr,
    description: description.trim(),
    amount,
    category,
    account: 'Imported Account', // Default, can be customized
    merchant,
    reference: row.reference || row.Reference || '',
    balance,
    status: errors.length > 0 ? 'error' : 'valid',
    errors,
    rawData: row
  }
  
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
