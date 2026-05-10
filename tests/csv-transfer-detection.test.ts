import { isTransferTransaction, validateTransactionRow } from '@/lib/csv-processing'

describe('CSV transfer detection', () => {
  test('marks transfer when description contains transfer', () => {
    expect(isTransferTransaction('Internal Transfer To Savings')).toBe(true)
  })

  test('marks transfer when reference contains transfer', () => {
    expect(isTransferTransaction('Monthly top up', 'TRANSFER 12345')).toBe(true)
  })

  test('does not mark transfer when neither description nor reference match', () => {
    expect(isTransferTransaction('Woolworths Purchase', 'POS 987')).toBe(false)
  })

  test('validateTransactionRow sets isTransfer from reference text', () => {
    const transaction = validateTransactionRow(
      {
        Date: '10/05/2026',
        Description: 'Payment received',
        Amount: '100.00',
        Reference: 'bank transfer from savings',
      },
      {
        name: 'Test Bank',
        columns: ['Date', 'Description', 'Amount', 'Reference'],
        dateFormat: 'DD/MM/YYYY',
        example: 'Date,Description,Amount,Reference',
        amountColumns: { amount: 'Amount' },
        descriptionColumn: 'Description',
      },
      0
    )

    expect(transaction.isTransfer).toBe(true)
  })
})
