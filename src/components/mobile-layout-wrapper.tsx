"use client"

import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

interface MobileLayoutWrapperProps {
  children: React.ReactNode
  className?: string
}

export function MobileLayoutWrapper({ children, className }: MobileLayoutWrapperProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <div className={cn(
        "min-h-screen bg-background w-full max-w-full overflow-x-hidden",
        className
      )}>
        {children}
      </div>
    )
  }

  return (
    <div className={className}>
      {children}
    </div>
  )
}