import fs from 'fs'
import path from 'path'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFParser = require('pdf2json')

async function findTransactionSection() {
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
      
      // Normalize
      fullText = fullText.replace(/([a-zA-Z0-9])\s+(?=[a-zA-Z0-9]\s)/g, '$1')
      
      // Find transaction section
      const startIdx = fullText.indexOf('Yourtransactions')
      if (startIdx === -1) {
        console.log('Could not find "Yourtransactions"')
        resolve('')
        return
      }
      
      // Get next 2000 characters after "Your transactions"
      const section = fullText.substring(startIdx, startIdx + 2000)
      console.log('===TRANSACTION SECTION===\n')
      console.log(section)
      
      resolve(section)
    })
    
    pdfParser.parseBuffer(pdfBuffer)
  })
}

findTransactionSection().catch(console.error)
