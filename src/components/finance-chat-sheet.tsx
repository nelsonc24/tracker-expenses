'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Bot, Zap } from 'lucide-react'
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
        className="w-full sm:w-[440px] p-0 flex flex-col gap-0"
      >
        <SheetHeader className="px-5 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/75 flex items-center justify-center shadow-sm shrink-0">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <SheetTitle className="text-base leading-tight">Finance Assistant</SheetTitle>
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 gap-0.5 font-medium shrink-0">
                  <Zap className="w-2.5 h-2.5" />
                  Gemini
                </Badge>
              </div>
              <SheetDescription className="text-xs leading-tight mt-0.5">
                Ask anything about your finances
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
