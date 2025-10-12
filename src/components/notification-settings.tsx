'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Bell, Mail, Smartphone } from 'lucide-react'

interface NotificationPreferences {
  id: string
  userId: string
  emailNotificationsEnabled: boolean
  pushNotificationsEnabled: boolean
  billRemindersEnabled: boolean
  billReminderDaysBefore: number
  billReminderChannel: string
  debtRemindersEnabled: boolean
  debtReminderDaysBefore: number
  debtReminderChannel: string
  budgetAlertsEnabled: boolean
  budgetAlertThreshold: number
  budgetAlertChannel: string
  digestFrequency: string
  quietHoursStart: string | null
  quietHoursEnd: string | null
  preferredEmail: string | null
}

export function NotificationSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)

  useEffect(() => {
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/notifications/preferences')
      if (!response.ok) throw new Error('Failed to fetch preferences')
      const data = await response.json()
      setPreferences(data)
    } catch (error) {
      console.error('Error fetching preferences:', error)
      toast.error('Failed to load notification settings')
    } finally {
      setLoading(false)
    }
  }

  const savePreferences = async () => {
    if (!preferences) return

    try {
      setSaving(true)
      const response = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      })

      if (!response.ok) throw new Error('Failed to save preferences')

      const updated = await response.json()
      setPreferences(updated)
      toast.success('Notification settings saved')
    } catch (error) {
      console.error('Error saving preferences:', error)
      toast.error('Failed to save notification settings')
    } finally {
      setSaving(false)
    }
  }

  const updatePreference = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    if (!preferences) return
    setPreferences({ ...preferences, [key]: value })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!preferences) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
          <CardDescription>Failed to load settings. Please refresh the page.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Global Notification Settings
          </CardTitle>
          <CardDescription>
            Control how you receive notifications from the Expense Tracker
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications via email
              </p>
            </div>
            <Switch
              checked={preferences.emailNotificationsEnabled}
              onCheckedChange={(checked) => updatePreference('emailNotificationsEnabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between opacity-50">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Push Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive push notifications (Coming soon)
              </p>
            </div>
            <Switch
              checked={preferences.pushNotificationsEnabled}
              disabled
            />
          </div>

          {preferences.emailNotificationsEnabled && (
            <div className="space-y-2">
              <Label htmlFor="preferredEmail">Preferred Email (Optional)</Label>
              <Input
                id="preferredEmail"
                type="email"
                placeholder="Leave empty to use your account email"
                value={preferences.preferredEmail || ''}
                onChange={(e) => updatePreference('preferredEmail', e.target.value || null)}
              />
              <p className="text-xs text-muted-foreground">
                Override your account email for notifications
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bill Reminders */}
      <Card>
        <CardHeader>
          <CardTitle>Bill Reminders</CardTitle>
          <CardDescription>
            Get notified before your bills are due
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Bill Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Send reminders for upcoming bills
              </p>
            </div>
            <Switch
              checked={preferences.billRemindersEnabled}
              onCheckedChange={(checked) => updatePreference('billRemindersEnabled', checked)}
            />
          </div>

          {preferences.billRemindersEnabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="billReminderDays">Remind me (days before due)</Label>
                <Input
                  id="billReminderDays"
                  type="number"
                  min="0"
                  max="14"
                  value={preferences.billReminderDaysBefore}
                  onChange={(e) => updatePreference('billReminderDaysBefore', parseInt(e.target.value) || 3)}
                />
                <p className="text-xs text-muted-foreground">
                  How many days before the due date to send a reminder
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="billReminderChannel">Notification Method</Label>
                <Select
                  value={preferences.billReminderChannel}
                  onValueChange={(value) => updatePreference('billReminderChannel', value)}
                >
                  <SelectTrigger id="billReminderChannel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="push" disabled>Push (Coming soon)</SelectItem>
                    <SelectItem value="both" disabled>Both (Coming soon)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Debt Reminders */}
      <Card>
        <CardHeader>
          <CardTitle>Debt Payment Reminders</CardTitle>
          <CardDescription>
            Get notified before your debt payments are due
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Debt Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Send reminders for upcoming debt payments
              </p>
            </div>
            <Switch
              checked={preferences.debtRemindersEnabled}
              onCheckedChange={(checked) => updatePreference('debtRemindersEnabled', checked)}
            />
          </div>

          {preferences.debtRemindersEnabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="debtReminderDays">Remind me (days before due)</Label>
                <Input
                  id="debtReminderDays"
                  type="number"
                  min="0"
                  max="14"
                  value={preferences.debtReminderDaysBefore}
                  onChange={(e) => updatePreference('debtReminderDaysBefore', parseInt(e.target.value) || 3)}
                />
                <p className="text-xs text-muted-foreground">
                  How many days before the due date to send a reminder
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="debtReminderChannel">Notification Method</Label>
                <Select
                  value={preferences.debtReminderChannel}
                  onValueChange={(value) => updatePreference('debtReminderChannel', value)}
                >
                  <SelectTrigger id="debtReminderChannel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="push" disabled>Push (Coming soon)</SelectItem>
                    <SelectItem value="both" disabled>Both (Coming soon)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Budget Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Alerts</CardTitle>
          <CardDescription>
            Get notified when approaching budget limits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Budget Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Alert me when I&apos;m close to my budget limit
              </p>
            </div>
            <Switch
              checked={preferences.budgetAlertsEnabled}
              onCheckedChange={(checked) => updatePreference('budgetAlertsEnabled', checked)}
            />
          </div>

          {preferences.budgetAlertsEnabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="budgetThreshold">Alert Threshold (%)</Label>
                <Input
                  id="budgetThreshold"
                  type="number"
                  min="50"
                  max="100"
                  value={preferences.budgetAlertThreshold}
                  onChange={(e) => updatePreference('budgetAlertThreshold', parseInt(e.target.value) || 80)}
                />
                <p className="text-xs text-muted-foreground">
                  Alert when budget usage reaches this percentage
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budgetAlertChannel">Notification Method</Label>
                <Select
                  value={preferences.budgetAlertChannel}
                  onValueChange={(value) => updatePreference('budgetAlertChannel', value)}
                >
                  <SelectTrigger id="budgetAlertChannel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="push" disabled>Push (Coming soon)</SelectItem>
                    <SelectItem value="both" disabled>Both (Coming soon)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={savePreferences} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}
