import React from 'react'
import { Badge } from '@/components/ui/badge'
import { RefreshCw } from 'lucide-react'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface BudgetPeriodDisplayProps {
  periodLabel: string
  status: 'active' | 'completed' | 'future' | 'cancelled'
  autoResetEnabled?: boolean
  period?: string
}

export function BudgetPeriodDisplay({ 
  periodLabel, 
  status, 
  autoResetEnabled,
  period 
}: BudgetPeriodDisplayProps) {
  const statusBadge = status === 'active' ? (
    <Badge variant="default" className="bg-green-500">
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        Active
      </div>
    </Badge>
  ) : status === 'completed' ? (
    <Badge variant="secondary">Completed</Badge>
  ) : status === 'future' ? (
    <Badge variant="outline">Upcoming</Badge>
  ) : (
    <Badge variant="destructive">Cancelled</Badge>
  )

  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">{periodLabel}</h3>
        {statusBadge}
      </div>
      {autoResetEnabled && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              Auto-resets {period}ly
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}
