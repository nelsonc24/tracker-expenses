"use client"

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeftRight, Loader2, Check, X, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Transaction {
  id: string
  description: string
  amount: number
  category: string
  categoryId: string | null
  date: string
  account: string
  accountId: string | null
  isTransfer?: boolean
  transferPairId?: string | null
}

interface LinkTransfersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transactions: Transaction[]
  onSuccess: () => void
}

interface TransferMatch {
  transaction: Transaction
  potentialMatches: Array<{
    transaction: Transaction
    matchScore: number
    reasons: string[]
  }>
}

export function LinkTransfersDialog({
  open,
  onOpenChange,
  transactions,
  onSuccess,
}: LinkTransfersDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<string>('')
  const [selectedMatch, setSelectedMatch] = useState<string>('')

  // Find unlinked transfers
  const unlinkedTransfers = useMemo(() => {
    return transactions.filter(t => t.isTransfer && !t.transferPairId)
  }, [transactions])

  // Smart matching algorithm
  const findMatches = (transaction: Transaction): TransferMatch['potentialMatches'] => {
    const matches: TransferMatch['potentialMatches'] = []
    const txAmount = Math.abs(transaction.amount)
    const txDate = new Date(transaction.date)

    unlinkedTransfers.forEach(candidate => {
      // Skip self and same-sign transactions
      if (
        candidate.id === transaction.id ||
        (transaction.amount > 0 && candidate.amount > 0) ||
        (transaction.amount < 0 && candidate.amount < 0) ||
        !candidate.accountId ||
        candidate.accountId === transaction.accountId
      ) {
        return
      }

      const candidateAmount = Math.abs(candidate.amount)
      const candidateDate = new Date(candidate.date)
      const daysDiff = Math.abs((txDate.getTime() - candidateDate.getTime()) / (1000 * 60 * 60 * 24))

      const reasons: string[] = []
      let score = 0

      // Exact amount match (highest priority)
      if (txAmount === candidateAmount) {
        score += 50
        reasons.push('Exact amount match')
      } else if (Math.abs(txAmount - candidateAmount) < 0.01) {
        score += 45
        reasons.push('Amount match (within $0.01)')
      }

      // Date proximity (within 3 days is good)
      if (daysDiff === 0) {
        score += 30
        reasons.push('Same day')
      } else if (daysDiff <= 1) {
        score += 25
        reasons.push('Within 1 day')
      } else if (daysDiff <= 3) {
        score += 15
        reasons.push('Within 3 days')
      } else if (daysDiff <= 7) {
        score += 5
        reasons.push('Within 1 week')
      }

      // Different accounts (required)
      if (candidate.accountId !== transaction.accountId) {
        score += 10
        reasons.push('Different accounts')
      }

      // Description similarity (basic)
      if (candidate.description.toLowerCase().includes('transfer') || 
          transaction.description.toLowerCase().includes('transfer')) {
        score += 5
        reasons.push('Transfer in description')
      }

      // Only include matches with reasonable scores
      if (score >= 20) {
        matches.push({
          transaction: candidate,
          matchScore: score,
          reasons,
        })
      }
    })

    // Sort by score (highest first)
    return matches.sort((a, b) => b.matchScore - a.matchScore)
  }

  // Get current transaction and its matches
  const currentTransaction = useMemo(() => {
    return unlinkedTransfers.find(t => t.id === selectedTransaction)
  }, [selectedTransaction, unlinkedTransfers])

  const matches = useMemo(() => {
    if (!currentTransaction) return []
    return findMatches(currentTransaction)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTransaction, unlinkedTransfers])

  // Auto-select best match if score is very high
  useEffect(() => {
    if (matches.length > 0 && matches[0].matchScore >= 70 && !selectedMatch) {
      setSelectedMatch(matches[0].transaction.id)
    }
  }, [matches, selectedMatch])

  const handleLink = async () => {
    if (!selectedTransaction || !selectedMatch) {
      toast.error('Please select both transactions to link')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/transactions/link-transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId1: selectedTransaction,
          transactionId2: selectedMatch,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to link transfers')
      }

      const data = await response.json()
      toast.success(data.message || 'Transfers linked successfully')
      
      // Reset form
      setSelectedTransaction('')
      setSelectedMatch('')
      
      onSuccess()
    } catch (error) {
      console.error('Error linking transfers:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to link transfers')
    } finally {
      setIsLoading(false)
    }
  }

  const getMatchColor = (score: number) => {
    if (score >= 70) return 'bg-green-500/10 text-green-700 border-green-500/20'
    if (score >= 50) return 'bg-blue-500/10 text-blue-700 border-blue-500/20'
    if (score >= 30) return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20'
    return 'bg-gray-500/10 text-gray-700 border-gray-500/20'
  }

  const getMatchLabel = (score: number) => {
    if (score >= 70) return 'Excellent Match'
    if (score >= 50) return 'Good Match'
    if (score >= 30) return 'Possible Match'
    return 'Weak Match'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Link Existing Transfers
          </DialogTitle>
          <DialogDescription>
            Connect two unlinked transfer transactions to track money movement between accounts.
            Select a transaction and we&apos;ll suggest potential matches.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {unlinkedTransfers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No unlinked transfer transactions found.</p>
              <p className="text-sm mt-2">All your transfers are already linked or there are no transfers to link.</p>
            </div>
          ) : (
            <>
              {/* Step 1: Select Transaction */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Step 1: Select a transfer transaction
                </label>
                <Select value={selectedTransaction} onValueChange={setSelectedTransaction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a transaction..." />
                  </SelectTrigger>
                  <SelectContent>
                    {unlinkedTransfers.map(transaction => (
                      <SelectItem key={transaction.id} value={transaction.id}>
                        <div className="flex items-center justify-between gap-4 min-w-[400px]">
                          <span className="truncate">{transaction.description}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant={transaction.amount > 0 ? 'default' : 'secondary'}>
                              {transaction.account}
                            </Badge>
                            <span className={transaction.amount > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                              {formatCurrency(transaction.amount)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(transaction.date)}
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Current Transaction Display */}
              {currentTransaction && (
                <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{currentTransaction.description}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {currentTransaction.account} • {formatDate(currentTransaction.date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${currentTransaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(currentTransaction.amount)}
                        </p>
                        <Badge variant="outline" className="mt-1">
                          {currentTransaction.amount > 0 ? 'Income' : 'Expense'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 2: Select Match */}
              {matches.length > 0 && (
                <div className="space-y-3">
                  <label className="text-sm font-medium">
                    Step 2: Select matching transfer ({matches.length} potential {matches.length === 1 ? 'match' : 'matches'} found)
                  </label>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {matches.map(({ transaction, matchScore, reasons }) => (
                      <Card
                        key={transaction.id}
                        className={`cursor-pointer transition-all ${
                          selectedMatch === transaction.id
                            ? 'ring-2 ring-primary border-primary'
                            : 'hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedMatch(transaction.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium">{transaction.description}</p>
                                {selectedMatch === transaction.id && (
                                  <Check className="h-4 w-4 text-primary shrink-0" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {transaction.account} • {formatDate(transaction.date)}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                <Badge className={getMatchColor(matchScore)}>
                                  {getMatchLabel(matchScore)} ({matchScore}%)
                                </Badge>
                                {reasons.map((reason, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {reason}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className={`text-lg font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(transaction.amount)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {matches.length === 0 && currentTransaction && (
                <div className="text-center py-6 text-muted-foreground">
                  <X className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No potential matches found for this transaction.</p>
                  <p className="text-sm mt-2">Try selecting a different transaction or create a new transfer.</p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedTransaction('')
              setSelectedMatch('')
              onOpenChange(false)
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleLink}
            disabled={!selectedTransaction || !selectedMatch || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Linking...
              </>
            ) : (
              <>
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                Link Transfers
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
