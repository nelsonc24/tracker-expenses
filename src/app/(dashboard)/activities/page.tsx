'use client'

import { useState, useEffect } from 'react'
import { Plus, Activity, Calendar, DollarSign, TrendingUp, Target, MoreVertical, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AddActivityDialog } from '@/components/activities/add-activity-dialog'
import { EditActivityDialog } from '@/components/activities/edit-activity-dialog'
import { ActivityAnalyticsDialog } from '@/components/activities/activity-analytics-dialog'
import { ActivityBudgetDialog } from '@/components/activities/activity-budget-dialog'
import { ActivityTemplates } from '@/components/activities/activity-templates'
import type { SelectActivity } from '@/db/schema'

interface ActivityWithAnalytics extends SelectActivity {
  currentYearSpending?: number
  transactionCount?: number
  budgetProgress?: number
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<ActivityWithAnalytics[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingActivity, setEditingActivity] = useState<SelectActivity | null>(null)
  const [analyticsActivity, setAnalyticsActivity] = useState<SelectActivity | null>(null)
  const [budgetActivity, setBudgetActivity] = useState<SelectActivity | null>(null)

  useEffect(() => {
    fetchActivities()
  }, [])

  const fetchActivities = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/activities')
      if (response.ok) {
        const data = await response.json()
        setActivities(data)
      }
    } catch (error) {
      console.error('Error fetching activities:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleActivityCreated = () => {
    setShowAddDialog(false)
    fetchActivities()
  }

  const handleActivityUpdated = () => {
    setEditingActivity(null)
    fetchActivities()
  }

  const handleDeleteActivity = async (id: string) => {
    if (!confirm('Are you sure you want to delete this activity? This will remove all transaction assignments.')) {
      return
    }

    try {
      const response = await fetch(`/api/activities/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchActivities()
      } else {
        console.error('Failed to delete activity')
      }
    } catch (error) {
      console.error('Error deleting activity:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount)
  }

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      hobby: '🎨',
      fitness: '💪',
      education: '📚',
      professional: '💼',
      lifestyle: '🌟',
      project: '🏗️',
      membership: '🎫',
    }
    return icons[category] || '📁'
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Activity Tracking</h1>
            <p className="text-muted-foreground">Track spending on your activities and commitments</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 sm:h-8 sm:w-8" />
            Activity Tracking
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Track spending on your activities and commitments throughout the year
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <ActivityTemplates onActivityCreated={handleActivityCreated} />
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/activities/analytics'}
            className="flex items-center gap-2 justify-center"
            size="sm"
          >
            <TrendingUp className="h-4 w-4" />
            <span className="sm:inline">Analytics</span>
          </Button>
          <Button onClick={() => setShowAddDialog(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Add Activity</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {activities.length === 0 ? (
        <Card className="text-center py-8 sm:py-12">
          <CardContent className="px-4">
            <Activity className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold mb-2">No activities yet</h3>
            <p className="text-muted-foreground mb-6 text-sm sm:text-base max-w-md mx-auto">
              Start tracking your spending by creating your first activity.
              Perfect for dance clubs, gym memberships, hobbies, and more!
            </p>
            <Button onClick={() => setShowAddDialog(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Activity
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
          {activities.map((activity) => (
            <Card key={activity.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-xl sm:text-2xl">{getCategoryIcon(activity.category)}</span>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base sm:text-lg leading-tight">{activity.name}</CardTitle>
                      <CardDescription className="capitalize text-xs sm:text-sm">
                        {activity.category} • {activity.commitmentType || 'Activity'}
                      </CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 shrink-0"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setAnalyticsActivity(activity)}>
                        <TrendingUp className="h-4 w-4 mr-2" />
                        View Analytics
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setBudgetActivity(activity)}>
                        <Target className="h-4 w-4 mr-2" />
                        Manage Budget
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditingActivity(activity)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Activity
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDeleteActivity(activity.id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Activity
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {activity.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{activity.description}</p>
                )}

                <div className="space-y-2 sm:space-y-3">
                  {/* Budget info */}
                  {activity.budgetAmount && (
                    <div className="space-y-1 sm:space-y-2">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">{activity.budgetPeriod === 'yearly' ? 'Annual' : 'Monthly'} Budget</span>
                          <span className="sm:hidden">Budget</span>
                        </span>
                        <span className="font-medium">
                          {formatCurrency(parseFloat(activity.budgetAmount))}
                        </span>
                      </div>
                      {activity.budgetProgress !== undefined && (
                        <Progress value={activity.budgetProgress} className="h-1 sm:h-2" />
                      )}
                    </div>
                  )}

                  {/* Current year spending */}
                  {activity.currentYearSpending !== undefined && (
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                        This Year
                      </span>
                      <span className="font-medium">
                        {formatCurrency(activity.currentYearSpending)}
                      </span>
                    </div>
                  )}

                  {/* Transaction count */}
                  {activity.transactionCount !== undefined && (
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span>Transactions</span>
                      <Badge variant="secondary" className="text-xs">{activity.transactionCount}</Badge>
                    </div>
                  )}

                  {/* Activity period */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="truncate">
                      Started {new Date(activity.startDate).toLocaleDateString()}
                      {!activity.isActive && ' (Inactive)'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <AddActivityDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={handleActivityCreated}
      />

      {editingActivity && (
        <EditActivityDialog
          activity={{
            ...editingActivity,
            description: editingActivity.description || undefined,
            budgetAmount: editingActivity.budgetAmount ? parseFloat(editingActivity.budgetAmount) : undefined,
            commitmentType: editingActivity.commitmentType || undefined,
            frequency: editingActivity.frequency || undefined,
            location: editingActivity.location || undefined,
            notes: editingActivity.notes || undefined,
          }}
          open={!!editingActivity}
          onOpenChange={() => setEditingActivity(null)}
          onSuccess={handleActivityUpdated}
        />
      )}

      {analyticsActivity && (
        <ActivityAnalyticsDialog
          activity={analyticsActivity}
          open={!!analyticsActivity}
          onOpenChange={() => setAnalyticsActivity(null)}
        />
      )}

      {budgetActivity && (
        <ActivityBudgetDialog
          activity={budgetActivity}
          open={!!budgetActivity}
          onOpenChange={() => setBudgetActivity(null)}
          onSuccess={() => {
            setBudgetActivity(null)
            fetchActivities() // Refresh to show updated budget info
          }}
        />
      )}
    </div>
  )
}
