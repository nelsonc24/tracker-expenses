"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Download,
  Eye,
  Building2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { bankFormats, validateTransactionRow, validateParsedTransactions, ProcessedTransaction, type BankFormat } from '@/lib/csv-processing'

const bankTemplates = [
  {
    name: "UBank",
    format: "Date and time, Description, Debit, Credit, From account, To account, Payment type, Category, Receipt number, Transaction ID",
    sample: '"20:38 20-08-25","Direct Credit Example","","$200.00","","Bills account","Direct Entry","Uncategorised","","""12345"""'
  },
  {
    name: "CommBank",
    format: "Date, Amount, Description, Balance (no headers)",
    sample: '12/09/2025,"-508.02","Direct Debit 372582 Nissan Financial","+586.72"'
  },
  {
    name: "ANZ", 
    format: "Date, Description, Reference, Debit, Credit, Balance",
    sample: "15/01/2024,WOOLWORTHS 1234,REF123,85.50,,1234.56"
  },
  {
    name: "Westpac",
    format: "Date, Description, Debit Amount, Credit Amount, Balance",
    sample: "15/01/2024,WOOLWORTHS 1234,85.50,,1234.56"
  }
]

// Helper function to detect bank format from CSV content
function detectBankFormat(csvContent: string): BankFormat {
  const lines = csvContent.split('\n').filter(line => line.trim())
  const firstLine = lines[0]
  
  // Check for Commonwealth Bank format (no headers, specific structure)
  if (!firstLine.includes('Date') && !firstLine.includes('Description')) {
    const fields = parseCSVLine(firstLine)
    // Commonwealth Bank: Date, Amount, Description, Balance
    if (fields.length >= 4 && fields[0].match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return bankFormats.commonwealth
    }
  }
  
  // Check for UBank format (specific header pattern)
  if (firstLine.includes('Date and time') || firstLine.includes('Payment type')) {
    return bankFormats.ubank
  }
  
  // Default to Commonwealth for now if unclear
  return bankFormats.commonwealth
}

// Helper function to parse CSV line handling quoted fields
const parseCSVLine = (line: string): string[] => {
  const result: string[] = []
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
  
  result.push(current) // Add the last field
  return result
}

interface ImportStep {
  step: number
  title: string
  description: string
  status: 'pending' | 'current' | 'completed' | 'error'
}

// Type for skipped/duplicate transactions in the import result
interface SkippedTransaction {
  description: string
  date: string
  amount: number
  reason?: string
}

export default function ImportPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [importStatus, setImportStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [parsedTransactions, setParsedTransactions] = useState<ProcessedTransaction[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [activeTab, setActiveTab] = useState("upload")
  const [importResult, setImportResult] = useState<{
    importedCount: number
    skippedCount: number
    totalProcessed: number
    duplicateTransactions: SkippedTransaction[]
  } | null>(null)
  const [accounts, setAccounts] = useState<{id: string, name: string, type: string, institution?: string, accountType?: string}[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [selectedBankFormat, setSelectedBankFormat] = useState<string>('auto')
  
  // Fetch user accounts on component mount
  useEffect(() => {
    const fetchAccounts = async () => {
      setLoadingAccounts(true)
      try {
        const response = await fetch('/api/accounts')
        if (response.ok) {
          const accounts = await response.json()
          console.log('Fetched accounts:', accounts) // Debug log
          setAccounts(accounts || [])
          // Auto-select first account if available
          if (accounts && accounts.length > 0) {
            setSelectedAccountId(accounts[0].id)
          }
        } else {
          console.error('Failed to fetch accounts:', response.status, response.statusText)
        }
      } catch (error) {
        console.error('Error fetching accounts:', error)
      } finally {
        setLoadingAccounts(false)
      }
    }
    
    fetchAccounts()
  }, [])
  
  // Auto-switch tabs based on import progress
  useEffect(() => {
    if (importStatus === 'completed' && parsedTransactions.length > 0) {
      setActiveTab("review")
    } else if (importStatus === 'completed' && importResult) {
      // If import is done and we have results, stay on review to show results
      setActiveTab("review")
    }
  }, [importStatus, parsedTransactions.length, importResult])
  
  const steps: ImportStep[] = [
    { step: 1, title: 'Select Account', description: 'Choose destination account', status: selectedAccountId ? 'completed' : 'current' },
    { step: 2, title: 'Upload File', description: 'Select your CSV file', status: selectedFile ? 'completed' : selectedAccountId ? 'current' : 'pending' },
    { step: 3, title: 'Parse Data', description: 'Extract transaction data', status: importStatus === 'processing' ? 'current' : importStatus === 'completed' || importStatus === 'error' ? 'completed' : 'pending' },
    { step: 4, title: 'Review & Import', description: 'Check and save transactions', status: importStatus === 'completed' && !isImporting ? 'current' : importStatus === 'error' ? 'error' : 'pending' }
  ]

  const handleDownloadTemplate = (bankName: string) => {
    const format = bankFormats[bankName.toLowerCase().replace(' ', '')]
    if (!format) return
    
    const csvContent = format.example
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${bankName}-template.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const handleViewGuide = (bankName: string) => {
    // Open the templates tab and scroll to the specific bank
    setActiveTab('templates')
    setTimeout(() => {
      const element = document.getElementById(`template-${bankName.toLowerCase().replace(' ', '-')}`)
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    setImportStatus('processing')
    setProgress(25)
    
    // Read and parse the actual CSV file
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const lines = text.split('\n').filter(line => line.trim())
        
        setProgress(50)
        
        // Detect bank format or use selected format
        const bankFormat = selectedBankFormat === 'auto' 
          ? detectBankFormat(text) 
          : bankFormats[selectedBankFormat]
        
        // Skip header rows if specified in format
        const dataLines = bankFormat.skipRows ? lines.slice(bankFormat.skipRows) : lines
        
        // Get headers for formats that use them (like UBank)
        let headers: string[] = []
        if (bankFormat.skipRows && bankFormat.skipRows > 0) {
          headers = parseCSVLine(lines[0])
        }
        
        // Process each line using the detected format
        const processedTransactions = dataLines.map((line, index) => {
          const fields = parseCSVLine(line)
          
          // Convert array to object for formats with headers
          let rowData: Record<string, string> | string[]
          if (headers.length > 0) {
            // Convert fields array to object using headers
            const rowObject: Record<string, string> = {}
            headers.forEach((header, i) => {
              rowObject[header] = fields[i] || ''
            })
            rowData = rowObject
          } else {
            // Use array format (for Commonwealth Bank)
            rowData = fields
          }
          
          return validateTransactionRow(rowData, bankFormat, index)
        }).filter(transaction => 
          // Filter out completely invalid transactions - keep if it has any valid data
          transaction && (transaction.status !== 'error' || transaction.date || transaction.description)
        )
        
        // Validate the overall import quality
        const validationResult = validateParsedTransactions(processedTransactions)
        
        console.log('Processing results:', {
          totalLines: lines.length,
          dataLines: dataLines.length,
          processedTransactions: processedTransactions.length,
          validationResult,
          sampleTransaction: processedTransactions[0]
        })
        
        if (!validationResult.isValid) {
          // Show more detailed error information
          const errorDetails = [
            `Found ${processedTransactions.length} processed transactions`,
            `Valid: ${validationResult.stats.valid}`,
            `Errors: ${validationResult.stats.errors}`,
            `Warnings: ${validationResult.stats.warnings}`,
            ...validationResult.errors
          ].join('\n')
          
          throw new Error(`Import validation failed:\n${errorDetails}`)
        }
        
        setProgress(75)
        
        setTimeout(() => {
          setProgress(100)
          setImportStatus('completed')
          setParsedTransactions(processedTransactions)
        }, 500)
        
      } catch (error) {
        console.error('Error parsing CSV:', error)
        setImportStatus('error')
      }
    }
    
    reader.onerror = () => {
      console.error('Error reading file')
      setImportStatus('error')
    }
    
    reader.readAsText(file)
  }

  // Helper function to parse CSV line handling quoted fields
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
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
    
    result.push(current) // Add the last field
    return result
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files[0] && files[0].type === 'text/csv') {
      handleFileSelect(files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDismissResults = () => {
    setSelectedFile(null)
    setImportStatus('idle')
    setProgress(0)
    setImportResult(null)
    setParsedTransactions([])
  }

  const handleImportTransactions = async () => {
    if (parsedTransactions.length === 0) return
    
    if (!selectedAccountId) {
      alert('Please select an account for the imported transactions')
      return
    }
    
    setIsImporting(true)
    
    try {
      // Transform the processed transactions to match the API expected format
      const transactionsToImport = parsedTransactions
        .filter(transaction => transaction.status === 'valid')
        .map(transaction => ({
          date: transaction.date,
          description: transaction.description,
          amount: transaction.amount,
          category: transaction.category,
          account: selectedAccountId,
          reference: transaction.reference || transaction.merchant,
          balance: transaction.balance || null,
          transactionId: transaction.transactionId || null,
          receiptNumber: transaction.receiptNumber || null
        }))

      const response = await fetch('/api/transactions/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactions: transactionsToImport,
          uploadId: `upload_${Date.now()}`,
          accountId: selectedAccountId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to import transactions')
      }

      const result = await response.json()
      
      // Store import result for display
      setImportResult({
        importedCount: result.importedCount,
        skippedCount: result.skippedCount,
        totalProcessed: result.totalProcessed,
        duplicateTransactions: result.duplicateTransactions || []
      })
      
      // Show success state
      setImportStatus('completed')
      
      // Clear the parsed transactions to show the result
      setParsedTransactions([])
      
      // Don't auto-clear - let user dismiss manually
      
    } catch (error) {
      console.error('Import error:', error)
      setImportStatus('error')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Import Transactions</h1>
        <p className="text-muted-foreground mt-2">
          Upload CSV files from your bank to automatically import transactions
        </p>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Import Progress</CardTitle>
          <CardDescription>Follow these steps to import your transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            {steps.map((step, index) => (
              <div key={step.step} className="flex flex-col items-center">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium",
                  step.status === 'completed' ? 'bg-green-500 text-white' :
                  step.status === 'current' ? 'bg-primary text-primary-foreground' :
                  step.status === 'error' ? 'bg-red-500 text-white' :
                  'bg-muted text-muted-foreground'
                )}>
                  {step.status === 'completed' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : step.status === 'error' ? (
                    <XCircle className="w-5 h-5" />
                  ) : (
                    step.step
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="absolute top-5 left-full w-full h-0.5 bg-muted -z-10" />
                )}
              </div>
            ))}
          </div>
          
          {importStatus === 'processing' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Processing file...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload">Upload CSV</TabsTrigger>
          <TabsTrigger value="templates">Bank Templates</TabsTrigger>
          <TabsTrigger value="review" disabled={importStatus !== 'completed'}>
            Review ({parsedTransactions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          {/* Account Selection */}
          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">1</div>
                <Building2 className="h-5 w-5" />
                Select Account
              </CardTitle>
              <CardDescription>
                Choose which account these imported transactions belong to. This helps organize your finances by bank.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="account-select">Account</Label>
                {loadingAccounts ? (
                  <div className="flex items-center space-x-2 p-2 text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span>Loading accounts...</span>
                  </div>
                ) : accounts.length === 0 ? (
                  <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-orange-900 dark:text-orange-100">
                          No accounts found
                        </p>
                        <p className="text-sm text-orange-700 dark:text-orange-300">
                          Please create an account first before importing transactions.
                        </p>
                        <Button variant="outline" size="sm" className="mt-2" asChild>
                          <a href="/accounts">Create Account</a>
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select an account for imported transactions" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{account.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {account.institution}
                            </Badge>
                            <span className="text-muted-foreground">
                              ({account.accountType})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedAccountId && accounts.length > 0 && (
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-blue-700 dark:text-blue-300">
                        Transactions will be imported to: <span className="font-medium">
                          {accounts.find(acc => acc.id === selectedAccountId)?.name}
                        </span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bank Format Selection */}
          <Card className={cn(
            "transition-all duration-200",
            !selectedAccountId ? "opacity-60" : "border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-800"
          )}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                  selectedAccountId ? "bg-purple-500 text-white" : "bg-muted text-muted-foreground"
                )}>1.5</div>
                <FileText className="h-5 w-5" />
                Select Bank Format
              </CardTitle>
              <CardDescription>
                {selectedAccountId 
                  ? "Choose your bank's CSV format or let us auto-detect it"
                  : "Select an account first, then choose the bank format"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="format-select">CSV Format</Label>
                <Select value={selectedBankFormat} onValueChange={setSelectedBankFormat} disabled={!selectedAccountId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Auto-detect format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-detect (Recommended)</SelectItem>
                    <SelectItem value="commonwealth">Commonwealth Bank</SelectItem>
                    <SelectItem value="ubank">UBank</SelectItem>
                    <SelectItem value="anz">ANZ Bank</SelectItem>
                    <SelectItem value="westpac">Westpac</SelectItem>
                    <SelectItem value="nab">NAB</SelectItem>
                  </SelectContent>
                </Select>
                {selectedBankFormat !== 'auto' && (
                  <div className="mt-2 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-purple-500" />
                      <span className="text-sm text-purple-700 dark:text-purple-300">
                        Using <span className="font-medium">{bankFormats[selectedBankFormat]?.name || selectedBankFormat}</span> format
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card className={cn(
            "transition-all duration-200",
            !selectedAccountId ? "opacity-60" : "border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800"
          )}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                  selectedAccountId ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                )}>2</div>
                <Upload className="h-5 w-5" />
                Upload CSV File
              </CardTitle>
              <CardDescription>
                {selectedAccountId 
                  ? "Select a CSV file exported from your bank's online portal"
                  : "First select an account above, then upload your CSV file"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedFile ? (
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                    dragOver ? "border-primary bg-primary/10" : "border-muted-foreground/25",
                    !selectedAccountId ? "opacity-50 pointer-events-none" : ""
                  )}
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                >
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <div className="space-y-2">
                    <p className="text-lg font-medium">
                      {!selectedAccountId ? "Select an account first" : "Drop your CSV file here"}
                    </p>
                    <p className="text-muted-foreground">
                      {!selectedAccountId ? "Choose which account these transactions belong to" : "or click to browse"}
                    </p>
                  </div>
                  {selectedAccountId && (
                    <>
                      <Label htmlFor="file-upload" className="mt-4 inline-block">
                        <Button asChild>
                          <span>Choose File</span>
                        </Button>
                      </Label>
                      <Input
                        id="file-upload"
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-4 p-4 bg-muted/50 rounded-lg">
                  <FileText className="h-8 w-8 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Badge variant={importStatus === 'completed' ? 'default' : 'secondary'}>
                    {importStatus === 'completed' ? 'Processed' : 'Ready'}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Format Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>📋 CSV Format Requirements</CardTitle>
              <CardDescription>
                Make sure your CSV follows these guidelines for best results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-semibold text-green-600">✅ Required</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Date column (various formats supported)</li>
                    <li>• Description/Merchant column</li>
                    <li>• Amount column (debit/credit or single)</li>
                    <li>• UTF-8 encoding</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-blue-600">💡 Optional</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Category column</li>
                    <li>• Reference/Transaction ID</li>
                    <li>• Account balance</li>
                    <li>• Transaction type</li>
                  </ul>
                </div>
              </div>
              
              <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-orange-900 dark:text-orange-100">
                      Supported Banks
                    </p>
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      UBank, CommBank, ANZ, Westpac, NAB, and most Australian banks. 
                      Check the templates tab for specific formats.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="grid gap-4">
            {bankTemplates.map((template) => (
              <Card key={template.name} id={`template-${template.name.toLowerCase().replace(' ', '-')}`}>
                <CardHeader>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>CSV format and sample data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Expected Format:</Label>
                    <code className="block mt-1 p-3 bg-muted rounded text-sm font-mono break-all">
                      {template.format}
                    </code>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Sample Data:</Label>
                    <code className="block mt-1 p-3 bg-muted rounded text-sm font-mono break-all">
                      {template.sample}
                    </code>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownloadTemplate(template.name)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewGuide(template.name)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Guide
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="review" className="space-y-6">
          {/* Import Summary Card */}
          {(parsedTransactions.length > 0 || importResult) && (
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Import Summary
                </CardTitle>
                <CardDescription>
                  Review the details of your import before proceeding
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Account Information */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Destination Account</Label>
                    <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg border">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {accounts.find(acc => acc.id === selectedAccountId)?.name || 'Unknown Account'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {accounts.find(acc => acc.id === selectedAccountId)?.institution} • {accounts.find(acc => acc.id === selectedAccountId)?.accountType}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* File Information */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">CSV File</Label>
                    <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg border">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate" title={selectedFile?.name}>
                          {selectedFile?.name || 'No file selected'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedFile ? `${(selectedFile.size / 1024).toFixed(2)} KB` : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Format Information */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Bank Format</Label>
                    <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg border">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">
                          {selectedBankFormat === 'auto' 
                            ? 'Auto-detected' 
                            : bankFormats[selectedBankFormat]?.name || selectedBankFormat}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedBankFormat === 'auto' ? 'Format detected automatically' : 'Manually selected format'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Transaction Count */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Transactions</Label>
                    <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg border">
                      <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          {parsedTransactions.length}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">
                          {parsedTransactions.filter(t => t.status === 'valid').length} Valid
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {parsedTransactions.filter(t => t.status === 'error').length} with errors
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Import Status Banner */}
                {importResult && (
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-900 dark:text-green-100">
                        Import completed: {importResult.importedCount} imported, {importResult.skippedCount} skipped
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Success Message */}
          {importStatus === 'completed' && importResult && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2 text-green-800">
                    <div className="h-4 w-4 rounded-full bg-green-500"></div>
                    <p className="font-medium">Import completed successfully!</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismissResults}
                    className="h-8 text-green-700 hover:text-green-900 hover:bg-green-100"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Dismiss
                  </Button>
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-700">Imported transactions:</span>
                    <span className="font-medium text-green-800">{importResult.importedCount}</span>
                  </div>
                  {importResult.skippedCount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-orange-700">Skipped duplicates:</span>
                      <span className="font-medium text-orange-800">{importResult.skippedCount}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-green-300 pt-2">
                    <span className="text-green-700">Total processed:</span>
                    <span className="font-medium text-green-800">{importResult.totalProcessed}</span>
                  </div>
                </div>
                
                {/* Show duplicate transactions if any */}
                {importResult.duplicateTransactions.length > 0 && (
                  <div className="mt-4 border-t border-orange-200 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-orange-900 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Skipped Duplicate Transactions ({importResult.duplicateTransactions.length})
                      </p>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                      {importResult.duplicateTransactions.map((tx, index) => (
                        <div key={index} className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-orange-900 dark:text-orange-100 truncate">
                                {tx.description}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-orange-700 dark:text-orange-300">
                                <span className="flex items-center gap-1">
                                  <span className="font-mono">{tx.date}</span>
                                </span>
                                <span className="font-semibold">
                                  ${Math.abs(tx.amount).toFixed(2)}
                                </span>
                              </div>
                              {tx.reason && (
                                <div className="mt-1 text-xs text-orange-600 dark:text-orange-400 italic">
                                  {tx.reason}
                                </div>
                              )}
                            </div>
                            <Badge variant="outline" className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700 shrink-0">
                              Duplicate
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-orange-700 dark:text-orange-300 mt-3 italic">
                      These transactions were skipped because they already exist in your account.
                    </p>
                  </div>
                )}
                
                <p className="text-sm text-green-600 mt-3">
                  {importResult.importedCount > 0 && "New transactions have been added to your account. "}
                  You can view them in the Transactions page.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Error Message */}
          {importStatus === 'error' && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2 text-red-800">
                  <div className="h-4 w-4 rounded-full bg-red-500"></div>
                  <p className="font-medium">Import failed</p>
                </div>
                <p className="text-sm text-red-600 mt-1">
                  There was an error importing your transactions. Please try again.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Review Imported Transactions</CardTitle>
              <CardDescription>
                Verify the imported data before saving to your account. Duplicate transactions will be automatically detected and skipped.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {parsedTransactions.map((transaction, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{transaction.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>{transaction.date}</span>
                        <Badge variant="outline">{transaction.category}</Badge>
                        {transaction.status === 'error' && (
                          <Badge variant="destructive" className="text-xs">
                            Error: {transaction.errors[0]?.message}
                          </Badge>
                        )}
                        {transaction.reference && (
                          <span className="text-xs bg-muted px-2 py-1 rounded">
                            {transaction.reference}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "font-medium",
                        transaction.amount < 0 ? "text-red-500" : "text-green-500"
                      )}>
                        {transaction.amount < 0 ? `-$${Math.abs(transaction.amount).toFixed(2)}` : 
                         `+$${transaction.amount.toFixed(2)}`}
                      </p>
                      {transaction.balance && (
                        <p className="text-sm text-muted-foreground">
                          Balance: ${transaction.balance.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-6 pt-6 border-t gap-4">
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {parsedTransactions.length} transactions ready to import
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
                    {selectedAccountId && accounts.length > 0 && (
                      <>
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          <span className="font-medium text-blue-600 dark:text-blue-400">
                            {accounts.find(acc => acc.id === selectedAccountId)?.name}
                          </span>
                        </span>
                        <span>•</span>
                      </>
                    )}
                    {selectedFile && (
                      <>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          <span className="truncate max-w-[200px]" title={selectedFile.name}>
                            {selectedFile.name}
                          </span>
                        </span>
                        <span>•</span>
                      </>
                    )}
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      {selectedBankFormat === 'auto' ? 'Auto-detected' : bankFormats[selectedBankFormat]?.name || selectedBankFormat}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setSelectedFile(null)
                      setParsedTransactions([])
                      setImportStatus('idle')
                      setProgress(0)
                    }}
                    disabled={isImporting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleImportTransactions}
                    disabled={isImporting || parsedTransactions.length === 0 || !selectedAccountId}
                  >
                    {isImporting ? 'Importing...' : 'Import Transactions'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
