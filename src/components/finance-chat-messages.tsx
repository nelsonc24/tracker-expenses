'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Bot, Send, RotateCcw, Wrench, Trash2, TrendingUp, CreditCard, Target, PieChart, BarChart3, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const SUGGESTED_PROMPTS = [
  { text: 'How much did I spend this month?', icon: Wallet },
  { text: 'How does my spending compare to last month?', icon: TrendingUp },
  { text: 'What are my top spending categories?', icon: PieChart },
  { text: 'How are my budgets tracking?', icon: BarChart3 },
  { text: "What's my total debt balance?", icon: CreditCard },
  { text: 'Show me my savings goals progress', icon: Target },
]

// One transport instance shared across renders
const chatTransport = new DefaultChatTransport({ api: '/api/chat' })

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" />
    </div>
  )
}

interface FinanceChatMessagesProps {
  showSuggestions?: boolean
  className?: string
}

export function FinanceChatMessages({ showSuggestions = true, className }: FinanceChatMessagesProps) {

  const [chatId, setChatId] = useState(() => `chat-${Date.now()}`)
  const { messages, sendMessage, regenerate, status, error, clearError } = useChat({
    transport: chatTransport,
    id: chatId,
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

  const handleClear = () => {
    setChatId(`chat-${Date.now()}`)
    setInput('')
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
      <ScrollArea className="flex-1 min-h-0 px-4 sm:px-6">
        <div className="py-6 space-y-5">
          {messages.length === 0 && showSuggestions ? (
            /* Welcome state */
            <div className="flex flex-col items-center text-center pt-6 pb-2 space-y-6">
              {/* Bot icon with ambient glow */}
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-primary/25 blur-2xl scale-150" />
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30">
                  <Bot className="w-8 h-8 text-primary-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-semibold tracking-tight">How can I help?</h2>
                <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                  Ask me anything about your spending, budgets, debts, or savings goals.
                </p>
              </div>

              {/* Suggested prompts grid */}
              <div className="w-full space-y-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Suggested questions
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SUGGESTED_PROMPTS.map(({ text, icon: Icon }) => (
                    <button
                      key={text}
                      onClick={() => handleSuggestion(text)}
                      className="flex items-center gap-3 text-left px-4 py-3 rounded-xl border border-border/60 bg-card hover:bg-muted/60 hover:border-primary/30 hover:shadow-sm transition-all duration-150 group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                        <Icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-xs font-medium leading-snug text-foreground/80 group-hover:text-foreground transition-colors">
                        {text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const isUser = message.role === 'user'
              const toolParts = message.parts.filter(
                (p) => p.type.startsWith('tool-') || p.type === 'dynamic-tool'
              )
              const textParts = message.parts.filter((p) => p.type === 'text')

              return (
                <div key={message.id} className={cn('flex items-end gap-2.5', isUser && 'flex-row-reverse')}>
                  {/* AI avatar */}
                  {!isUser && (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary/75 flex items-center justify-center shrink-0 shadow-sm mb-0.5">
                      <Bot className="w-3.5 h-3.5 text-primary-foreground" />
                    </div>
                  )}

                  <div className={cn('flex flex-col gap-1.5 max-w-[82%]', isUser && 'items-end')}>
                    {/* Tool invocation badges */}
                    {!isUser && toolParts.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {toolParts.map((p, i) => {
                          const name =
                            p.type === 'dynamic-tool'
                              ? (p as { type: string; toolName: string }).toolName
                              : p.type.replace(/^tool-/, '')
                          return (
                            <Badge
                              key={i}
                              variant="secondary"
                              className="text-[10px] gap-1 py-0 h-5 bg-muted/80 text-muted-foreground border border-border/50 font-normal"
                            >
                              <Wrench className="w-2.5 h-2.5" />
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
                            'rounded-2xl px-4 py-3 text-sm leading-relaxed',
                            isUser
                              ? 'bg-primary text-primary-foreground rounded-br-md shadow-sm'
                              : 'bg-card border border-border/60 rounded-bl-md shadow-sm'
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
                                    <code className="block bg-muted rounded-lg px-3 py-2 text-xs font-mono my-2 overflow-x-auto whitespace-pre border border-border/40">{children}</code>
                                  ) : (
                                    <code className="bg-muted rounded px-1.5 py-0.5 text-xs font-mono border border-border/40">{children}</code>
                                  )
                                },
                                pre: ({ children }) => <pre className="my-2">{children}</pre>,
                                blockquote: ({ children }) => (
                                  <blockquote className="border-l-2 border-primary/40 pl-3 italic my-2 text-muted-foreground bg-primary/5 py-1 pr-2 rounded-r-md">
                                    {children}
                                  </blockquote>
                                ),
                                hr: () => <hr className="my-3 border-border/40" />,
                                table: ({ children }) => (
                                  <div className="overflow-x-auto my-2 rounded-lg border border-border/50">
                                    <table className="w-full text-xs border-collapse">{children}</table>
                                  </div>
                                ),
                                thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
                                tbody: ({ children }) => <tbody>{children}</tbody>,
                                tr: ({ children }) => <tr className="border-b border-border/30 last:border-0">{children}</tr>,
                                th: ({ children }) => <th className="text-left font-semibold px-3 py-2 whitespace-nowrap">{children}</th>,
                                td: ({ children }) => <td className="px-3 py-2 align-top">{children}</td>,
                                a: ({ href, children }) => (
                                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:opacity-80">
                                    {children}
                                  </a>
                                ),
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

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex items-end gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary/75 flex items-center justify-center shrink-0 shadow-sm mb-0.5">
                <Bot className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <div className="bg-card border border-border/60 rounded-2xl rounded-bl-md px-4 py-3.5 shadow-sm">
                <TypingIndicator />
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex items-center gap-3 text-sm bg-destructive/5 border border-destructive/20 rounded-xl px-4 py-3">
              <span className="flex-1 text-destructive/90">
                {(error as { message?: string })?.message?.includes('402') ||
                (error as { cause?: { statusCode?: number } })?.cause?.statusCode === 402
                  ? 'Please add your Gemini API key in Settings to use the AI assistant.'
                  : 'Something went wrong. Please try again.'}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { clearError(); regenerate() }}
                className="h-7 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                Retry
              </Button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t bg-background/95 backdrop-blur-sm px-4 sm:px-6 py-4 shrink-0">
        <div className="flex items-end gap-2 bg-muted/40 rounded-2xl border border-border/60 focus-within:border-primary/50 focus-within:bg-background focus-within:shadow-sm transition-all duration-200 px-4 py-2.5">
          <Textarea
            ref={textareaRef}
            placeholder="Ask about your finances…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            className="flex-1 resize-none bg-transparent border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[28px] max-h-[120px] overflow-y-auto p-0 text-sm placeholder:text-muted-foreground/50"
          />
          <div className="flex items-center gap-1 shrink-0 pb-0.5">
            {messages.length > 0 && (
              <Button
                onClick={handleClear}
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Clear conversation"
                disabled={isLoading}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              onClick={handleSend}
              size="icon"
              disabled={!input.trim() || isLoading}
              className="h-8 w-8 rounded-xl shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground/50 mt-2 text-center">
          AI can make mistakes — verify important figures.
        </p>
      </div>
    </div>
  )
}
