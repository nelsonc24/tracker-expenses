"use client"

import { useEffect, useCallback } from 'react'

export type KeyboardShortcut = {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  action: () => void
  description: string
  category: string
}

export type UseKeyboardShortcutsOptions = {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
}

export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    // Don't trigger shortcuts when user is typing in input fields
    const activeElement = document.activeElement as HTMLElement
    if (
      activeElement &&
      (activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT' ||
        activeElement.contentEditable === 'true')
    ) {
      // Allow specific shortcuts even in input fields (like Escape)
      if (event.key !== 'Escape' && event.key !== 'Tab') {
        return
      }
    }

    const matchingShortcut = shortcuts.find(shortcut => {
      const keyMatch = shortcut.key.toLowerCase() === event.key.toLowerCase()
      const ctrlMatch = !!shortcut.ctrlKey === event.ctrlKey
      const shiftMatch = !!shortcut.shiftKey === event.shiftKey
      const altMatch = !!shortcut.altKey === event.altKey
      const metaMatch = !!shortcut.metaKey === event.metaKey

      return keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch
    })

    if (matchingShortcut) {
      event.preventDefault()
      event.stopPropagation()
      matchingShortcut.action()
    }
  }, [shortcuts, enabled])

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown, enabled])

  return { shortcuts }
}

// Helper function to format shortcut display text
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts = []
  
  if (shortcut.ctrlKey) parts.push('Ctrl')
  if (shortcut.shiftKey) parts.push('Shift') 
  if (shortcut.altKey) parts.push('Alt')
  if (shortcut.metaKey) parts.push('Cmd')
  
  // Format special keys
  const keyMap: Record<string, string> = {
    ' ': 'Space',
    'Enter': 'Enter',
    'Escape': 'Esc',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'Tab': 'Tab',
    'Delete': 'Del',
    'Backspace': 'Backspace'
  }
  
  const displayKey = keyMap[shortcut.key] || shortcut.key.toUpperCase()
  parts.push(displayKey)
  
  return parts.join(' + ')
}

// Predefined shortcut categories
export const SHORTCUT_CATEGORIES = {
  NAVIGATION: 'Navigation',
  SEARCH: 'Search & Filter', 
  ACTIONS: 'Actions',
  BULK_OPERATIONS: 'Bulk Operations',
  UI: 'Interface',
  DATA: 'Data Management'
} as const
