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
  suggestedAsBill?: boolean  // Flag to suggest this is a recurring bill
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
  const merch = merchant.toLowerCase()
  
  // Handle transfers first (regardless of amount)
  if (isTransferTransaction(description)) {
    return 'Transfers'
  }
  
  // Specific Income patterns (positive amounts for actual income)
  if (amount > 0) {
    if (desc.match(/(salary|wage|payroll|income|refund|direct credit|deposit|interest|dividend|pension|benefit)/)) {
      return 'Income'
    }
    if (desc.match(/(transfer from|received from)/)) {
      return 'Transfers'
    }
    // If positive but no clear income pattern, might be a refund
    if (desc.match(/(credit|refund|return)/)) {
      return 'Refunds'
    }
    // Default positive unknown amounts to income for now
    return 'Income'
  }
  
  // For expenses (negative amounts), categorize by merchant/description
  
  // Groceries - most specific patterns first
  if (desc.match(/(aldi stores?|coles|woolworths|costco|iga|market|grocery|supermarket|fresh food)/)) {
    return 'Groceries'
  }
  
  if (merch.match(/(costco|aldi stores|coles|woolworths|iga)/)) {
    return 'Groceries'
  }
  
  // Food & Dining
  if (desc.match(/(restaurant|cafe|coffee|pizza|mcdonald|kfc|subway|domino|uber eats|deliveroo|menulog|takeaway|bakery|bakers? delight|kebab|gozleme|boost juice|nandos|hungry jacks|mad mex|dining|momo|classic bake|laurent bakery)/)) {
    return 'Dining Out'
  }
  
  if (merch.match(/(classic bake|bakers delight|mcdonald|pizza|cafe|kebab|boost juice|nandos|hungry jacks|mad mex|atas dining|laurent bakery|subway|epping kebab)/)) {
    return 'Dining Out'
  }
  
  // Subscriptions & Software
  if (desc.match(/(apple\.com\/bill|netflix|spotify|amazon prime|disney|github|subscription|monthly|annual|aldimobile)/)) {
    return 'Subscriptions'
  }
  
  if (merch.match(/(apple\.com|netflix|github|spotify|adobe|microsoft|aldimobile)/)) {
    return 'Subscriptions'
  }
  
  // Transport & Fuel (removed costco from here)
  if (desc.match(/(uber|taxi|metro|train|bus|petrol|shell|bp|caltex|ampol|fuel|parking|toll|carwash|car wash|7-eleven|easypark|copp parking)/)) {
    return 'Transport'
  }
  
  if (merch.match(/(carwash|7-eleven|easypark|copp parking)/)) {
    return 'Transport'
  }
  
  // Healthcare
  if (desc.match(/(pharmacy|medical|doctor|dentist|hospital|health|medicare|ahm|chiro|physiotherapy|physio|chemist warehouse|great holds|dr |dr\.|med\*|wellbeing chiropractic)/)) {
    return 'Healthcare'
  }
  
  if (merch.match(/(hunt chiro|ahm|pharmacy|medical|dental|chemist warehouse|great holds|dr |shahril|xavier|wellbeing chiropractic)/)) {
    return 'Healthcare'
  }
  
  // Entertainment & Recreation
  if (desc.match(/(zoo|cinema|movie|gym|fitness|sport|recreation|entertainment|salsa foundation|linkin park|la fiesta|ticket|melbourne zoo|zoos victoria)/)) {
    return 'Entertainment'
  }
  
  if (merch.match(/(melbourne zoo|zoos victoria|cinema|gym|sport|salsa foundation|la fiesta|ticketek)/)) {
    return 'Entertainment'
  }
  
  // Housing & Utilities
  if (desc.match(/(rent|mortgage|electricity|gas|water|internet|phone|telstra|optus|energy|utilities|agl telco|agl sales)/)) {
    return 'Housing & Utilities'
  }
  
  if (merch.match(/(agl telco|agl sales)/)) {
    return 'Housing & Utilities'
  }
  
  // Shopping & Retail
  if (desc.match(/(kmart|target|amazon|ebay|bunnings|harvey norman|jb hi-fi|retail|shopping|big w|connor clothing|bourke place news|officeworks|the reject shop)/)) {
    return 'Shopping'
  }
  
  if (merch.match(/(kmart|target|bunnings|retail|big w|connor clothing|bourke place news|officeworks|the reject shop)/)) {
    return 'Shopping'
  }
  
  // Personal Care & Services
  if (desc.match(/(child support|support|personal)/)) {
    return 'Personal & Family'
  }
  
  // Professional Services & Fees
  if (desc.match(/(visa provisioning|bank fee|service fee|professional|consultation|credit card fee|interest charged|payment handling fee)/)) {
    return 'Fees & Services'
  }
  
  if (merch.match(/(visa provisioning|creditcardfee|interest|payment handling)/)) {
    return 'Fees & Services'
  }
  
  // Bills & Finance
  if (desc.match(/(insurance|loan|finance|direct debit|dd |payment|bill|nissan financial|greatrex|vanguard|budget direct|ezi failpay)/)) {
    return 'Bills & Finance'
  }
  
  if (merch.match(/(nissan financial|greatrex|vanguard|budget direct|ezi failpay)/)) {
    return 'Bills & Finance'
  }
  
  return 'Uncategorized'
}

// Check if current category should be updated with improved categorization
export function shouldUpdateCategory(
  currentCategory: string, 
  suggestedCategory: string, 
  description: string,
  merchant: string,
  amount: number
): boolean {
  // Don't update if already properly categorized
  if (currentCategory === suggestedCategory) {
    return false
  }
  
  // Always update if current category is Income and we have a more specific category
  // (unless the transaction is actually income based on amount and patterns)
  if (currentCategory === 'Income') {
    // If it's a positive amount that looks like actual income, keep as Income
    if (amount > 0) {
      const desc = description.toLowerCase()
      const isActualIncome = desc.match(/(salary|wage|payroll|direct credit|deposit|interest|dividend|pension|benefit)/)
      
      // Don't update genuine income transactions
      if (isActualIncome) {
        return false
      }
      
      // Don't update transfers that happen to be positive
      if (suggestedCategory === 'Transfers') {
        return false
      }
      
      // For positive amounts without clear income indicators, allow updates
      // (these were likely wrongly categorized as Income)
      return suggestedCategory !== 'Income'
    }
    
    // For negative amounts categorized as Income, definitely update
    // (these were clearly wrong)
    return suggestedCategory !== 'Income'
  }
  
  // Update if current category is Uncategorized and we have a specific category
  if (currentCategory === 'Uncategorized' && suggestedCategory !== 'Uncategorized') {
    return true
  }
  
  // Generally don't update other properly categorized transactions
  // unless they're moving from a generic to more specific category
  const genericCategories = ['Uncategorized', 'Income', 'Other']
  const isCurrentGeneric = genericCategories.includes(currentCategory)
  const isSuggestedSpecific = !genericCategories.includes(suggestedCategory)
  
  return isCurrentGeneric && isSuggestedSpecific
}

// Get improved category for existing transaction
export function getImprovedCategory(
  existingTransaction: {
    description: string
    merchant?: string
    amount: number
    category: string
  }
): { shouldUpdate: boolean; newCategory: string } {
  const merchant = existingTransaction.merchant || extractMerchant(existingTransaction.description)
  const suggestedCategory = categorizeTransaction(
    existingTransaction.description,
    merchant,
    existingTransaction.amount
  )
  
  const shouldUpdate = shouldUpdateCategory(
    existingTransaction.category,
    suggestedCategory,
    existingTransaction.description,
    merchant,
    existingTransaction.amount
  )
  
  return {
    shouldUpdate,
    newCategory: suggestedCategory
  }
}

// Batch update existing transactions with improved categorization during import
export interface ExistingTransactionUpdate {
  id: string
  currentCategory: string
  newCategory: string
  description: string
  merchant: string
  amount: number
  confidence: 'high' | 'medium' | 'low'
}

export function analyzeExistingTransactionsForUpdate(
  existingTransactions: Array<{
    id: string
    description: string
    merchant?: string
    amount: number
    category: string
  }>
): ExistingTransactionUpdate[] {
  const updates: ExistingTransactionUpdate[] = []
  
  for (const transaction of existingTransactions) {
    const improvement = getImprovedCategory(transaction)
    
    if (improvement.shouldUpdate) {
      // Determine confidence level based on categorization strength
      let confidence: 'high' | 'medium' | 'low' = 'medium'
      
      const desc = transaction.description.toLowerCase()
      const merchant = transaction.merchant || extractMerchant(transaction.description)
      const merch = merchant.toLowerCase()
      
      // High confidence for clear patterns
      if (
        // Clear grocery stores
        desc.match(/(aldi stores?|coles|woolworths|costco)/i) ||
        merch.match(/(costco|aldi stores|coles|woolworths)/i) ||
        // Clear restaurant chains
        desc.match(/(mcdonald|kfc|subway|nandos|hungry jacks)/i) ||
        merch.match(/(mcdonald|subway|nandos|hungry jacks)/i) ||
        // Clear subscriptions
        desc.match(/(apple\.com\/bill|netflix|spotify|github)/i) ||
        merch.match(/(apple\.com|netflix|github|spotify)/i) ||
        // Clear healthcare
        desc.match(/(ahm|chemist warehouse|great holds)/i) ||
        merch.match(/(ahm|chemist warehouse|great holds)/i) ||
        // Clear transfers
        isTransferTransaction(transaction.description)
      ) {
        confidence = 'high'
      }
      // Low confidence for generic patterns
      else if (
        desc.match(/(payment|bill|fee)/i) ||
        improvement.newCategory === 'Uncategorized'
      ) {
        confidence = 'low'
      }
      
      updates.push({
        id: transaction.id,
        currentCategory: transaction.category,
        newCategory: improvement.newCategory,
        description: transaction.description,
        merchant: merchant,
        amount: transaction.amount,
        confidence
      })
    }
  }
  
  return updates
}

// Generate update summary for user confirmation
export interface UpdateSummary {
  totalUpdates: number
  highConfidence: number
  mediumConfidence: number
  lowConfidence: number
  categoryChanges: Record<string, { from: string; to: string; count: number }>
  examples: Array<{
    description: string
    from: string
    to: string
    confidence: string
  }>
}

export function generateUpdateSummary(updates: ExistingTransactionUpdate[]): UpdateSummary {
  const categoryChanges: Record<string, { from: string; to: string; count: number }> = {}
  const examples: Array<{
    description: string
    from: string
    to: string
    confidence: string
  }> = []
  
  // Group by category changes
  for (const update of updates) {
    const key = `${update.currentCategory}->${update.newCategory}`
    if (!categoryChanges[key]) {
      categoryChanges[key] = {
        from: update.currentCategory,
        to: update.newCategory,
        count: 0
      }
    }
    categoryChanges[key].count++
    
    // Collect examples (max 5 per change type)
    const existingExamples = examples.filter(e => 
      e.from === update.currentCategory && e.to === update.newCategory
    )
    if (existingExamples.length < 3) {
      examples.push({
        description: update.description.substring(0, 50) + '...',
        from: update.currentCategory,
        to: update.newCategory,
        confidence: update.confidence
      })
    }
  }
  
  return {
    totalUpdates: updates.length,
    highConfidence: updates.filter(u => u.confidence === 'high').length,
    mediumConfidence: updates.filter(u => u.confidence === 'medium').length,
    lowConfidence: updates.filter(u => u.confidence === 'low').length,
    categoryChanges,
    examples: examples.slice(0, 10) // Max 10 examples total
  }
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

// Detect if a transaction is likely a recurring bill
export function isSuggestedBill(description: string, merchant?: string): boolean {
  const desc = description.toLowerCase()
  const merch = (merchant || '').toLowerCase()
  
  // Skip transfers - they're not bills
  if (isTransferTransaction(description)) return false
  
  // Skip positive amounts are income, not bills (checked by caller)
  
  // Strong keyword patterns that almost certainly indicate a bill
  const billPatterns = [
    /\bdirect debit\b/i,               // "Direct Debit - Electricity"
    /\bdd\s+/i,                        // "DD Netflix" or "DD 12345"
    /\bauto[- ]?pay/i,                 // "AutoPay" or "Auto-Pay"
    /\bauto[- ]?debit/i,               // "AutoDebit"
    /\brecurring\b/i,                  // "Recurring Payment"
    /\bsubscription\b/i,               // "Monthly Subscription"
    /\bannual[- ](fee|membership|subscription)/i, // "Annual Fee"
    /\bmonthly[- ](fee|charge|payment)/i,         // "Monthly Fee"
  ]
  
  if (billPatterns.some(p => p.test(desc))) return true
  
  // Known bill merchant names (utilities, insurance, subscriptions, telecom)
  const billMerchants = [
    // Utilities
    'energy', 'electricity', 'gas ', 'origin energy', 'agl', 'ergon',
    'energex', 'synergy', 'simply energy', 'momentum energy', 'diamond energy',
    'water', 'council', 'rates',
    // Internet / Telecom
    'optus', 'telstra', 'tpg', 'aussie broadband', 'aussie bb', 'amaysim',
    'belong', 'spintel', 'vodafone', 'boost mobile', 'woolworths mobile',
    // Insurance
    'insurance', 'allianz', 'nrma', 'budget direct', 'suncorp', 'youi',
    'aami', 'real insurance', 'ahm', 'medibank', 'bupa', 'hcf', 'nib',
    // Streaming / subscriptions
    'netflix', 'spotify', 'apple', 'google one', 'youtube premium',
    'disney', 'stan', 'binge', 'foxtel', 'paramount', 'amazon prime',
    'adobe', 'microsoft 365', 'microsoft 365', 'dropbox', 'icloud',
    // Finance
    'loan', 'repayment', 'mortgage', 'rent', 'lease',
    'nissan financial', 'toyota finance', 'macquarie', 'latitude',
    'afterpay', 'zip pay', 'humm',
    // Health / gym
    'anytime fitness', 'snap fitness', 'gym', 'physiotherapy', 'physio',
  ]
  
  const searchText = `${desc} ${merch}`
  return billMerchants.some(m => searchText.includes(m))
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
  
  // Detect if this looks like a recurring bill (only for expenses/debits)
  const suggestedAsBill = amount < 0 && !isTransfer
    ? isSuggestedBill(cleanedDescription, merchant)
    : false
  
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
    suggestedAsBill,  // Add the bill suggestion flag
    status: errors.length > 0 ? 'error' : 'valid',
    errors,
    rawData: rowData
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
