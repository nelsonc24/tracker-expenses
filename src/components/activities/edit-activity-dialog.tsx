'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'

interface Activity {
  id: string
  name: string
  description?: string
  category: string
  commitmentType?: string
  frequency?: string
  location?: string
  budgetAmount?: number
  budgetPeriod: string
  notes?: string
  isActive: boolean
}

interface EditActivityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  activity: Activity | null
}

export function EditActivityDialog({ open, onOpenChange, onSuccess, activity }: EditActivityDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'hobby',
    commitmentType: '',
    frequency: '',
    location: '',
    budgetAmount: '',
    budgetPeriod: 'yearly',
    notes: '',
    isActive: true,
  })

  useEffect(() => {
    if (activity) {
      setFormData({
        name: activity.name || '',
        description: activity.description || '',
        category: activity.category || 'hobby',
        commitmentType: activity.commitmentType || '',
        frequency: activity.frequency || '',
        location: activity.location || '',
        budgetAmount: activity.budgetAmount ? activity.budgetAmount.toString() : '',
        budgetPeriod: activity.budgetPeriod || 'yearly',
        notes: activity.notes || '',
        isActive: activity.isActive,
      })
    }
  }, [activity])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activity) return
    
    setIsSubmitting(true)
    
    try {
      const payload = {
        ...formData,
        budgetAmount: formData.budgetAmount ? parseFloat(formData.budgetAmount) : null,
        commitmentType: formData.commitmentType || null,
        frequency: formData.frequency || null,
        location: formData.location || null,
        description: formData.description || null,
        notes: formData.notes || null,
      }

      const response = await fetch(`/api/activities/${activity.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        onSuccess()
      } else {
        const errorData = await response.json()
        console.error('Failed to update activity:', errorData)
      }
    } catch (error) {
      console.error('Error updating activity:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!activity) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Activity</DialogTitle>
          <DialogDescription>
            Update your activity details and settings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Activity Name */}
            <div className="md:col-span-2">
              <Label htmlFor="name">Activity Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Dance Club 2025, Gym Membership"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hobby">🎨 Hobby</SelectItem>
                  <SelectItem value="fitness">💪 Fitness</SelectItem>
                  <SelectItem value="education">📚 Education</SelectItem>
                  <SelectItem value="professional">💼 Professional</SelectItem>
                  <SelectItem value="lifestyle">🌟 Lifestyle</SelectItem>
                  <SelectItem value="project">🏗️ Project</SelectItem>
                  <SelectItem value="membership">🎫 Membership</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Commitment Type */}
            <div>
              <Label htmlFor="commitmentType">Type</Label>
              <Select 
                value={formData.commitmentType} 
                onValueChange={(value) => setFormData({ ...formData, commitmentType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="membership">Membership</SelectItem>
                  <SelectItem value="subscription">Subscription</SelectItem>
                  <SelectItem value="course">Course</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="hobby">Hobby</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Budget Amount */}
            <div>
              <Label htmlFor="budgetAmount">Budget Amount</Label>
              <Input
                id="budgetAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.budgetAmount}
                onChange={(e) => setFormData({ ...formData, budgetAmount: e.target.value })}
              />
            </div>

            {/* Budget Period */}
            <div>
              <Label htmlFor="budgetPeriod">Budget Period</Label>
              <Select 
                value={formData.budgetPeriod} 
                onValueChange={(value) => setFormData({ ...formData, budgetPeriod: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="lifetime">Lifetime</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Additional details about this activity..."
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Active</Label>
              <p className="text-sm text-muted-foreground">
                Track spending for this activity
              </p>
            </div>
            <Switch
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
