"use client"

import { useState, useEffect } from 'react'

export type ScreenSize = 'mobile' | 'tablet' | 'desktop'

export function useResponsive() {
  const [screenSize, setScreenSize] = useState<ScreenSize>('desktop')
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth
      
      if (width < 768) {
        setScreenSize('mobile')
        setIsMobile(true)
        setIsTablet(false)
      } else if (width < 1024) {
        setScreenSize('tablet')
        setIsMobile(false)
        setIsTablet(true)
      } else {
        setScreenSize('desktop')
        setIsMobile(false)
        setIsTablet(false)
      }
    }

    const checkTouchSupport = () => {
      setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0)
    }

    // Initial check
    checkScreenSize()
    checkTouchSupport()

    // Add resize listener
    window.addEventListener('resize', checkScreenSize)
    
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  return {
    screenSize,
    isMobile,
    isTablet,
    isTouch,
    isDesktop: screenSize === 'desktop'
  }
}

// Hook for mobile-specific behavior
export function useMobileOptimizations() {
  const { isMobile, isTouch } = useResponsive()
  
  // Mobile-specific settings
  const mobileConfig = {
    // Reduce animation duration on mobile
    animationDuration: isMobile ? 150 : 200,
    
    // Larger touch targets on mobile
    minTouchTarget: isMobile ? 44 : 32,
    
    // Simplified UI on mobile
    showSimplifiedUI: isMobile,
    
    // Touch-friendly spacing
    spacing: isMobile ? 'lg' : 'md',
    
    // Mobile pagination
    itemsPerPage: isMobile ? 5 : 10,
    
    // Touch gestures
    enableSwipeGestures: isTouch && isMobile,
  }

  return {
    ...mobileConfig,
    isMobile,
    isTouch
  }
}
