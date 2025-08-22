'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog'
import { 
  Download, 
  FileText, 
  Database, 
  Calendar,
  Filter,
  RefreshCw,
  CheckCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExportDialogProps {
  trigger?: React.ReactNode
  accounts?: Array<{ id: string; name: string; institution: string }>
  categories?: Array<{ id: string; name: string }>
}

export function ExportDialog({ trigger, accounts = [], categories = [] }: ExportDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportComplete, setExportComplete] = useState(false)
  
  // Form state
  const [exportConfig, setExportConfig] = useState({
    format: 'csv',
    dataType: 'transactions',
    startDate: '',
    endDate: '',
    categoryIds: [] as string[],
    accountIds: [] as string[],
    includeMetadata: true
  })

  async function handleExport() {
    try {
      setIsExporting(true)
      setExportComplete(false)

      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportConfig),
      })

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`)
      }

      // Handle file download
      const contentType = response.headers.get('content-type')
      const contentDisposition = response.headers.get('content-disposition')
      
      let filename = `expense-tracker-export-${new Date().toISOString().split('T')[0]}`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      } else {
        filename += `.${exportConfig.format}`
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      setExportComplete(true)
      setTimeout(() => {
        setIsOpen(false)
        setExportComplete(false)
      }, 2000)

    } catch (error) {
      console.error('Export error:', error)
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsExporting(false)
    }
  }

  function resetForm() {
    setExportConfig({
      format: 'csv',
      dataType: 'transactions',
      startDate: '',
      endDate: '',
      categoryIds: [],
      accountIds: [],
      includeMetadata: true
    })
    setExportComplete(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (!open) resetForm()
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Export Data</span>
          </DialogTitle>
          <DialogDescription>
            Export your financial data in various formats with custom filters.
          </DialogDescription>
        </DialogHeader>

        {exportComplete ? (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
            <h3 className="text-lg font-medium mb-2">Export Complete!</h3>
            <p className="text-muted-foreground text-center">
              Your data has been downloaded successfully.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Export Format */}
            <div className="space-y-2">
              <Label>Export Format</Label>
              <Select 
                value={exportConfig.format} 
                onValueChange={(value) => setExportConfig({ ...exportConfig, format: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span>CSV (Excel Compatible)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="json">
                    <div className="flex items-center space-x-2">
                      <Database className="h-4 w-4" />
                      <span>JSON (Raw Data)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="xlsx">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span>Excel (Coming Soon)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Data Type */}
            <div className="space-y-2">
              <Label>Data to Export</Label>
              <Select 
                value={exportConfig.dataType} 
                onValueChange={(value) => setExportConfig({ ...exportConfig, dataType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transactions">Transactions Only</SelectItem>
                  <SelectItem value="budgets">Budgets Only</SelectItem>
                  <SelectItem value="recurring">Recurring Transactions Only</SelectItem>
                  <SelectItem value="all">All Data</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-3">
              <Label className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Date Range (Optional)</span>
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Start Date</Label>
                  <Input
                    type="date"
                    value={exportConfig.startDate}
                    onChange={(e) => setExportConfig({ ...exportConfig, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">End Date</Label>
                  <Input
                    type="date"
                    value={exportConfig.endDate}
                    onChange={(e) => setExportConfig({ ...exportConfig, endDate: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Account Filter */}
            {accounts.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center space-x-2">
                  <Filter className="h-4 w-4" />
                  <span>Filter by Accounts (Optional)</span>
                </Label>
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {accounts.map((account) => (
                    <div key={account.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`account-${account.id}`}
                        checked={exportConfig.accountIds.includes(account.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setExportConfig({
                              ...exportConfig,
                              accountIds: [...exportConfig.accountIds, account.id]
                            })
                          } else {
                            setExportConfig({
                              ...exportConfig,
                              accountIds: exportConfig.accountIds.filter(id => id !== account.id)
                            })
                          }
                        }}
                      />
                      <label 
                        htmlFor={`account-${account.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {account.name} - {account.institution}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category Filter */}
            {categories.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center space-x-2">
                  <Filter className="h-4 w-4" />
                  <span>Filter by Categories (Optional)</span>
                </Label>
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${category.id}`}
                        checked={exportConfig.categoryIds.includes(category.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setExportConfig({
                              ...exportConfig,
                              categoryIds: [...exportConfig.categoryIds, category.id]
                            })
                          } else {
                            setExportConfig({
                              ...exportConfig,
                              categoryIds: exportConfig.categoryIds.filter(id => id !== category.id)
                            })
                          }
                        }}
                      />
                      <label 
                        htmlFor={`category-${category.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {category.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Include Metadata */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-metadata"
                checked={exportConfig.includeMetadata}
                onCheckedChange={(checked) => 
                  setExportConfig({ ...exportConfig, includeMetadata: !!checked })
                }
              />
              <label htmlFor="include-metadata" className="text-sm">
                Include detailed metadata and system fields
              </label>
            </div>

            {/* Export Info */}
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">
                {exportConfig.format === 'csv' && 'CSV files can be opened in Excel, Google Sheets, or any spreadsheet application.'}
                {exportConfig.format === 'json' && 'JSON format includes all data fields and is ideal for data analysis or backup purposes.'}
                {exportConfig.format === 'xlsx' && 'Excel format with formatted worksheets and charts (coming soon).'}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            disabled={isExporting}
          >
            Cancel
          </Button>
          {!exportComplete && (
            <Button 
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
