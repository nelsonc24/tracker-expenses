'use client'

import { Bot, Sparkles } from 'lucide-react'
import { FinanceChatMessages } from '@/components/finance-chat-messages'

export function FinanceChatPageClient() {
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl mx-auto">
      {/* Page header */}
      <div className="mb-4 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Finance Assistant</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Powered by Google Gemini 2.0 Flash
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground ml-[52px]">
          Ask me anything about your spending, budgets, debts, goals, or accounts.
        </p>
      </div>

      {/* Chat area — takes remaining height */}
      <div className="flex-1 min-h-0 rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col">
        <FinanceChatMessages showSuggestions />
      </div>
    </div>
  )
}
