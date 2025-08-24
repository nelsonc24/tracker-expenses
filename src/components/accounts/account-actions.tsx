"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  MoreHorizontal,
  Edit,
  Trash2,
  RefreshCw,
  Calendar
} from 'lucide-react'
import { toast } from 'sonner'
import { EditAccountDialog } from './edit-account-dialog'

interface Account {
  id: string
  name: string
  institution: string
  accountType: string
  accountNumber: string | null
  bsb: string | null
  balance: string
  isActive: boolean
  calculatedBalance: number
}

interface AccountActionsProps {
  account: Account
}

export function AccountActions({ account }: AccountActionsProps) {
  const router = useRouter()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleEdit = () => {
    setIsEditDialogOpen(true)
  }

  const handleSync = () => {
    // For now, this is just a placeholder since real bank sync would require
    // integration with financial institutions APIs like Open Banking
    toast.info('Bank sync feature coming soon! This would connect to your bank to automatically update transactions and balances.')
  }

  const handleViewHistory = () => {
    // Navigate to transactions page filtered by this account
    router.push(`/transactions?account=${account.id}`)
  }

  const handleDeleteConfirm = async () => {
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/accounts/${account.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete account')
      }

      toast.success('Account removed successfully!')
      setIsDeleteDialogOpen(false)
      
      // Refresh the page to show the updated accounts
      router.refresh()
    } catch (error) {
      console.error('Error deleting account:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete account')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDelete = () => {
    setIsDeleteDialogOpen(true)
  }

  return (
    <>
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

      {/* Edit Account Dialog */}
      <EditAccountDialog 
        account={account}
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove &quot;{account.name}&quot; 
              from your accounts. If this account has transactions, it will be deactivated 
              instead of deleted to preserve transaction history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Removing...' : 'Remove Account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
