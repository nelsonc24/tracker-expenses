"use client"

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { Search, Plus, DollarSign, Calendar, Star, Users } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'

interface Transaction {
  id: string
  description: string
  amount: number
  date: string
  category?: string
  subcategory?: string
  selectedActivityId?: string
}

interface Recommendation {
  activityId: string
  isRecommended: boolean
  reason?: string
  lastUsed?: string
}

interface ActivityOption {
  id: string
  name: string
  description?: string
  color?: string
  category?: string
  totalSpent?: number
  transactionCount?: number
  isRecommended?: boolean
  matchReason?: string
  lastUsed?: string
}

interface BasicActivity {
  id: string
  name: string
  description?: string
  color?: string
  category?: string
  totalSpent?: number
  transactionCount?: number
}

interface ActivityAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transactions: Transaction[]
  onSuccess: () => void
}

export function ActivityAssignmentDialog({
  open,
  onOpenChange,
  transactions,
  onSuccess
}: ActivityAssignmentDialogProps) {
  const [activities, setActivities] = useState<ActivityOption[]>([])
  const [filteredActivities, setFilteredActivities] = useState<ActivityOption[]>([])
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCreateNew, setShowCreateNew] = useState(false)
  const [newActivityName, setNewActivityName] = useState('')

  const getActivityRecommendations = async (_transactions: Transaction[]): Promise<Recommendation[]> => {
    // Mock recommendations based on transaction patterns
    // In real implementation, this would be an API call
    return []
  }

  const fetchActivitiesWithRecommendations = useCallback(async () => {
    setIsLoading(true)
    try {
      // Fetch all activities
      const activitiesResponse = await fetch('/api/activities')
      if (!activitiesResponse.ok) throw new Error('Failed to fetch activities')
      
      const activitiesData = await activitiesResponse.json()
      
      // Get recommendations based on transaction details
      const recommendations = await getActivityRecommendations(transactions)
      
      // Merge activities with recommendations
      const enrichedActivities = activitiesData.map((activity: BasicActivity) => {
        const recommendation = recommendations.find((r: Recommendation) => r.activityId === activity.id)
        return {
          ...activity,
          isRecommended: recommendation?.isRecommended || false,
          matchReason: recommendation?.reason,
          lastUsed: recommendation?.lastUsed,
        }
      })

      // Sort by recommendations and recent usage
      enrichedActivities.sort((a: ActivityOption, b: ActivityOption) => {
        if (a.isRecommended && !b.isRecommended) return -1
        if (!a.isRecommended && b.isRecommended) return 1
        
        // If both or neither are recommended, sort by last used
        const aLastUsed = a.lastUsed ? new Date(a.lastUsed).getTime() : 0
        const bLastUsed = b.lastUsed ? new Date(b.lastUsed).getTime() : 0
        return bLastUsed - aLastUsed
      })

      setActivities(enrichedActivities)
    } catch (error) {
      console.error('Error fetching activities:', error)
      toast.error('Failed to load activities')
    } finally {
      setIsLoading(false)
    }
  }, [transactions])

  const filterActivities = useCallback(() => {
    if (!searchQuery.trim()) {
      setFilteredActivities(activities)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = activities.filter(activity =>
      activity.name.toLowerCase().includes(query) ||
      activity.description?.toLowerCase().includes(query) ||
      activity.category?.toLowerCase().includes(query)
    )

    setFilteredActivities(filtered)
  }, [activities, searchQuery])

  useEffect(() => {
    if (open) {
      fetchActivitiesWithRecommendations()
      setSearchQuery('')
      setSelectedActivity(null)
      setShowCreateNew(false)
      setNewActivityName('')
    }
  }, [open, fetchActivitiesWithRecommendations])

  useEffect(() => {
    filterActivities()
  }, [filterActivities])

  const handleSubmit = async () => {
    if (!selectedActivity && !newActivityName.trim()) {
      toast.error('Please select an activity or create a new one')
      return
    }

    setIsSubmitting(true)

    try {
      let activityId = selectedActivity

      // Create new activity if needed
      if (!activityId && newActivityName.trim()) {
        const createResponse = await fetch('/api/activities', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: newActivityName.trim(),
            description: `Created for transactions: ${transactions.map((t: Transaction) => t.description).join(', ')}`,
            category: 'General',
            color: '#6366f1'
          }),
        })

        if (!createResponse.ok) {
          throw new Error('Failed to create activity')
        }

        const newActivity = await createResponse.json()
        activityId = newActivity.id
      }

      // Assign transactions to activity
      if (activityId) {
        const assignResponse = await fetch('/api/activities/assign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            activityId,
            transactionIds: transactions.map((t: Transaction) => t.id),
          }),
        })

        if (!assignResponse.ok) {
          throw new Error('Failed to assign transactions to activity')
        }
      }

      const transactionCount = transactions.length
      const activityName = newActivityName.trim() || activities.find(a => a.id === activityId)?.name

      toast.success(
        `Successfully assigned ${transactionCount} transaction${transactionCount > 1 ? 's' : ''} to "${activityName}"`
      )
      
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('Error assigning transactions:', error)
      toast.error('Failed to assign transactions to activity')
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const dateRange = transactions.length > 0 ? 
    `${format(new Date(transactions[0].date), 'MMM d')} - ${format(new Date(transactions[transactions.length - 1].date), 'MMM d')}` :
    ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign to Activity
          </DialogTitle>
          <DialogDescription>
            Assign {transactions.length} transaction{transactions.length > 1 ? 's' : ''} to an activity for better tracking.
          </DialogDescription>
        </DialogHeader>

        {/* Transaction Summary */}
        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Selected Transactions</span>
            <Badge variant="secondary">{transactions.length} items</Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              {formatCurrency(totalAmount)}
            </div>
            {dateRange && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {dateRange}
              </div>
            )}
          </div>
          
          {transactions.length <= 3 && (
            <div className="mt-3 space-y-1">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{transaction.description}</span>
                  <span className="text-muted-foreground ml-2">
                    {formatCurrency(Math.abs(transaction.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Create New Activity */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="create-new"
              checked={showCreateNew}
              onCheckedChange={(checked) => {
                setShowCreateNew(checked as boolean)
                if (checked) {
                  setSelectedActivity(null)
                } else {
                  setNewActivityName('')
                }
              }}
            />
            <Label htmlFor="create-new" className="text-sm">
              Create new activity
            </Label>
          </div>

          {showCreateNew && (
            <Input
              placeholder="Enter activity name..."
              value={newActivityName}
              onChange={(e) => setNewActivityName(e.target.value)}
              className="ml-6"
            />
          )}
        </div>

        {/* Activity List */}
        <ScrollArea className="h-60">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-sm text-muted-foreground">Loading activities...</div>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  className={`
                    p-3 rounded-lg border cursor-pointer transition-colors
                    ${selectedActivity === activity.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:bg-muted/50'
                    }
                  `}
                  onClick={() => {
                    setSelectedActivity(selectedActivity === activity.id ? null : activity.id)
                    setShowCreateNew(false)
                    setNewActivityName('')
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedActivity === activity.id}
                          disabled={true}
                        />
                        <span className="font-medium">{activity.name}</span>
                        {activity.isRecommended && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            Recommended
                          </Badge>
                        )}
                      </div>
                      {activity.description && (
                        <p className="text-sm text-muted-foreground mt-1 ml-6">
                          {activity.description}
                        </p>
                      )}
                      {activity.matchReason && (
                        <p className="text-xs text-blue-600 mt-1 ml-6">
                          {activity.matchReason}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {activity.color && (
                          <div 
                            className="w-3 h-3 rounded-full bg-slate-300"
                          />
                        )}
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {activity.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      {activity.totalSpent !== undefined && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatCurrency(activity.totalSpent)}
                        </div>
                      )}
                      {activity.transactionCount !== undefined && (
                        <div className="text-xs text-muted-foreground">
                          {activity.transactionCount} txns
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {filteredActivities.length === 0 && !isLoading && (
                <div className="text-center py-8">
                  <div className="text-sm text-muted-foreground">
                    {searchQuery ? 'No activities found matching your search' : 'No activities available'}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      setShowCreateNew(true)
                      setSearchQuery('')
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Create New Activity
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || (!selectedActivity && !newActivityName.trim())}
          >
            {isSubmitting ? 'Assigning...' : 'Assign Transactions'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
