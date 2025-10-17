# Credit Card & Multi-Format Import Feature

## Overview
This feature adds support for importing transactions from multiple file formats:
- **PDF**: Credit card statements (starting with Latitud)
- **CSV**: Bank transaction exports (existing + credit card CSVs)
- **JSON**: Custom transaction data

## Implementation Summary

### New Components

#### 1. PDF Processing (`src/lib/pdf-processing.ts`)
- Parses credit card statement PDFs using `pdf-parse` library
- Extracts transaction data, statement metadata, and interest-free purchases
- Currently supports: **Latitud Gem Visa** statements
- Automatically categorizes transactions

**Key Features:**
- Extracts statement metadata (dates, balances, credit limits)
- Parses regular transactions and interest-free purchases
- Converts amounts to proper debit/credit format
- Auto-categorization of common merchants

#### 2. Credit Card CSV Formats (`src/lib/csv-processing.ts`)
Added two new bank formats:
- `latitud`: Latitud credit card CSV exports
- `creditcard`: Generic credit card format

**Format Structure:**
```csv
Date,Card,Description,Debits,Credits
08/09/2025,7458,BPAY Payment Received,,4160.00
09/09/2025,7458,Woolworths Epping,54.15,
```

#### 3. Multi-Format API Endpoint (`src/app/api/transactions/parse-file/route.ts`)
New endpoint that handles PDF, CSV, and JSON file uploads:
- `POST /api/transactions/parse-file`
- Accepts FormData with file and accountId
- Returns parsed transactions in standardized format

**Request:**
```typescript
FormData {
  file: File (PDF/CSV/JSON)
  accountId: string
  fileType: 'pdf' | 'csv' | 'json'
}
```

**Response:**
```json
{
  "success": true,
  "message": "PDF parsed successfully",
  "transactions": [...],
  "metadata": {
    "statementDate": "2025-09-30",
    "accountNumber": "6010732003287458",
    "openingBalance": 5074.24,
    "closingBalance": 1461.37,
    "creditLimit": 5200.00,
    "availableCredit": 3738.63,
    "minimumPayment": 43.84,
    "dueDate": "2025-10-25"
  }
}
```

#### 4. Updated Import Page (`src/app/(dashboard)/import/page.tsx`)
Enhanced the import page to support multiple file formats:
- Updated file input to accept `.csv`, `.pdf`, and `.json`
- Added async file handling for PDF and JSON
- Updated UI to show format-specific instructions
- Added visual indicators for different file types

## Usage

### For PDF Imports (Credit Card Statements)

1. **Navigate to Import Page**: `/import`
2. **Select Account**: Choose your credit card account (e.g., "Latitud Gem Visa")
3. **Upload PDF**: Drag & drop or select your credit card statement PDF
4. **Review**: Transactions are automatically extracted and categorized
5. **Import**: Click "Import Transactions" to save

**Supported PDF Formats:**
- ✅ Latitud Gem Visa statements
- 🚧 More formats coming soon

### For JSON Imports

Create a JSON file with transaction data:

```json
[
  {
    "date": "2025-10-01",
    "description": "Woolworths Epping",
    "amount": -85.50,
    "category": "Groceries"
  },
  {
    "date": "2025-10-05",
    "description": "Payment Received",
    "amount": 1000.00,
    "category": "Payment"
  }
]
```

**Alternative format:**
```json
{
  "transactions": [...]
}
```

**Field Mapping:**
- `date` or `transaction_date` or `transactionDate` → Date
- `description` or `merchant` or `name` → Description
- `amount` → Amount (negative for expenses, positive for income/payments)
- `category` → Category (optional, defaults to "Uncategorized")

### For CSV Imports (Credit Cards)

**Latitud CSV Format:**
```csv
Date,Card,Description,Debits,Credits
08/09/2025,7458,BPAY Payment Received,,4160.00
09/09/2025,7458,Woolworths Epping,54.15,
```

**Generic Credit Card CSV:**
```csv
Date,Description,Amount
01/01/2025,Purchase at Store,-50.00
05/01/2025,Payment Received,200.00
```

## Transaction Processing

### Amount Convention
For credit cards:
- **Negative amounts** = Purchases/Charges (increase debt)
- **Positive amounts** = Payments/Credits (decrease debt)

### Auto-Categorization
The system automatically categorizes transactions based on merchant names:

| Merchant Pattern | Category |
|-----------------|----------|
| BPAY, Payment | Payment |
| Fee, Interest | Fees & Charges |
| Temu, Amazon, Costco | Shopping |
| Woolworths, Coles | Groceries |
| Restaurant, Cafe, McDonald's | Dining |
| Electricity, Gas, Internet | Utilities |
| Pharmacy, Medical, Doctor | Healthcare |
| Petrol, Uber, Taxi | Transport |

## Testing

### Test with Sample Files

1. **PDF Test**: Use the provided Latitud statement
   - File: `files/30_September_2025_statement-latitud.pdf`
   - Expected: 7 regular transactions + 2 interest-free transactions

2. **JSON Test**: Use the sample JSON file
   - File: `files/sample-transactions.json`
   - Expected: 5 transactions with various categories

3. **CSV Test**: Create a Latitud CSV export
   - Format: Date, Card, Description, Debits, Credits
   - Test with both debit and credit entries

### Manual Testing Steps

1. Create a credit card account in `/accounts`
   - Name: "Latitud Gem Visa"
   - Type: Credit Card
   - Initial balance: -1835.01 (debt)

2. Import the PDF statement
   - Go to `/import`
   - Select the credit card account
   - Upload: `30_September_2025_statement-latitud.pdf`
   - Verify all 9 transactions are extracted

3. Check transaction details
   - Dates are correctly formatted
   - Amounts have proper signs (payments positive, purchases negative)
   - Categories are automatically assigned
   - Card numbers are captured

4. Import JSON sample
   - Upload: `sample-transactions.json`
   - Verify 5 transactions are parsed
   - Check categories are preserved

## Extending Support

### Adding New Credit Card Formats

To add support for another credit card:

1. **Update PDF Parser** (`src/lib/pdf-processing.ts`):
```typescript
export async function parseNewBankPDF(pdfBuffer: ArrayBuffer) {
  // Extract text
  const data = await parsePDF(Buffer.from(pdfBuffer))
  const text = data.text
  
  // Parse transactions using regex patterns
  // Return CreditCardStatement format
}
```

2. **Add to CSV Formats** (`src/lib/csv-processing.ts`):
```typescript
newbank: {
  name: 'New Bank Credit Card',
  columns: ['Date', 'Description', 'Amount'],
  dateFormat: 'DD/MM/YYYY',
  amountColumns: { amount: 'Amount' },
  descriptionColumn: 'Description'
}
```

3. **Update Detection Logic** (`src/app/api/transactions/parse-file/route.ts`):
```typescript
// Add bank-specific detection
if (text.includes('New Bank Credit Card')) {
  return await parseNewBankPDF(arrayBuffer)
}
```

## Future Enhancements

- [ ] Support for more credit card issuers (ANZ, CommBank, Westpac)
- [ ] PDF statement parsing for bank accounts (not just credit cards)
- [ ] OCR for scanned statements
- [ ] Bulk import (multiple files at once)
- [ ] Import scheduling/automation
- [ ] Transaction deduplication across imports
- [ ] Support for QIF and OFX formats
- [ ] Import from banking APIs (Open Banking)

## Dependencies

- `pdf-parse@2.4.3`: PDF text extraction
- `pdf-parse` uses `pdfjs-dist` under the hood

## Known Limitations

1. PDF parsing is text-based (requires readable PDFs, not scanned images)
2. Currently only supports Latitud credit card statements
3. Transaction deduplication is basic (based on date + amount + description)
4. Large PDF files (>10MB) may take longer to process

## Troubleshooting

### PDF Import Fails
- **Error**: "Unsupported credit card statement format"
  - **Solution**: Currently only Latitud statements are supported. Check if your PDF is from Latitud.

- **Error**: "Failed to parse file"
  - **Solution**: Ensure the PDF is not password-protected or corrupted.

### JSON Import Issues
- **Error**: "Invalid JSON format"
  - **Solution**: Validate your JSON structure. Must be an array or object with `transactions` array.

- **Missing Fields**: Some transactions don't import
  - **Solution**: Ensure each transaction has `date`, `description`, and `amount` fields.

### CSV Import Problems
- **Wrong Format Detected**: Use manual format selection
  - Select "Latitud Credit Card" or "Generic Credit Card" from the format dropdown

## Security Considerations

- Files are processed server-side with authentication
- Original files are not stored, only extracted transaction data
- User must own the account to import transactions
- File size limits prevent abuse (10MB default)

## Performance Notes

- PDF parsing: ~1-2 seconds per statement
- CSV parsing: <1 second for most files
- JSON parsing: <1 second
- Large files (>5MB) may require optimization

---

**Created**: October 17, 2025
**Last Updated**: October 17, 2025
**Status**: ✅ Implemented and Ready for Testing
