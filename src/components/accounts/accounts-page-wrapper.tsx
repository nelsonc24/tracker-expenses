'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export function AccountsClientHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'add') {
      // Small delay to ensure DOM is fully loaded
      const timer = setTimeout(() => {
        const addButton = document.querySelector('[data-add-account-trigger]') as HTMLButtonElement
        if (addButton) {
          addButton.click()
          // Remove the query parameter from the URL
          router.replace('/accounts', { scroll: false })
        }
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [searchParams, router])

  return null
}
