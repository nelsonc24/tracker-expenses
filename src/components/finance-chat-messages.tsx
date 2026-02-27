'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Bot, Send, User, Loader2, RefreshCw, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const SUGGESTED_PROMPTS = [
  'How much did I spend this month?',
  "What are my top spending categories?",
  'How are my budgets tracking?',
  "What's my total debt balance?",
  'Show me my savings goals progress',
  'What were my biggest expenses last month?',
]

// One transport instance shared across renders
const chatTransport = new DefaultChatTransport({ api: '/api/chat' })

interface FinanceChatMessagesProps {
  showSuggestions?: boolean
  className?: string
}

export function FinanceChatMessages({ showSuggestions = true, className }: FinanceChatMessagesProps) {
  const { messages, sendMessage, regenerate, status, error, clearError } = useChat({
    transport: chatTransport,
  })

  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isLoading = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    sendMessage({ text })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSuggestion = (prompt: string) => {
    setInput(prompt)
    textareaRef.current?.focus()
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Message list */}
      <ScrollArea className="flex-1 min-h-0 px-4">
        <div className="py-4 space-y-4">
          {messages.length === 0 && showSuggestions ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Avatar className="w-8 h-8 shrink-0 mt-0.5">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm max-w-[85%]">
                  <p className="font-medium mb-1">Hey there! 👋</p>
                  <p className="text-muted-foreground">
                    I&apos;m your personal finance assistant. I can help you understand your spending,
                    track budgets, check debts, and more. What would you like to know?
                  </p>
                </div>
              </div>

              <div className="pl-11">
                <p className="text-xs text-muted-foreground mb-2">Try asking:</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleSuggestion(prompt)}
                      className="text-xs px-3 py-1.5 rounded-full border bg-background hover:bg-muted transition-colors text-left"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const isUser = message.role === 'user'
              // In v6, all messages have `parts`. Tool parts use type starting with "tool-" or "dynamic-tool"
              const toolParts = message.parts.filter(
                (p) => p.type.startsWith('tool-') || p.type === 'dynamic-tool'
              )
              const textParts = message.parts.filter((p) => p.type === 'text')

              return (
                <div key={message.id} className={cn('flex items-start gap-3', isUser && 'flex-row-reverse')}>
                  <Avatar className="w-8 h-8 shrink-0 mt-0.5">
                    <AvatarFallback
                      className={cn(
                        'text-xs',
                        isUser ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20'
                      )}
                    >
                      {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </AvatarFallback>
                  </Avatar>

                  <div className={cn('flex flex-col gap-1 max-w-[85%]', isUser && 'items-end')}>
                    {/* Tool invocation badges (assistant only) */}
                    {!isUser && toolParts.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1">
                        {toolParts.map((p, i) => {
                          const name =
                            p.type === 'dynamic-tool'
                              ? (p as { type: string; toolName: string }).toolName
                              : p.type.replace(/^tool-/, '')
                          return (
                            <Badge key={i} variant="secondary" className="text-xs gap-1 py-0">
                              <Wrench className="w-3 h-3" />
                              {name.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                            </Badge>
                          )
                        })}
                      </div>
                    )}

                    {/* Text parts */}
                    {textParts.map((p, i) =>
                      p.type === 'text' ? (
                        <div
                          key={i}
                          className={cn(
                            'rounded-2xl px-4 py-3 text-sm',
                            isUser
                              ? 'bg-primary text-primary-foreground rounded-tr-sm'
                              : 'bg-muted rounded-tl-sm'
                          )}
                        >
                          {isUser ? (
                            <span className="whitespace-pre-wrap">{p.text}</span>
                          ) : (
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                em: ({ children }) => <em className="italic">{children}</em>,
                                ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
                                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                                h1: ({ children }) => <h1 className="text-base font-bold mb-1 mt-2">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-sm font-bold mb-1 mt-2">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-1.5">{children}</h3>,
                                code: ({ children, className }) => {
                                  const isBlock = className?.includes('language-')
                                  return isBlock ? (
                                    <code className="block bg-black/10 dark:bg-white/10 rounded-md px-3 py-2 text-xs font-mono my-2 overflow-x-auto whitespace-pre">{children}</code>
                                  ) : (
                                    <code className="bg-black/10 dark:bg-white/10 rounded px-1 py-0.5 text-xs font-mono">{children}</code>
                                  )
                                },
                                pre: ({ children }) => <pre className="my-2">{children}</pre>,
                                blockquote: ({ children }) => <blockquote className="border-l-2 border-muted-foreground/30 pl-3 italic my-2 text-muted-foreground">{children}</blockquote>,
                                hr: () => <hr className="my-3 border-muted-foreground/20" />,
                                table: ({ children }) => (
                                  <div className="overflow-x-auto my-2">
                                    <table className="w-full text-xs border-collapse">{children}</table>
                                  </div>
                                ),
                                thead: ({ children }) => <thead className="bg-black/10 dark:bg-white/10">{children}</thead>,
                                tbody: ({ children }) => <tbody>{children}</tbody>,
                                tr: ({ children }) => <tr className="border-b border-muted-foreground/20 last:border-0">{children}</tr>,
                                th: ({ children }) => <th className="text-left font-semibold px-2 py-1.5 whitespace-nowrap">{children}</th>,
                                td: ({ children }) => <td className="px-2 py-1.5 align-top">{children}</td>,
                                a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-80">{children}</a>,
                              }}
                            >
                              {p.text}
                            </ReactMarkdown>
                          )}
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              )
            })
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-start gap-3">
              <Avatar className="w-8 h-8 shrink-0 mt-0.5">
                <AvatarFallback className="bg-muted-foreground/20">
                  <Bot className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">
              <span className="flex-1">Something went wrong. Please try again.</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { clearError(); regenerate() }}
                className="h-7 gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </Button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t bg-background px-4 py-3 shrink-0">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            placeholder="Ask about your finances..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            className="resize-none min-h-[40px] max-h-[120px] overflow-y-auto"
          />
          <Button
            onClick={handleSend}
            size="icon"
            disabled={!input.trim() || isLoading}
            className="shrink-0 h-10 w-10"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 text-center">
          AI can make mistakes. Verify important figures.
        </p>
      </div>
    </div>
  )
}
