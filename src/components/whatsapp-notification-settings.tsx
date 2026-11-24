'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { MessageCircle } from 'lucide-react'
import { isE164, normalizePhoneInput } from '@/lib/notifications/phone'

interface WhatsAppNotificationSettingsProps {
  enabled: boolean
  phoneNumber: string | null
  /** The number currently stored on the server; the test always goes to this one. */
  savedPhoneNumber: string | null
  onEnabledChange: (enabled: boolean) => void
  onPhoneNumberChange: (phoneNumber: string | null) => void
}

export function WhatsAppNotificationSettings({
  enabled,
  phoneNumber,
  savedPhoneNumber,
  onEnabledChange,
  onPhoneNumberChange,
}: WhatsAppNotificationSettingsProps) {
  const [sendingTest, setSendingTest] = useState(false)

  const normalized = phoneNumber ? normalizePhoneInput(phoneNumber) : ''
  const showError = normalized.length > 0 && !isE164(normalized)
  const hasUnsavedNumber = normalized !== (savedPhoneNumber ?? '')
  const canSendTest = isE164(savedPhoneNumber) && !hasUnsavedNumber && !sendingTest

  const sendTestMessage = async () => {
    try {
      setSendingTest(true)
      const response = await fetch('/api/notifications/whatsapp/test', { method: 'POST' })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) throw new Error(data.error || 'Failed to send test message')

      if (data.dryRun) {
        toast.info('Dry run: WhatsApp is not configured on the server yet, so nothing was sent')
      } else {
        toast.success('Test message sent to WhatsApp')
      }
    } catch (error) {
      console.error('Error sending WhatsApp test message:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send test message')
    } finally {
      setSendingTest(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          WhatsApp Notifications
        </CardTitle>
        <CardDescription>
          Receive bill, debt, budget and import alerts as WhatsApp messages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable WhatsApp Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Send reminders via WhatsApp
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={onEnabledChange} />
        </div>

        {enabled && (
          <div className="space-y-2">
            <Label htmlFor="whatsappPhoneNumber">Your WhatsApp number</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="whatsappPhoneNumber"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="e.g. +61412345678"
                value={phoneNumber || ''}
                aria-invalid={showError}
                onChange={(e) => onPhoneNumberChange(e.target.value || null)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={sendTestMessage}
                disabled={!canSendTest}
                className="shrink-0"
              >
                {sendingTest ? 'Sending...' : 'Send test message'}
              </Button>
            </div>
            {showError ? (
              <p className="text-xs text-destructive">
                Use international format with country code, e.g. +61412345678
              </p>
            ) : hasUnsavedNumber ? (
              <p className="text-xs text-muted-foreground">
                Save your settings before sending a test message.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                International (E.164) format, starting with + and your country code.
              </p>
            )}
          </div>
        )}

        <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm dark:border-blue-800 dark:bg-blue-950">
          <p className="font-medium text-blue-800 dark:text-blue-200">Setup required</p>
          <p className="mt-1 text-blue-700 dark:text-blue-300">
            WhatsApp notifications use the official Meta WhatsApp Cloud API and need the{' '}
            <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">WHATSAPP_*</code>
            {' '}environment variables set on the server. Until then, messages are only logged (dry run).
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
