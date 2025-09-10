'use client'

import { useState } from 'react'
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
import { Loader2 } from 'lucide-react'

interface AddActivityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddActivityDialog({ open, onOpenChange, onSuccess }: AddActivityDialogProps) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        commitmentType: formData.commitmentType.trim() || null,
        frequency: formData.frequency.trim() || null,
        location: formData.location.trim() || null,
        budgetAmount: formData.budgetAmount ? formData.budgetAmount : null,
        budgetPeriod: formData.budgetPeriod,
        notes: formData.notes.trim() || null,
        isActive: formData.isActive,
        startDate: new Date().toISOString(),
      }

      console.log('Sending activity payload:', payload)

      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        setFormData({
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
        onSuccess()
      } else {
        const errorData = await response.json()
        console.error('Failed to create activity:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
        // You could also show a toast or alert here
      }
    } catch (error) {
      console.error('Error creating activity:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Activity</DialogTitle>
          <DialogDescription>
            Create a new activity to track spending over time. Perfect for dance clubs, gym memberships, hobbies, and ongoing commitments.
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
              <Label htmlFor="budgetAmount">Budget Amount (Optional)</Label>
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
              Create Activity
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
