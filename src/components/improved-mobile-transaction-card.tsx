"use client"

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Tag,
  Calendar,
  Building2,
  ChevronDown,
  ChevronUp,
  Eye,
  Activity,
  BarChart3,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

type Transaction = {
  id: string
  date: string
  description: string
  amount: number
  category: string
  account: string
  merchant: string
  reference: string
  receiptNumber?: string
  balance: number
  tags?: string[]
  notes?: string
  isTransfer?: boolean
}

type ImprovedMobileTransactionCardProps = {
  transaction: Transaction
  isSelected: boolean
  onSelect: (checked: boolean) => void
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
  onViewDetails?: () => void
  onCategoryClick?: () => void
  onAssignActivity?: () => void
  onBreakdown?: () => void
  showDetails?: boolean
}

export function ImprovedMobileTransactionCard({
  transaction,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
  onViewDetails,
  onCategoryClick,
  onAssignActivity,
  onBreakdown,
  showDetails = false
}: ImprovedMobileTransactionCardProps) {
  const [isExpanded, setIsExpanded] = useState(showDetails)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount)
  }

  return (
    <Card className={cn(
      "transition-all duration-200 w-full",
      isSelected && "ring-2 ring-primary ring-offset-2",
      "hover:shadow-md"
    )}>
      <CardContent className="p-3 sm:p-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Selection checkbox */}
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            className="mt-0.5 flex-shrink-0"
          />
          
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Top row: Description and Amount */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm leading-tight mb-1">
                  {transaction.description}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3 flex-shrink-0" />
                  <span>{formatDate(transaction.date)}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className={cn(
                  "font-semibold text-sm",
                  transaction.amount >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {formatCurrency(transaction.amount)}
                </div>
              </div>
            </div>
            
            {/* Middle row: Merchant */}
            {transaction.merchant && (
              <div className="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{transaction.merchant}</span>
              </div>
            )}
            
            {/* Bottom row: Category and Account */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-xs cursor-pointer hover:bg-secondary/80 transition-colors",
                    "truncate max-w-[120px]"
                  )}
                  onClick={onCategoryClick}
                  title={transaction.category}
                >
                  <Tag className="h-3 w-3 mr-1 flex-shrink-0" />
                  {transaction.category}
                </Badge>
                <Badge variant="outline" className="text-xs truncate max-w-[100px]" title={transaction.account}>
                  {transaction.account}
                </Badge>
                {transaction.isTransfer && transaction.amount > 0 && (
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                    Transfer
                  </Badge>
                )}
              </div>
              
              {/* Action buttons */}
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-7 w-7 p-0 text-muted-foreground"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={onEdit} className="text-xs">
                      <Edit className="h-3.5 w-3.5 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onDuplicate} className="text-xs">
                      <Copy className="h-3.5 w-3.5 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    {onAssignActivity && (
                      <DropdownMenuItem onClick={onAssignActivity} className="text-xs">
                        <Activity className="h-3.5 w-3.5 mr-2" />
                        Assign Activity
                      </DropdownMenuItem>
                    )}
                    {onBreakdown && (
                      <DropdownMenuItem onClick={onBreakdown} className="text-xs">
                        <BarChart3 className="h-3.5 w-3.5 mr-2" />
                        Breakdown Expenses
                      </DropdownMenuItem>
                    )}
                    {onViewDetails && (
                      <DropdownMenuItem onClick={onViewDetails} className="text-xs">
                        <Eye className="h-3.5 w-3.5 mr-2" />
                        View Details
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      onClick={onDelete}
                      className="text-xs text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
        
        {/* Expanded details */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
            {transaction.reference && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Tag className="h-3 w-3 flex-shrink-0" />
                <span>Reference: {transaction.reference}</span>
              </div>
            )}
            
            {transaction.receiptNumber && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Receipt: {transaction.receiptNumber}</span>
              </div>
            )}
            
            {transaction.balance && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Balance: {formatCurrency(transaction.balance)}</span>
              </div>
            )}
            
            {transaction.tags && transaction.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {transaction.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
            
            {transaction.notes && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Notes:</span> {transaction.notes}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}