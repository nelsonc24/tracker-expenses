"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Download,
  Eye
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
    format: "Transaction Date, Effective Date, Description, Transaction Type, Debit Amount, Credit Amount, Balance",
    sample: "2024-01-15,2024-01-15,WOOLWORTHS 1234 SYDNEY NSW,Purchase,85.50,,1234.56"
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
  
  const steps: ImportStep[] = [
    { step: 1, title: 'Upload File', description: 'Select your CSV file', status: selectedFile ? 'completed' : 'current' },
    { step: 2, title: 'Parse Data', description: 'Extract transaction data', status: importStatus === 'processing' ? 'current' : importStatus === 'completed' ? 'completed' : 'pending' },
    { step: 3, title: 'Review', description: 'Check imported transactions', status: importStatus === 'completed' ? 'current' : 'pending' },
    { step: 4, title: 'Import', description: 'Save to your account', status: 'pending' }
  ]

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    // Auto-start processing for demo
    setTimeout(() => {
      setImportStatus('processing')
      setProgress(25)
      
      setTimeout(() => {
        setProgress(50)
        setTimeout(() => {
          setProgress(75)
          setTimeout(() => {
            setProgress(100)
            setImportStatus('completed')
            setParsedTransactions(sampleCSVData)
          }, 500)
        }, 500)
      }, 500)
    }, 1000)
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

      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload">Upload CSV</TabsTrigger>
          <TabsTrigger value="templates">Bank Templates</TabsTrigger>
          <TabsTrigger value="review" disabled={importStatus !== 'completed'}>
            Review ({parsedTransactions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Upload CSV File</CardTitle>
              <CardDescription>
                Select a CSV file exported from your bank's online portal
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedFile ? (
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                    dragOver ? "border-primary bg-primary/10" : "border-muted-foreground/25"
                  )}
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                >
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <div className="space-y-2">
                    <p className="text-lg font-medium">Drop your CSV file here</p>
                    <p className="text-muted-foreground">or click to browse</p>
                  </div>
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
          <Card>
            <CardHeader>
              <CardTitle>Review Imported Transactions</CardTitle>
              <CardDescription>
                Verify the imported data before saving to your account
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
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline">
                    Cancel
                  </Button>
                  <Button>
                    Import Transactions
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
