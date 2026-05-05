'use client'

import { Bot, Zap } from 'lucide-react'
import { FinanceChatMessages } from '@/components/finance-chat-messages'
import { Badge } from '@/components/ui/badge'

export function FinanceChatPageClient() {
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl mx-auto">
      {/* Page header */}
      <div className="mb-5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-primary/20 blur-lg scale-150" />
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/75 flex items-center justify-center shadow-md shadow-primary/20">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">Finance Assistant</h1>
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 gap-0.5 font-medium">
                <Zap className="w-2.5 h-2.5" />
                Gemini
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Ask me anything about your finances
            </p>
          </div>
        </div>
      </div>

      {/* Chat area — takes remaining height */}
      <div className="flex-1 min-h-0 rounded-2xl border bg-card shadow-sm overflow-hidden flex flex-col">
        <FinanceChatMessages showSuggestions />
      </div>
    </div>
  )
}
