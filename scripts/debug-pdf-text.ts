import fs from 'fs'
import path from 'path'

/**
 * Debug script - Extract raw text from PDF to see structure
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFParser = require('pdf2json')

async function debugPDFText() {
  console.log('🔍 Debugging PDF Text Extraction\n')
  
  const pdfPath = path.join(process.cwd(), 'files/30_September_2025_statement-latitud.pdf')
  const pdfBuffer = fs.readFileSync(pdfPath)
  
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser()
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdfParser.on('pdfParser_dataError', (errData: any) => {
      reject(new Error(errData.parserError))
    })
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
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
                    try {
                      fullText += decodeURIComponent(r.T) + ' '
                    } catch {
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
      
      console.log('=== BEFORE NORMALIZATION ===')
      console.log(fullText.substring(0, 500))
      
      // Normalize spaced-out text
      fullText = fullText.replace(/([a-zA-Z0-9])\s+(?=[a-zA-Z0-9]\s)/g, '$1')
      
      console.log('\n=== AFTER NORMALIZATION ===')
      console.log(fullText.substring(0, 500))
      
      console.log('\n=== SEARCHING FOR KEY PATTERNS ===')
      console.log('Has "Statement date":', fullText.includes('Statement date'))
      console.log('Has "Account number":', fullText.includes('Account number'))
      console.log('Has "Closing balance":', fullText.includes('Closing balance'))
      console.log('Has "Your transactions":', fullText.includes('Your transactions'))
      console.log('Has "BPAY":', fullText.includes('BPAY'))
      
      resolve(fullText)
    })
    
    pdfParser.parseBuffer(pdfBuffer)
  })
}

debugPDFText().catch(console.error)
