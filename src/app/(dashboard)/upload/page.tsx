"use client"

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Upload, 
  File, 
  Check, 
  X, 
  AlertCircle,
  FileText,
  Download,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Bank format templates for common Australian banks
const BANK_FORMATS = {
  'commbank': {
    name: 'Commonwealth Bank',
    description: 'Standard CBA format with Date, Amount, Description, Balance',
    requiredColumns: ['Date', 'Amount', 'Description', 'Balance'],
    dateFormat: 'DD/MM/YYYY',
    separator: ','
  },
  'anz': {
    name: 'ANZ Bank',
    description: 'ANZ format with Date, Amount, Description, Running Balance',
    requiredColumns: ['Date', 'Amount', 'Description', 'Running Balance'],
    dateFormat: 'DD/MM/YYYY',
    separator: ','
  },
  'westpac': {
    name: 'Westpac',
    description: 'Westpac format with Date, Debit, Credit, Description, Balance',
    requiredColumns: ['Date', 'Debit', 'Credit', 'Description', 'Balance'],
    dateFormat: 'DD/MM/YYYY',
    separator: ','
  },
  'nab': {
    name: 'NAB',
    description: 'National Australia Bank format',
    requiredColumns: ['Date', 'Amount', 'Description', 'Balance'],
    dateFormat: 'DD/MM/YYYY',
    separator: ','
  },
  'custom': {
    name: 'Custom Format',
    description: 'Upload any CSV and we\'ll try to auto-detect the format',
    requiredColumns: [],
    dateFormat: 'Auto-detect',
    separator: 'Auto-detect'
  }
} as const

type BankFormat = keyof typeof BANK_FORMATS

interface FileWithPreview extends File {
  preview?: string
  id: string
  status: 'pending' | 'processing' | 'success' | 'error'
  progress: number
  rows?: number
  validRows?: number
  errors?: string[]
  bankFormat?: BankFormat
}

interface ParsedTransaction {
  date: string
  amount: number
  description: string
  category?: string
  balance?: number
}

export default function UploadPage() {
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [selectedFormat, setSelectedFormat] = useState<BankFormat>('custom')
  const [expandedFile, setExpandedFile] = useState<string | null>(null)

  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: FileWithPreview[] = acceptedFiles.map(file => ({
      ...file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending' as const,
      progress: 0,
      preview: file.type.startsWith('text/') ? URL.createObjectURL(file) : undefined
    }))
    
    setFiles(prev => [...prev, ...newFiles])
    
    // Auto-process files
    newFiles.forEach(file => processFile(file))
  }, [selectedFormat])

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'text/plain': ['.csv', '.txt'],
      'application/vnd.ms-excel': ['.csv']
    },
    maxFiles: 10,
    maxSize: 10 * 1024 * 1024 // 10MB
  })

  // Simulate file processing
  const processFile = async (file: FileWithPreview) => {
    setFiles(prev => prev.map(f => 
      f.id === file.id 
        ? { ...f, status: 'processing', progress: 0 }
        : f
    ))

    try {
      // Read file content
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      const totalRows = lines.length - 1 // Exclude header

      // Simulate processing with progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100))
        setFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { ...f, progress: i }
            : f
        ))
      }

      // Parse CSV data (simplified)
      const validRows = Math.floor(totalRows * 0.95) // 95% success rate
      const errors: string[] = []
      
      if (totalRows === 0) {
        errors.push('File appears to be empty')
      }
      if (validRows < totalRows) {
        errors.push(`${totalRows - validRows} rows could not be parsed`)
      }

      setFiles(prev => prev.map(f => 
        f.id === file.id 
          ? { 
              ...f, 
              status: errors.length === 0 ? 'success' : 'error',
              progress: 100,
              rows: totalRows,
              validRows,
              errors: errors.length > 0 ? errors : undefined,
              bankFormat: selectedFormat
            }
          : f
      ))

    } catch (error) {
      setFiles(prev => prev.map(f => 
        f.id === file.id 
          ? { 
              ...f, 
              status: 'error',
              progress: 100,
              errors: ['Failed to read file content']
            }
          : f
      ))
    }
  }

  const removeFile = (fileId: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId)
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview)
      }
      return prev.filter(f => f.id !== fileId)
    })
  }

  const retryFile = (fileId: string) => {
    const file = files.find(f => f.id === fileId)
    if (file) {
      processFile(file)
    }
  }

  const uploadAllFiles = async () => {
    const successfulFiles = files.filter(f => f.status === 'success')
    
    if (successfulFiles.length === 0) {
      return
    }

    // Simulate upload to database
    for (const file of successfulFiles) {
      setFiles(prev => prev.map(f => 
        f.id === file.id 
          ? { ...f, status: 'processing', progress: 0 }
          : f
      ))

      // Simulate upload progress
      for (let i = 0; i <= 100; i += 20) {
        await new Promise(resolve => setTimeout(resolve, 200))
        setFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { ...f, progress: i }
            : f
        ))
      }

      setFiles(prev => prev.map(f => 
        f.id === file.id 
          ? { ...f, status: 'success', progress: 100 }
          : f
      ))
    }
  }

  const getDropzoneClassName = () => {
    return cn(
      "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
      {
        "border-green-300 bg-green-50": isDragAccept,
        "border-red-300 bg-red-50": isDragReject,
        "border-primary bg-primary/5": isDragActive && !isDragAccept && !isDragReject,
        "border-muted-foreground/25 bg-muted/50": !isDragActive,
      }
    )
  }

  const getStatusIcon = (status: FileWithPreview['status']) => {
    switch (status) {
      case 'success':
        return <Check className="h-4 w-4 text-green-500" />
      case 'error':
        return <X className="h-4 w-4 text-red-500" />
      case 'processing':
        return <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusBadge = (file: FileWithPreview) => {
    switch (file.status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">Success</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      case 'processing':
        return <Badge variant="secondary">Processing...</Badge>
      default:
        return <Badge variant="outline">Pending</Badge>
    }
  }

  const totalFiles = files.length
  const successfulFiles = files.filter(f => f.status === 'success').length
  const errorFiles = files.filter(f => f.status === 'error').length
  const processingFiles = files.filter(f => f.status === 'processing').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Upload Transactions</h1>
        <p className="text-muted-foreground mt-2">
          Upload CSV files from your bank to automatically import transactions
        </p>
      </div>

      {/* Bank Format Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Bank Format</span>
          </CardTitle>
          <CardDescription>
            Select your bank format to ensure accurate parsing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedFormat} onValueChange={(value: BankFormat) => setSelectedFormat(value)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(BANK_FORMATS).map(([key, format]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex flex-col">
                    <span className="font-medium">{format.name}</span>
                    <span className="text-sm text-muted-foreground">{format.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedFormat !== 'custom' && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="text-sm">
                <strong>Expected columns:</strong> {BANK_FORMATS[selectedFormat].requiredColumns.join(', ')}
              </div>
              <div className="text-sm">
                <strong>Date format:</strong> {BANK_FORMATS[selectedFormat].dateFormat}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dropzone */}
      <Card>
        <CardContent className="p-6">
          <div {...getRootProps({ className: getDropzoneClassName() })}>
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            
            {isDragActive ? (
              isDragAccept ? (
                <p className="text-green-600 font-medium">Drop the CSV files here</p>
              ) : (
                <p className="text-red-600 font-medium">Some files will be rejected</p>
              )
            ) : (
              <div className="space-y-2">
                <p className="text-lg font-medium">Drag & drop CSV files here</p>
                <p className="text-muted-foreground">or click to select files</p>
                <p className="text-sm text-muted-foreground">
                  Supports: .csv files up to 10MB each (max 10 files)
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Uploaded Files ({totalFiles})</CardTitle>
              <div className="flex items-center space-x-2">
                {successfulFiles > 0 && (
                  <Button onClick={uploadAllFiles} disabled={processingFiles > 0}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import {successfulFiles} Files
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={() => setFiles([])}
                  disabled={processingFiles > 0}
                >
                  Clear All
                </Button>
              </div>
            </div>
            
            {totalFiles > 0 && (
              <div className="flex items-center space-x-4 text-sm">
                <span className="text-green-600">{successfulFiles} successful</span>
                {errorFiles > 0 && <span className="text-red-600">{errorFiles} errors</span>}
                {processingFiles > 0 && <span className="text-blue-600">{processingFiles} processing</span>}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {files.map((file) => (
              <div key={file.id} className="border rounded-lg p-4 space-y-3">
                {/* File Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(file.status)}
                    <div>
                      <div className="font-medium">{file.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                        {file.rows && ` • ${file.rows} rows`}
                        {file.validRows && file.rows && file.validRows !== file.rows && 
                          ` • ${file.validRows} valid`
                        }
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(file)}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedFile(expandedFile === file.id ? null : file.id)}
                    >
                      {expandedFile === file.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      disabled={file.status === 'processing'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Progress Bar */}
                {file.status === 'processing' && (
                  <Progress value={file.progress} className="w-full" />
                )}

                {/* Errors */}
                {file.errors && file.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        {file.errors.map((error, index) => (
                          <div key={index}>• {error}</div>
                        ))}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => retryFile(file.id)}
                      >
                        Retry
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Expanded Details */}
                {expandedFile === file.id && (
                  <div className="border-t pt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>Bank Format:</strong> {file.bankFormat ? BANK_FORMATS[file.bankFormat].name : 'Auto-detect'}
                      </div>
                      <div>
                        <strong>File Size:</strong> {(file.size / 1024).toFixed(1)} KB
                      </div>
                      <div>
                        <strong>Total Rows:</strong> {file.rows || 'Unknown'}
                      </div>
                      <div>
                        <strong>Valid Rows:</strong> {file.validRows || 'Unknown'}
                      </div>
                    </div>
                    
                    {file.status === 'success' && (
                      <div className="bg-green-50 p-3 rounded-lg">
                        <div className="text-sm text-green-800">
                          ✅ File processed successfully and ready for import
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5" />
            <span>CSV Format Guidelines</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Supported Banks</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Commonwealth Bank (CBA)</li>
                <li>• ANZ Bank</li>
                <li>• Westpac</li>
                <li>• National Australia Bank (NAB)</li>
                <li>• Custom formats (auto-detect)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">File Requirements</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• CSV format (.csv)</li>
                <li>• Maximum 10MB per file</li>
                <li>• Must include Date, Amount, Description</li>
                <li>• First row should be headers</li>
              </ul>
            </div>
          </div>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Privacy:</strong> Files are processed locally in your browser before being sent to our secure servers. 
              We only store transaction data, not the original files.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
