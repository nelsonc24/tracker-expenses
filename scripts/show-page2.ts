import fs from 'fs'
import path from 'path'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFParser = require('pdf2json')

async function showPage2() {
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
      
      if (pdfData.Pages && pdfData.Pages[1]) {
        const page = pdfData.Pages[1]
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
      }
      
      // Normalize
      fullText = fullText.replace(/([a-zA-Z0-9])\s+(?=[a-zA-Z0-9]\s)/g, '$1')
      
      console.log('=== PAGE 2 (first 1500 chars) ===\n')
      console.log(fullText.substring(0, 1500))
      
      resolve(fullText)
    })
    
    pdfParser.parseBuffer(pdfBuffer)
  })
}

showPage2().catch(console.error)
