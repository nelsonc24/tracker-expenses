"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useTheme } from 'next-themes'

// Define color schemes for different chart types
export interface ChartColorScheme {
  id: string
  name: string
  spendingTrend: {
    stroke: string
    fill: string
    fillOpacity: number
  }
  monthlyComparison: {
    primary: string
    secondary?: string
  }
  description: string
}

// Color schemes optimized for light and dark modes
export const chartColorSchemes: ChartColorScheme[] = [
  {
    id: 'default',
    name: 'Default',
    spendingTrend: {
      stroke: 'hsl(var(--primary))',
      fill: 'hsl(var(--primary))',
      fillOpacity: 0.2
    },
    monthlyComparison: {
      primary: 'hsl(var(--primary))'
    },
    description: 'Uses the default theme colors'
  },
  {
    id: 'vibrant-blue',
    name: 'Vibrant Blue',
    spendingTrend: {
      stroke: '#3b82f6',
      fill: '#3b82f6',
      fillOpacity: 0.3
    },
    monthlyComparison: {
      primary: '#3b82f6'
    },
    description: 'Bright blue colors for better visibility'
  },
  {
    id: 'emerald-green',
    name: 'Emerald Green',
    spendingTrend: {
      stroke: '#10b981',
      fill: '#10b981',
      fillOpacity: 0.25
    },
    monthlyComparison: {
      primary: '#10b981'
    },
    description: 'Fresh green colors'
  },
  {
    id: 'purple-gradient',
    name: 'Purple Gradient',
    spendingTrend: {
      stroke: '#8b5cf6',
      fill: '#8b5cf6',
      fillOpacity: 0.3
    },
    monthlyComparison: {
      primary: '#8b5cf6'
    },
    description: 'Rich purple tones'
  },
  {
    id: 'orange-warmth',
    name: 'Orange Warmth',
    spendingTrend: {
      stroke: '#f59e0b',
      fill: '#f59e0b',
      fillOpacity: 0.25
    },
    monthlyComparison: {
      primary: '#f59e0b'
    },
    description: 'Warm orange colors'
  },
  {
    id: 'dark-mode-optimized',
    name: 'Dark Mode Optimized',
    spendingTrend: {
      stroke: '#60a5fa',
      fill: '#60a5fa',
      fillOpacity: 0.4
    },
    monthlyComparison: {
      primary: '#60a5fa'
    },
    description: 'Specifically designed for dark backgrounds'
  },
  {
    id: 'high-contrast',
    name: 'High Contrast',
    spendingTrend: {
      stroke: '#ef4444',
      fill: '#ef4444',
      fillOpacity: 0.35
    },
    monthlyComparison: {
      primary: '#ef4444'
    },
    description: 'High contrast red for maximum visibility'
  }
]

interface ChartColorContextType {
  currentScheme: ChartColorScheme
  setScheme: (schemeId: string) => void
  availableSchemes: ChartColorScheme[]
}

const ChartColorContext = createContext<ChartColorContextType | undefined>(undefined)

export function ChartColorProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme()
  const [currentSchemeId, setCurrentSchemeId] = useState<string>('dark-mode-optimized')

  // Load saved preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('chart-color-scheme')
    if (saved && chartColorSchemes.find(s => s.id === saved)) {
      setCurrentSchemeId(saved)
    }
  }, [])

  // Auto-switch to dark mode optimized scheme when theme changes to dark
  useEffect(() => {
    if (theme === 'dark' && currentSchemeId === 'default') {
      setCurrentSchemeId('dark-mode-optimized')
    }
  }, [theme, currentSchemeId])

  const setScheme = (schemeId: string) => {
    setCurrentSchemeId(schemeId)
    localStorage.setItem('chart-color-scheme', schemeId)
  }

  const currentScheme = chartColorSchemes.find(s => s.id === currentSchemeId) || chartColorSchemes[0]

  const value: ChartColorContextType = {
    currentScheme,
    setScheme,
    availableSchemes: chartColorSchemes
  }

  return (
    <ChartColorContext.Provider value={value}>
      {children}
    </ChartColorContext.Provider>
  )
}

export function useChartColors() {
  const context = useContext(ChartColorContext)
  if (!context) {
    throw new Error('useChartColors must be used within a ChartColorProvider')
  }
  return context
}