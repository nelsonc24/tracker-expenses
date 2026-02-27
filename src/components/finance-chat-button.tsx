'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MessageCircle, X } from 'lucide-react'
import { FinanceChatSheet } from '@/components/finance-chat-sheet'

export function FinanceChatButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Floating trigger button
          - On mobile: sits above the mobile floating action button (bottom-20)
          - On desktop: sits in the standard bottom-right position (bottom-6)
      */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 h-12 w-12 rounded-full shadow-lg shadow-primary/20 transition-transform hover:scale-105 active:scale-95 p-0"
        size="icon"
        aria-label="Open Finance Assistant"
      >
        {isOpen ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </Button>

      <FinanceChatSheet open={isOpen} onOpenChange={setIsOpen} />
    </>
  )
}
