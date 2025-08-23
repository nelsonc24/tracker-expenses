"use client"

import { Button } from '@/components/ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  MoreHorizontal,
  Edit,
  Trash2,
  RefreshCw,
  Calendar
} from 'lucide-react'
import { toast } from 'sonner'

interface Account {
  id: string
  name: string
  institution: string
  accountType: string
  calculatedBalance: number
}

interface AccountActionsProps {
  account: Account
}

export function AccountActions({ account }: AccountActionsProps) {
  const handleEdit = () => {
    toast.info('Edit account feature coming soon!')
  }

  const handleSync = () => {
    toast.info('Account sync feature coming soon!')
  }

  const handleViewHistory = () => {
    toast.info('View history feature coming soon!')
  }

  const handleDelete = () => {
    toast.error('Delete account feature coming soon!')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleEdit}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Account
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSync}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Sync Now
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleViewHistory}>
          <Calendar className="h-4 w-4 mr-2" />
          View History
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600" onClick={handleDelete}>
          <Trash2 className="h-4 w-4 mr-2" />
          Remove Account
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
