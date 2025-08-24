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

// Sample UBank CSV data format based on your provided sample
const sampleCSVData = [
  {
    "Transaction Date": "2024-01-15",
    "Effective Date": "2024-01-15", 
    "Description": "WOOLWORTHS 1234 SYDNEY NSW",
    "Transaction Type": "Purchase",
    "Debit Amount": "85.50",
    "Credit Amount": "",
    "Balance": "1,234.56"
  },
  {
    "Transaction Date": "2024-01-14",
    "Effective Date": "2024-01-14",
    "Description": "SALARY CREDIT - COMPANY XYZ",
    "Transaction Type": "Credit",
    "Debit Amount": "",
    "Credit Amount": "3,500.00",
    "Balance": "3,320.06"
  }
]

const bankTemplates = [
  {
    name: "UBank",
    format: "Date and time, Description, Debit, Credit, From account, To account, Payment type, Category, Receipt number, Transaction ID",
    sample: '"20:38 20-08-25","Direct Credit Example","","$200.00","","Bills account","Direct Entry","Uncategorised","","""12345"""'
  },
  {
    name: "CommBank",
    format: "Date, Description, Amount, Balance",
    sample: "15/01/2024,WOOLWORTHS 1234,-85.50,1234.56"
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

interface ImportStep {
  step: number
  title: string
  description: string
  status: 'pending' | 'current' | 'completed' | 'error'
}

export default function ImportPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [importStatus, setImportStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [parsedTransactions, setParsedTransactions] = useState<any[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [activeTab, setActiveTab] = useState("upload")
  const [importResult, setImportResult] = useState<{
    importedCount: number
    skippedCount: number
    totalProcessed: number
    duplicateTransactions: any[]
  } | null>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  
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
        
        // Skip header row and parse CSV data
        const dataLines = lines.slice(1)
        const parsedData = dataLines.map(line => {
          // Parse CSV line (handle commas in quoted fields)
          const fields = parseCSVLine(line)
          
          // Map actual UBank CSV format to our expected format
          // UBank format: Date and time, Description, Debit, Credit, From account, To account, Payment type, Category, Receipt number, Transaction ID
          const dateTime = fields[0]?.replace(/"/g, '').trim() || ''
          const description = fields[1]?.replace(/"/g, '').trim() || ''
          const debit = fields[2]?.replace(/[$",]/g, '').trim() || '' // Remove commas too
          const credit = fields[3]?.replace(/[$",]/g, '').trim() || '' // Remove commas too
          const paymentType = fields[6]?.replace(/"/g, '').trim() || ''
          const receiptNumber = fields[8]?.replace(/"/g, '').trim() || ''  // Extract Receipt number
          const transactionId = fields[9]?.replace(/"/g, '').trim() || ''  // Extract Transaction ID
          
          // Convert UBank date format (HH:MM DD-MM-YY) to standard date
          const convertDate = (dateTimeStr: string) => {
            if (!dateTimeStr) return ''
            const parts = dateTimeStr.split(' ')
            if (parts.length !== 2) return dateTimeStr
            
            const [time, date] = parts
            const [day, month, year] = date.split('-')
            return `20${year}-${month}-${day}` // Convert to YYYY-MM-DD format
          }
          
          return {
            "Transaction Date": convertDate(dateTime),
            "Effective Date": convertDate(dateTime),
            "Description": description,
            "Transaction Type": paymentType || (debit ? 'Debit' : 'Credit'),
            "Debit Amount": debit,
            "Credit Amount": credit,
            "Balance": '', // UBank doesn't provide running balance in this export
            "Receipt Number": receiptNumber, // Store the bank's Receipt Number
            "Transaction ID": transactionId // Store the bank's Transaction ID
          }
        }).filter(transaction => 
          // Filter out empty rows
          transaction["Transaction Date"] && transaction.Description
        )
        
        setProgress(75)
        
        setTimeout(() => {
          setProgress(100)
          setImportStatus('completed')
          setParsedTransactions(parsedData)
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

  const handleImportTransactions = async () => {
    if (parsedTransactions.length === 0) return
    
    if (!selectedAccountId) {
      alert('Please select an account for the imported transactions')
      return
    }
    
    setIsImporting(true)
    
    try {
      // Transform the sample CSV data to match the API expected format
      const transactionsToImport = parsedTransactions.map(transaction => {
        // Helper function to safely parse currency amounts
        const parseAmount = (amountStr: string): number => {
          if (!amountStr) return 0
          // Remove any currency symbols, commas, and spaces, then parse
          const cleaned = amountStr.replace(/[$,\s]/g, '').trim()
          const parsed = parseFloat(cleaned)
          return isNaN(parsed) ? 0 : parsed
        }

        return {
          date: transaction["Transaction Date"],
          description: transaction.Description,
          amount: transaction["Debit Amount"] 
            ? -parseAmount(transaction["Debit Amount"]) 
            : parseAmount(transaction["Credit Amount"] || "0"),
          category: transaction["Transaction Type"] === "Purchase" ? "Shopping" : 
                   transaction["Transaction Type"] === "Credit" ? "Income" : "Other",
          account: selectedAccountId, // Use selected account ID instead of hardcoded string
          reference: transaction["Transaction ID"] || transaction["Transaction Type"], // Use Transaction ID as reference
          receiptNumber: transaction["Receipt Number"], // Send Receipt Number for reconciliation
          transactionId: transaction["Transaction ID"], // Send Transaction ID separately for database storage
          balance: transaction.Balance ? parseAmount(transaction.Balance) : null
        }
      })

      const response = await fetch('/api/transactions/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactions: transactionsToImport,
          uploadId: `upload_${Date.now()}`,
          accountId: selectedAccountId // Send account ID separately for better processing
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
      
      // Reset form after success
      setTimeout(() => {
        setSelectedFile(null)
        setImportStatus('idle')
        setProgress(0)
        setImportResult(null)
      }, 5000) // Give more time to read the results
      
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
              <Card key={template.name}>
                <CardHeader>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>CSV format and sample data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Expected Format:</Label>
                    <code className="block mt-1 p-3 bg-muted rounded text-sm font-mono">
                      {template.format}
                    </code>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Sample Data:</Label>
                    <code className="block mt-1 p-3 bg-muted rounded text-sm font-mono">
                      {template.sample}
                    </code>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                    <Button variant="outline" size="sm">
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
          {/* Success Message */}
          {importStatus === 'completed' && importResult && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2 text-green-800">
                  <div className="h-4 w-4 rounded-full bg-green-500"></div>
                  <p className="font-medium">Import completed successfully!</p>
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
                  <div className="mt-4">
                    <p className="text-sm font-medium text-orange-800 mb-2">Skipped duplicate transactions:</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {importResult.duplicateTransactions.map((tx, index) => (
                        <div key={index} className="text-xs p-2 bg-orange-50 rounded border border-orange-200">
                          <div className="font-medium">{tx.description}</div>
                          <div className="text-orange-600">{tx.date} • ${Math.abs(tx.amount).toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
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
                      <p className="font-medium">{transaction.Description}</p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>{transaction["Transaction Date"]}</span>
                        <Badge variant="outline">{transaction["Transaction Type"]}</Badge>
                        {transaction["Transaction ID"] && (
                          <span className="text-xs bg-muted px-2 py-1 rounded">
                            ID: {transaction["Transaction ID"]}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "font-medium",
                        transaction["Debit Amount"] ? "text-red-500" : "text-green-500"
                      )}>
                        {transaction["Debit Amount"] ? `-$${transaction["Debit Amount"]}` : 
                         transaction["Credit Amount"] ? `+$${transaction["Credit Amount"]}` : '$0.00'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Balance: ${transaction.Balance}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex items-center justify-between mt-6 pt-6 border-t">
                <div className="text-sm text-muted-foreground">
                  {parsedTransactions.length} transactions ready to import
                  {selectedAccountId && accounts.length > 0 && (
                    <span className="block mt-1 text-blue-600">
                      → {accounts.find(acc => acc.id === selectedAccountId)?.name}
                    </span>
                  )}
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
