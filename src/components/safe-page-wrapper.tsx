"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useBrowserExtensionSafety } from '@/hooks/use-browser-extension-safety'

interface SafePageWrapperProps {
  children: React.ReactNode
}

export function SafePageWrapper({ children }: SafePageWrapperProps) {
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const router = useRouter()

  // Enable browser extension safety
  useBrowserExtensionSafety()

  useEffect(() => {
    // Set up error handlers for this page
    const handleError = (event: ErrorEvent) => {
      const error = event.error
      
      // Check if it's a browser extension related error
      const isBrowserExtensionError = 
        error?.name === 'NotFoundError' &&
        error?.message?.includes('removeChild') &&
        error?.message?.includes('not a child of this node')

      if (isBrowserExtensionError) {
        console.warn('Browser extension interference detected on accounts page:', error.message)
        setHasError(true)
        setErrorMessage('Browser extension interference detected. The page will automatically refresh.')
        
        // Auto-refresh after a short delay
        setTimeout(() => {
          setHasError(false)
          router.refresh()
        }, 2000)
        
        event.preventDefault()
        return false
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason
      
      const isBrowserExtensionError = 
        error?.name === 'NotFoundError' &&
        error?.message?.includes('removeChild') &&
        error?.message?.includes('not a child of this node')

      if (isBrowserExtensionError) {
        console.warn('Browser extension interference detected in promise on accounts page:', error.message)
        setHasError(true)
        setErrorMessage('Browser extension interference detected. The page will automatically refresh.')
        
        // Auto-refresh after a short delay
        setTimeout(() => {
          setHasError(false)
          router.refresh()
        }, 2000)
        
        event.preventDefault()
      }
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [router])

  if (hasError) {
    return (
      <div className="space-y-4">
        <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            {errorMessage}
          </AlertDescription>
        </Alert>
        
        <div className="flex justify-center">
          <Button 
            onClick={() => {
              setHasError(false)
              router.refresh()
            }}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Now
          </Button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
