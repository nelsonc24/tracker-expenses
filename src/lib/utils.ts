import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Consistent date formatting to prevent hydration mismatches
export function formatDate(date: string | Date): string {
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) {
      return 'Invalid Date'
    }
    // Use explicit formatting to ensure consistency between server and client
    const day = d.getDate().toString().padStart(2, '0')
    const month = (d.getMonth() + 1).toString().padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  } catch (error) {
    return 'Invalid Date'
  }
}

// Alternative format for different use cases
export function formatDateLong(date: string | Date): string {
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) {
      return 'Invalid Date'
    }
    // Use specific locale to ensure consistency
    return d.toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC' // Force UTC to prevent timezone differences
    })
  } catch (error) {
    return 'Invalid Date'
  }
}

// Currency formatting function
export function formatCurrency(amount: number | string): string {
  try {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(num)) {
      return '$0.00'
    }
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  } catch (error) {
    return '$0.00'
  }
}
