'use client'

import { useState, useEffect } from 'react'
import { Plus, Activity, Calendar, DollarSign, TrendingUp, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            Activity Tracking
          </h1>
          <p className="text-muted-foreground">
            Track spending on your activities and commitments throughout the year
          </p>
        </div>
        <div className="flex gap-3">
          <ActivityTemplates onActivityCreated={handleActivityCreated} />
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/activities/analytics'}
            className="flex items-center gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            Analytics
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Activity
          </Button>
        </div>
      </div>

      {activities.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Activity className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No activities yet</h3>
            <p className="text-muted-foreground mb-6">
              Start tracking your spending by creating your first activity.
              Perfect for dance clubs, gym memberships, hobbies, and more!
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Activity
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.map((activity) => (
            <Card key={activity.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getCategoryIcon(activity.category)}</span>
                    <div>
                      <CardTitle className="text-lg">{activity.name}</CardTitle>
                      <CardDescription className="capitalize">
                        {activity.category} • {activity.commitmentType || 'Activity'}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setBudgetActivity(activity)}
                      title="Manage Budget"
                    >
                      <Target className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAnalyticsActivity(activity)}
                      title="View Analytics"
                    >
                      <TrendingUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingActivity(activity)}
                      title="Edit Activity"
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {activity.description && (
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                )}

                <div className="space-y-3">
                  {/* Budget info */}
                  {activity.budgetAmount && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          {activity.budgetPeriod === 'yearly' ? 'Annual' : 'Monthly'} Budget
                        </span>
                        <span className="font-medium">
                          {formatCurrency(parseFloat(activity.budgetAmount))}
                        </span>
                      </div>
                      {activity.budgetProgress !== undefined && (
                        <Progress value={activity.budgetProgress} className="h-2" />
                      )}
                    </div>
                  )}

                  {/* Current year spending */}
                  {activity.currentYearSpending !== undefined && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        This Year
                      </span>
                      <span className="font-medium">
                        {formatCurrency(activity.currentYearSpending)}
                      </span>
                    </div>
                  )}

                  {/* Transaction count */}
                  {activity.transactionCount !== undefined && (
                    <div className="flex items-center justify-between text-sm">
                      <span>Transactions</span>
                      <Badge variant="secondary">{activity.transactionCount}</Badge>
                    </div>
                  )}

                  {/* Activity period */}
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Started {new Date(activity.startDate).toLocaleDateString()}
                    {!activity.isActive && ' (Inactive)'}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setAnalyticsActivity(activity)}
                  >
                    View Analytics
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteActivity(activity.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Delete
                  </Button>
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
