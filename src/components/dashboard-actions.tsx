'use client'

import { Button } from '@/components/ui/button'
import { ExportDialog } from '@/components/export-dialog'
import { Download, Plus } from 'lucide-react'
import Link from 'next/link'

interface DashboardActionsProps {
  accounts: Array<{ id: string; name: string; institution: string }>
  categories: Array<{ id: string; name: string }>
}

export function DashboardActions({ accounts, categories }: DashboardActionsProps) {
  return (
    <>
      <ExportDialog 
        trigger={
          <Button variant="outline" size="sm" className="text-xs sm:text-sm">
            <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Export</span>
            <span className="sm:hidden">Export</span>
          </Button>
        }
        accounts={accounts}
        categories={categories}
      />
      <Link href="/transactions">
        <Button size="sm" className="text-xs sm:text-sm">
          <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Add Transaction</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </Link>
    </>
  )
}
