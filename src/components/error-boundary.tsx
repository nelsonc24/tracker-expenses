"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ClientErrorBoundary extends React.Component<
  React.PropsWithChildren,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Check if it's a browser extension related error
    const isBrowserExtensionError = 
      error.name === 'NotFoundError' &&
      error.message?.includes('removeChild') &&
      error.message?.includes('not a child of this node')

    // Log the error for debugging, but don't crash the app for browser extension errors
    if (isBrowserExtensionError) {
      console.warn('Browser extension interference detected:', error.message)
      console.warn('This is likely caused by a browser extension (e.g., Google Translate) and can be safely ignored.')
    } else {
      console.error('Unexpected error caught by error boundary:', error, errorInfo)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      const isBrowserExtensionError = 
        this.state.error?.name === 'NotFoundError' &&
        this.state.error?.message?.includes('removeChild')

      // For browser extension errors, automatically recover after a short delay
      if (isBrowserExtensionError) {
        setTimeout(() => {
          this.handleReset()
        }, 100)
        
        // Return children during the recovery period
        return this.props.children
      }

      // For other errors, show the error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 text-center space-y-4">
            <div className="flex justify-center">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold">Something went wrong</h2>
            <p className="text-muted-foreground text-sm">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button onClick={this.handleReset} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                size="sm"
              >
                Refresh Page
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left mt-4">
                <summary className="text-sm font-medium cursor-pointer">
                  Error Details (Development)
                </summary>
                <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook version for functional components
export function useErrorHandler() {
  const handleError = React.useCallback((error: Error) => {
    const isBrowserExtensionError = 
      error.name === 'NotFoundError' &&
      error.message?.includes('removeChild') &&
      error.message?.includes('not a child of this node')

    if (isBrowserExtensionError) {
      console.warn('Browser extension interference detected:', error.message)
      console.warn('This error has been suppressed as it\'s likely caused by a browser extension.')
      return // Don't propagate browser extension errors
    }

    // Re-throw other errors to be handled by error boundaries
    throw error
  }, [])

  return handleError
}
