// Import PDF2JSON for parsing PDFs
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFParser = require('pdf2json')

// Helper function to parse PDF using pdf2json
async function parsePDFToText(pdfBuffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser()
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdfParser.on('pdfParser_dataError', (errData: any) => {
      reject(new Error(errData.parserError))
    })
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      try {
        // Extract text from all pages
        let fullText = ''
        
        if (pdfData.Pages) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pdfData.Pages.forEach((page: any) => {
            if (page.Texts) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              page.Texts.forEach((text: any) => {
                if (text.R) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  text.R.forEach((r: any) => {
                    if (r.T) {
                      // Decode URL-encoded text, handle malformed URIs
                      try {
                        fullText += decodeURIComponent(r.T) + ' '
                      } catch {
                        // If decoding fails, use the original text
                        fullText += r.T + ' '
                      }
                    }
                  })
                }
              })
              fullText += '\n'
            }
          })
        }
        
        // Normalize spaced-out text (e.g., "S t a t e m e n t" -> "Statement")
        // Replace sequences of single characters separated by spaces with solid words
        fullText = fullText.replace(/([a-zA-Z0-9])\s+(?=[a-zA-Z0-9]\s)/g, '$1')
        
        resolve(fullText)
      } catch (error) {
        reject(error)
      }
    })
    
    // Parse the buffer
    pdfParser.parseBuffer(pdfBuffer)
  })
}

export interface CreditCardTransaction {
  date: string
  description: string
  amount: number
  type: 'debit' | 'credit'
  card?: string
}

export interface CreditCardStatement {
  statementDate: string
  accountNumber: string
  openingBalance: number
  closingBalance: number
  creditLimit: number
  availableCredit: number
  minimumPayment: number
  dueDate: string
  transactions: CreditCardTransaction[]
  interestFreeTransactions?: CreditCardTransaction[]
}

/**
 * Parse Latitud credit card statement PDF
 */
export async function parseLatitudPDF(pdfBuffer: ArrayBuffer): Promise<CreditCardStatement> {
  const buffer = Buffer.from(pdfBuffer)
  const text = await parsePDFToText(buffer)
  
  // Extract statement metadata
  const statementDate = extractStatementDate(text)
  const accountNumber = extractAccountNumber(text)
  const openingBalance = extractBalance(text, 'Opening balance')
  const closingBalance = extractBalance(text, 'Closing balance')
  const creditLimit = extractBalance(text, 'Credit limit')
  const availableCredit = extractBalance(text, 'Available credit')
  const minimumPayment = extractBalance(text, 'Minimum monthly payment')
  const dueDate = extractDueDate(text)
  
  // Extract transactions
  const transactions = extractLatitudTransactions(text)
  const interestFreeTransactions = extractInterestFreeTransactions(text)
  
  return {
    statementDate,
    accountNumber,
    openingBalance,
    closingBalance,
    creditLimit,
    availableCredit,
    minimumPayment,
    dueDate,
    transactions,
    interestFreeTransactions
  }
}

/**
 * Parse generic credit card statement PDF
 */
export async function parseCreditCardPDF(pdfBuffer: ArrayBuffer): Promise<CreditCardStatement> {
  // Try Latitud format first
  try {
    return await parseLatitudPDF(pdfBuffer)
  } catch (error) {
    console.error('Failed to parse as Latitud format:', error)
    throw new Error('Unsupported credit card statement format. Currently only Latitud statements are supported.')
  }
}

// Helper functions for Latitud statements
// Note: PDF text has spaces removed between letters (e.g., "Statementdate" not "Statement date")
function extractStatementDate(text: string): string {
  const match = text.match(/Statementdate(\d{2}\s*\/\s*\d{2}\s*\/\s*\d{4})/)
  if (match) {
    const dateStr = match[1].replace(/\s/g, '')
    const [day, month, year] = dateStr.split('/')
    return `${year}-${month}-${day}` // Convert to ISO format
  }
  return new Date().toISOString().split('T')[0]
}

function extractAccountNumber(text: string): string {
  const match = text.match(/Accountnumber\s*:\s*(\d[\d\s]*\d)/)
  return match ? match[1].replace(/\s/g, '') : ''
}

function extractBalance(text: string, label: string): number {
  // Remove spaces from label to match normalized text (e.g., "Opening balance" -> "Openingbalance")
  const normalizedLabel = label.replace(/\s+/g, '')
  // Handle both positive and negative values, with optional spaces in numbers
  // Example: "Openingbalance : $ 5 , 074 . 24" or "Creditlimit ( incl . cashlimit ) : $ 5 , 200 . 00"
  const escapedLabel = normalizedLabel.replace(/[()]/g, '\\$&')
  const regex = new RegExp(`${escapedLabel}.*?\\$\\s*([+-]?[\\d,\\s]+\\.\\s*\\d{2})`)
  const match = text.match(regex)
  if (match) {
    const value = match[1].replace(/[,\s]/g, '')
    return parseFloat(value)
  }
  return 0
}

function extractDueDate(text: string): string {
  const match = text.match(/Duedate\s*:\s*(\d{2}\s*\/\s*\d{2}\s*\/\s*\d{4})/)
  if (match) {
    const dateStr = match[1].replace(/\s/g, '')
    const [day, month, year] = dateStr.split('/')
    return `${year}-${month}-${day}`
  }
  return ''
}

function extractLatitudTransactions(text: string): CreditCardTransaction[] {
  const transactions: CreditCardTransaction[] = []
  
  // Find the transactions section (text is normalized without spaces between letters)
  const transactionsMatch = text.match(/Yourtransactions([\s\S]*?)(?=LatitudeGemVisa6month|Closingbalance|$)/)
  if (!transactionsMatch) return transactions
  
  const transactionsText = transactionsMatch[1]
  
  // Pattern: DATE CARD $ AMOUNT DESCRIPTION
  // e.g., "08 / 09 / 20257458 $ 4 , 160 . 00BPAYPaymentReceived - - ThankYou"
  // Match: date (with spaces), 4-digit card, dollar sign, amount (with spaces/commas), description
  const linePattern = /(\d{2}\s*\/\s*\d{2}\s*\/\s*\d{4})(\d{4})\s*\$\s*([\d,\s]+\.\s*\d{2})(.*?)(?=\d{2}\s*\/\s*\d{2}\s*\/\s*\d{4}|Latitude|Closing|$)/g
  
  let match
  while ((match = linePattern.exec(transactionsText)) !== null) {
    const [, dateStr, card, amountStr, description] = match
    
    // Clean up date (remove spaces)
    const cleanDate = dateStr.replace(/\s/g, '')
    const [day, month, year] = cleanDate.split('/')
    const date = `${year}-${month}-${day}`
    
    // Clean up amount (remove spaces and commas)
    const amount = parseFloat(amountStr.replace(/[,\s]/g, ''))
    
    // Clean up description
    const cleanDesc = description.trim().replace(/\s+/g, ' ')
    
    // Determine if it's a credit (payment/refund) or debit (purchase/fee/interest)
    const lowerDesc = cleanDesc.toLowerCase()
    // Payments reduce the balance (credits)
    // Purchases, fees, and interest increase the balance (debits/charges)
    const isPayment = (lowerDesc.includes('bpay') || lowerDesc.includes('paymentreceived')) && 
                      !lowerDesc.includes('fee')
    const isRefund = lowerDesc.includes('refund')
    const isCredit = isPayment || isRefund
    
    transactions.push({
      date,
      description: cleanDesc,
      amount: isCredit ? amount : -amount,
      type: isCredit ? 'credit' : 'debit',
      card
    })
  }
  
  return transactions
}

function extractInterestFreeTransactions(text: string): CreditCardTransaction[] {
  const transactions: CreditCardTransaction[] = []
  
  // Find interest free section (normalized text has no spaces in words)
  const interestFreeMatch = text.match(/LatitudeGemVisa6monthinterestfreepurchases.*?DateCard(.*?)(?=Closingbalance|Statementdate|Page\d+of\d+|$)/)
  if (!interestFreeMatch) return transactions
  
  const interestFreeText = interestFreeMatch[1]
  
  // Same pattern as regular transactions
  const linePattern = /(\d{2}\s*\/\s*\d{2}\s*\/\s*\d{4})(\d{4})\s*\$\s*([\d,\s]+\.\s*\d{2})(.*?)(?=\d{2}\s*\/\s*\d{2}\s*\/\s*\d{4}|$)/g
  
  let match
  while ((match = linePattern.exec(interestFreeText)) !== null) {
    const [, dateStr, card, amountStr, description] = match
    
    const cleanDate = dateStr.replace(/\s/g, '')
    const [day, month, year] = cleanDate.split('/')
    const date = `${year}-${month}-${day}`
    
    const amount = parseFloat(amountStr.replace(/[,\s]/g, ''))
    const cleanDesc = description.trim().replace(/\s+/g, ' ')
    
    transactions.push({
      date,
      description: cleanDesc + ' (Interest Free)',
      amount: -amount, // Purchases are negative
      type: 'debit',
      card
    })
  }
  
  return transactions
}

/**
 * Convert credit card statement to import format
 */
export function creditCardStatementToTransactions(
  statement: CreditCardStatement,
  accountId: string
): Array<{
  date: string
  description: string
  amount: number
  category: string
  account: string
  type: 'debit' | 'credit'
}> {
  const allTransactions = [
    ...statement.transactions,
    ...(statement.interestFreeTransactions || [])
  ]
  
  return allTransactions.map(transaction => ({
    date: transaction.date,
    description: transaction.description,
    amount: transaction.amount,
    category: categorizeTransaction(transaction.description, transaction.amount),
    account: accountId,
    type: transaction.type
  }))
}

/**
 * Categorize credit card transactions
 */
function categorizeTransaction(description: string, amount: number): string {
  const desc = description.toLowerCase()
  
  // Payments and fees
  if (desc.includes('payment') || desc.includes('bpay')) return 'Payment'
  if (desc.includes('fee') || desc.includes('interest')) return 'Fees & Charges'
  
  // Shopping
  if (desc.match(/(temu|amazon|ebay|costco)/)) return 'Shopping'
  
  // Groceries
  if (desc.match(/(woolworths|coles|aldi|iga)/)) return 'Groceries'
  
  // Dining
  if (desc.match(/(restaurant|cafe|mcdonald|kfc|hungry jack)/)) return 'Dining'
  
  // Bills
  if (desc.match(/(electricity|gas|water|internet|phone)/)) return 'Utilities'
  
  // Healthcare
  if (desc.match(/(pharmacy|medical|doctor|dentist|chemist)/)) return 'Healthcare'
  
  // Transport
  if (desc.match(/(petrol|fuel|uber|taxi|myki|opal)/)) return 'Transport'
  
  // Default category
  return amount > 0 ? 'Refund' : 'General'
}
