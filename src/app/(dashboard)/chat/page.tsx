import type { Metadata } from 'next'
import { FinanceChatPageClient } from '@/components/finance-chat-page-client'

export const metadata: Metadata = {
  title: 'Finance Assistant | Expenses Tracker',
  description: 'Chat with your AI-powered personal finance assistant',
}

export default function ChatPage() {
  return <FinanceChatPageClient />
}
