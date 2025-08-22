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
  DollarSign,
  Building2,
  ChevronDown,
  ChevronUp,
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
  balance: number
  tags?: string[]
  notes?: string
}

type MobileTransactionCardProps = {
  transaction: Transaction
  isSelected: boolean
  onSelect: (checked: boolean) => void
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
  showDetails?: boolean
}

export function MobileTransactionCard({
  transaction,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
  showDetails = false
}: MobileTransactionCardProps) {
  const [isExpanded, setIsExpanded] = useState(showDetails)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount)
  }

  return (
    <Card className={cn(
      "transition-all duration-200",
      isSelected && "ring-2 ring-primary ring-offset-2",
      "hover:shadow-md"
    )}>
      <CardContent className="p-4">
        {/* Main Row */}
        <div className="flex items-start justify-between">
          {/* Left side - Checkbox and main info */}
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              className="mt-1 min-w-[20px]"
            />
            
            <div className="flex-1 min-w-0">
              {/* Primary info */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">
                    {transaction.description}
                  </h3>
                  {transaction.merchant && (
                    <p className="text-xs text-muted-foreground truncate">
                      {transaction.merchant}
                    </p>
                  )}
                </div>
                
                {/* Amount */}
                <div className="text-right ml-2">
                  <div className={cn(
                    "font-semibold text-sm",
                    transaction.amount >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {formatCurrency(transaction.amount)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(transaction.date)}
                  </div>
                </div>
              </div>

              {/* Secondary info - Category and Account */}
              <div className="flex items-center space-x-2 mb-2">
                <Badge variant="secondary" className="text-xs">
                  {transaction.category}
                </Badge>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground truncate">
                  {transaction.account}
                </span>
              </div>

              {/* Expandable details */}
              {isExpanded && (
                <div className="space-y-2 pt-2 border-t border-border">
                  {transaction.reference && (
                    <div className="flex items-center gap-2">
                      <Tag className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Ref: {transaction.reference}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Balance: {formatCurrency(transaction.balance)}
                    </span>
                  </div>

                  {transaction.tags && transaction.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {transaction.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {transaction.notes && (
                    <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                      {transaction.notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center space-x-1 ml-2">
            {/* Expand/Collapse button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>

            {/* Actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
