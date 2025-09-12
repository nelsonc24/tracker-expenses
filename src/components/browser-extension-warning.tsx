"use client"

import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { InfoIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function BrowserExtensionWarning() {
  const [showWarning, setShowWarning] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  useEffect(() => {
    // Check if user has dismissed this warning before
    const dismissed = localStorage.getItem('browser-extension-warning-dismissed')
    if (dismissed === 'true') {
      return
    }

    // Show warning after a short delay to let the page load
    const timer = setTimeout(() => {
      setShowWarning(true)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = () => {
    setShowWarning(false)
    localStorage.setItem('browser-extension-warning-dismissed', 'true')
  }

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized)
  }

  if (!showWarning) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20 shadow-lg">
        <InfoIcon className="h-4 w-4 text-blue-600" />
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {!isMinimized && (
              <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
                <strong>Tip:</strong> If you experience any page loading issues, try temporarily disabling browser extensions like Google Translate.
              </AlertDescription>
            )}
            {isMinimized && (
              <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
                Browser extension tip
              </AlertDescription>
            )}
          </div>
          <div className="flex gap-1 ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMinimize}
              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
            >
              {isMinimized ? '↑' : '↓'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </Alert>
    </div>
  )
}
