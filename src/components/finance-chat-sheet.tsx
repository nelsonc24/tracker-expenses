'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Bot } from 'lucide-react'
import { FinanceChatMessages } from '@/components/finance-chat-messages'

interface FinanceChatSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FinanceChatSheet({ open, onOpenChange }: FinanceChatSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[400px] sm:w-[440px] p-0 flex flex-col gap-0"
      >
        <SheetHeader className="px-4 pt-4 pb-3 border-b shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <SheetTitle className="text-base leading-tight">Finance Assistant</SheetTitle>
              <SheetDescription className="text-xs leading-tight">
                Powered by Gemini 2.0 Flash
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 min-h-0 flex flex-col">
          <FinanceChatMessages showSuggestions />
        </div>
      </SheetContent>
    </Sheet>
  )
}
