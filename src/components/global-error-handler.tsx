"use client"

import { useEffect } from 'react'

export function GlobalErrorHandler() {
  useEffect(() => {
    // Handle unhandled errors that might be caused by browser extensions
    const handleError = (event: ErrorEvent) => {
      const error = event.error
      
      // Check if it's a browser extension related error
      const isBrowserExtensionError = 
        error?.name === 'NotFoundError' &&
        error?.message?.includes('removeChild') &&
        error?.message?.includes('not a child of this node')

      if (isBrowserExtensionError) {
        console.warn('Browser extension interference detected:', error.message)
        console.warn('This error has been suppressed as it\'s likely caused by a browser extension (e.g., Google Translate).')
        event.preventDefault() // Prevent the error from propagating
        return false
      }
    }

    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason
      
      // Check if it's a browser extension related error
      const isBrowserExtensionError = 
        error?.name === 'NotFoundError' &&
        error?.message?.includes('removeChild') &&
        error?.message?.includes('not a child of this node')

      if (isBrowserExtensionError) {
        console.warn('Browser extension interference detected in promise:', error.message)
        console.warn('This error has been suppressed as it\'s likely caused by a browser extension.')
        event.preventDefault() // Prevent the unhandled rejection
      }
    }

    // Add event listeners
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    // Cleanup
    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  return null // This component doesn't render anything
}
