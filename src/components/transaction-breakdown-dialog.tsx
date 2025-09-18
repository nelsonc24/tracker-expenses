'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Plus, Trash2, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Transaction {
  id: string
  amount: string
  description: string
  date: string
}

interface Activity {
  id: string
  name: string
}

interface LineItem {
  id?: string
  description: string
  amount: number
  subcategory: string
  notes: string
}

interface TransactionBreakdownDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: Transaction | null
  activity: Activity | null
  onSuccess: () => void
}

export function TransactionBreakdownDialog({ 
  open, 
  onOpenChange, 
  transaction, 
  activity, 
  onSuccess 
}: TransactionBreakdownDialogProps) {
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const transactionAmount = transaction ? parseFloat(transaction.amount) : 0
  const lineItemsTotal = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0)
  const remainingAmount = transactionAmount - lineItemsTotal
  const isValid = remainingAmount >= 0 && lineItems.length > 0 && lineItems.every(item => 
    item.description.trim() && item.amount > 0
  )

  // Fetch existing breakdown if it exists
  const fetchExistingBreakdown = useCallback(async () => {
    if (!transaction?.id) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/transactions/${transaction.id}/breakdown`)
      if (response.ok) {
        const data = await response.json()
        
        // Convert existing line items to form format
        if (data.lineItems && data.lineItems.length > 0) {
          const formattedItems = data.lineItems.map((item: { id: string; description: string; amount: string; subcategory: string | null; notes: string | null }) => ({
            id: item.id,
            description: item.description,
            amount: parseFloat(item.amount),
            subcategory: item.subcategory || '',
            notes: item.notes || '',
          }))
          setLineItems(formattedItems)
        }
      }
    } catch (error) {
      console.error('Error fetching existing breakdown:', error)
    } finally {
      setIsLoading(false)
    }
  }, [transaction?.id])

  // Load existing breakdown when dialog opens
  useEffect(() => {
    if (open) {
      fetchExistingBreakdown()
    }
  }, [open, fetchExistingBreakdown])

  const addLineItem = () => {
    setLineItems([...lineItems, {
      description: '',
      amount: 0,
      subcategory: '',
      notes: '',
    }])
  }

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }
    setLineItems(updated)
  }

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!transaction?.id || !activity?.id || !isValid) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/activity-line-items/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId: transaction.id,
          activityId: activity.id,
          items: lineItems.map(item => ({
            description: item.description.trim(),
            amount: item.amount,
            subcategory: item.subcategory || null,
            notes: item.notes.trim() || null,
          }))
        }),
      })

      if (response.ok) {
        onSuccess()
        onOpenChange(false)
        // Reset form
        setLineItems([])
      } else {
        const errorData = await response.json()
        console.error('Failed to create line items:', errorData)
        // You could show a toast error here
      }
    } catch (error) {
      console.error('Error creating line items:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const splitEvenly = () => {
    if (lineItems.length === 0) return
    
    const amountPerItem = transactionAmount / lineItems.length
    const updated = lineItems.map(item => ({
      ...item,
      amount: amountPerItem
    }))
    setLineItems(updated)
  }

  const assignRemaining = () => {
    if (lineItems.length === 0 || remainingAmount <= 0) return
    
    const updated = [...lineItems]
    updated[0] = { ...updated[0], amount: updated[0].amount + remainingAmount }
    setLineItems(updated)
  }

  const quickActions = (
    <div className="flex flex-col sm:flex-row gap-2 mb-4">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={splitEvenly}
        disabled={lineItems.length === 0}
        className="w-full sm:w-auto"
      >
        Split Evenly
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={assignRemaining}
        disabled={lineItems.length === 0 || remainingAmount <= 0}
        className="w-full sm:w-auto"
      >
        Assign Remaining to First Item
      </Button>
    </div>
  )

  const summaryCard = (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Amount Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between">
          <span>Transaction Amount:</span>
          <span className="font-medium">{formatCurrency(transactionAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span>Line Items Total:</span>
          <span className="font-medium">{formatCurrency(lineItemsTotal)}</span>
        </div>
        <div className="flex justify-between border-t pt-2">
          <span>Remaining:</span>
          <span className={`font-medium ${remainingAmount < 0 ? 'text-red-500' : remainingAmount > 0 ? 'text-orange-500' : 'text-green-500'}`}>
            {formatCurrency(remainingAmount)}
          </span>
        </div>
        {remainingAmount < 0 && (
          <div className="flex items-center gap-2 text-red-500 text-sm">
            <AlertCircle className="h-4 w-4" />
            Line items exceed transaction amount
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl h-[95vh] max-h-[95vh] overflow-y-auto sm:w-full sm:max-w-4xl sm:h-auto sm:max-h-[90vh]">
        <DialogHeader>
          <div className="space-y-2">
            <DialogTitle>Transaction Breakdown</DialogTitle>
            {transaction && (
              <Badge variant="outline" className="w-fit">
                {transaction.description}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8">Loading existing breakdown...</div>
        ) : (
          <div className="space-y-6 p-4 sm:p-6">
            {/* Transaction Info */}
            {transaction && (
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Transaction</Label>
                      <p className="text-sm text-muted-foreground break-words">{transaction.description}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Amount</Label>
                      <p className="text-sm text-muted-foreground">{formatCurrency(transactionAmount)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary */}
            {summaryCard}

            {/* Quick Actions */}
            {lineItems.length > 0 && quickActions}

            {/* Line Items */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-lg font-medium">Line Items</h3>
                <Button type="button" onClick={addLineItem} size="sm" className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Line Item
                </Button>
              </div>

              {lineItems.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-muted-foreground">Click &ldquo;Add Line Item&rdquo; to start breaking down this transaction.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {lineItems.map((item, index) => (
                    <Card key={index}>
                      <CardContent className="pt-6">
                        <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-4 sm:items-start">
                          <div className="sm:col-span-4">
                            <Label htmlFor={`description-${index}`}>Description</Label>
                            <Input
                              id={`description-${index}`}
                              value={item.description}
                              onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                              placeholder="e.g., Dance shoes"
                            />
                          </div>
                          
                          <div className="sm:col-span-2">
                            <Label htmlFor={`amount-${index}`}>Amount</Label>
                            <Input
                              id={`amount-${index}`}
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.amount || ''}
                              onChange={(e) => updateLineItem(index, 'amount', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                            />
                          </div>
                          
                          <div className="sm:col-span-3">
                            <Label htmlFor={`subcategory-${index}`}>Subcategory</Label>
                            <Input
                              id={`subcategory-${index}`}
                              value={item.subcategory}
                              onChange={(e) => updateLineItem(index, 'subcategory', e.target.value)}
                              placeholder="e.g., Equipment"
                            />
                          </div>
                          
                          <div className="sm:col-span-2">
                            <Label htmlFor={`notes-${index}`}>Notes</Label>
                            <Textarea
                              id={`notes-${index}`}
                              value={item.notes}
                              onChange={(e) => updateLineItem(index, 'notes', e.target.value)}
                              placeholder="Optional notes..."
                              rows={1}
                            />
                          </div>
                          
                          <div className="flex justify-end sm:col-span-1 sm:pt-6">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLineItem(index)}
                              className="w-full sm:w-auto"
                            >
                              <Trash2 className="h-4 w-4 sm:mr-0 mr-2" />
                              <span className="sm:hidden">Remove Item</span>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!isValid || isSubmitting}
                className="w-full sm:w-auto order-1 sm:order-2"
              >
                {isSubmitting ? 'Saving...' : 'Save Breakdown'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
