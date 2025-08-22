"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Play,
  Clock,
  DollarSign,
  Building2,
  Tag
} from 'lucide-react'
import { TransactionTemplate, CreateTransactionTemplate } from '@/lib/validations/templates'
import { cn } from '@/lib/utils'

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(amount)
}

type TransactionTemplatesProps = {
  categories: string[]
  accounts: string[]
  onApplyTemplate: (template: TransactionTemplate, overrides?: any) => void
  trigger?: React.ReactNode
}

export function TransactionTemplates({ categories, accounts, onApplyTemplate, trigger }: TransactionTemplatesProps) {
  const [templates, setTemplates] = useState<TransactionTemplate[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TransactionTemplate | null>(null)
  const [loading, setLoading] = useState(false)

  // Form state for creating/editing templates
  const [formData, setFormData] = useState<CreateTransactionTemplate>({
    name: '',
    description: '',
    amount: 0,
    category: '',
    account: '',
    merchant: '',
    reference: '',
    notes: '',
    tags: [],
    isRecurring: false,
  })

  // Load templates
  const loadTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/templates')
      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (error) {
      console.error('Failed to load templates:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isDialogOpen) {
      loadTemplates()
    }
  }, [isDialogOpen])

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      amount: 0,
      category: '',
      account: '',
      merchant: '',
      reference: '',
      notes: '',
      tags: [],
      isRecurring: false,
    })
    setEditingTemplate(null)
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      
      const url = editingTemplate ? '/api/templates' : '/api/templates'
      const method = editingTemplate ? 'PUT' : 'POST'
      const body = editingTemplate 
        ? { id: editingTemplate.id, ...formData }
        : formData

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        setIsCreateOpen(false)
        resetForm()
        loadTemplates()
      }
    } catch (error) {
      console.error('Failed to save template:', error)
    } finally {
      setLoading(false)
    }
  }

  // Delete template
  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      setLoading(true)
      const response = await fetch(`/api/templates?id=${templateId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        loadTemplates()
      }
    } catch (error) {
      console.error('Failed to delete template:', error)
    } finally {
      setLoading(false)
    }
  }

  // Edit template
  const handleEdit = (template: TransactionTemplate) => {
    setFormData({
      name: template.name,
      description: template.description,
      amount: template.amount,
      category: template.category,
      account: template.account,
      merchant: template.merchant,
      reference: template.reference,
      notes: template.notes,
      tags: template.tags,
      isRecurring: template.isRecurring,
      recurringInterval: template.recurringInterval,
    })
    setEditingTemplate(template)
    setIsCreateOpen(true)
  }

  // Apply template with optional overrides
  const handleApply = (template: TransactionTemplate) => {
    onApplyTemplate(template)
    setIsDialogOpen(false)
  }

  const defaultTrigger = (
    <Button variant="outline">
      <FileText className="h-4 w-4 mr-2" />
      Templates
    </Button>
  )

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Transaction Templates
          </DialogTitle>
          <DialogDescription>
            Create and manage templates for frequently used transactions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header with Create button */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {templates.length} template{templates.length !== 1 ? 's' : ''} available
            </p>
            <Button 
              onClick={() => {
                resetForm()
                setIsCreateOpen(true)
              }}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </div>

          {/* Templates grid */}
          {loading ? (
            <div className="text-center py-8">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No templates created yet</p>
              <p className="text-sm">Create your first template to get started</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {templates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        {template.description && (
                          <CardDescription className="mt-1">
                            {template.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleApply(template)}
                          className="h-8 w-8 p-0"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(template)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(template.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Amount */}
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className={cn(
                        "font-medium",
                        template.amount >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {formatCurrency(template.amount)}
                      </span>
                    </div>

                    {/* Category & Account */}
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{template.category}</span>
                      <span className="text-muted-foreground">•</span>
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{template.account}</span>
                    </div>

                    {/* Merchant */}
                    {template.merchant && (
                      <div className="text-sm text-muted-foreground">
                        Merchant: {template.merchant}
                      </div>
                    )}

                    {/* Recurring indicator */}
                    {template.isRecurring && template.recurringInterval && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="secondary" className="text-xs">
                          {template.recurringInterval}
                        </Badge>
                      </div>
                    )}

                    {/* Tags */}
                    {template.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {template.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>

      {/* Create/Edit Template Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create Template'}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate ? 'Update template details' : 'Create a new transaction template for reuse'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Template Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Monthly Rent, Weekly Groceries"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this template"
                rows={2}
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
                required
              />
              <p className="text-xs text-muted-foreground">
                Negative amounts for expenses, positive for income
              </p>
            </div>

            {/* Category & Account */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="account">Account</Label>
                <Select 
                  value={formData.account} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, account: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account} value={account}>
                        {account}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Optional Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="merchant">Merchant (Optional)</Label>
                <Input
                  id="merchant"
                  value={formData.merchant}
                  onChange={(e) => setFormData(prev => ({ ...prev, merchant: e.target.value }))}
                  placeholder="e.g., Woolworths, ANZ Bank"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">Reference (Optional)</Label>
                <Input
                  id="reference"
                  value={formData.reference}
                  onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                  placeholder="e.g., RENT-001, INV-123"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes for this template"
                rows={2}
              />
            </div>

            {/* Recurring */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, isRecurring: !!checked }))
                  }
                />
                <Label htmlFor="isRecurring">This is a recurring transaction</Label>
              </div>

              {formData.isRecurring && (
                <div className="space-y-2 ml-6">
                  <Label htmlFor="interval">Recurring Interval</Label>
                  <Select 
                    value={formData.recurringInterval} 
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, recurringInterval: value }))}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select interval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
