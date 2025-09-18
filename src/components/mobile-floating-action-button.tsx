"use client"

import { useState } from 'react'
import { Plus, X, CreditCard, Receipt, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useIsMobile } from '@/hooks/use-mobile'

const quickActions = [
  {
    icon: CreditCard,
    label: 'Add Transaction',
    href: '/transactions?action=add',
    color: 'bg-blue-500 hover:bg-blue-600'
  },
  {
    icon: Receipt,
    label: 'Add Bill',
    href: '/bills?action=add',
    color: 'bg-green-500 hover:bg-green-600'
  },
  {
    icon: Target,
    label: 'Add Budget',
    href: '/budgets?action=add',
    color: 'bg-purple-500 hover:bg-purple-600'
  }
]

interface MobileFloatingActionButtonProps {
  className?: string
}

export function MobileFloatingActionButton({ className }: MobileFloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const isMobile = useIsMobile()

  if (!isMobile) {
    return null
  }

  return (
    <div className={cn(
      "fixed bottom-6 right-4 z-40 flex flex-col-reverse items-end space-y-reverse space-y-4",
      className
    )}>
      {/* Quick Action Buttons */}
      {isOpen && (
        <>
          {quickActions.map((action, index) => (
            <div
              key={action.label}
              className={cn(
                "transform transition-all duration-300 ease-out",
                isOpen 
                  ? "translate-y-0 opacity-100 scale-100" 
                  : "translate-y-4 opacity-0 scale-95",
                // Staggered animation delay using CSS variables
                index === 0 && "delay-0",
                index === 1 && "delay-75",
                index === 2 && "delay-150"
              )}
            >
              <Link href={action.href}>
                <Button
                  size="lg"
                  className={cn(
                    "h-12 w-12 rounded-full shadow-lg text-white border-0",
                    action.color,
                    "hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <action.icon className="h-6 w-6" />
                  <span className="sr-only">{action.label}</span>
                </Button>
              </Link>
            </div>
          ))}
          
          {/* Labels */}
          <div className="absolute right-16 top-0 flex flex-col-reverse space-y-reverse space-y-4">
            {quickActions.map((action, index) => (
              <div
                key={`${action.label}-label`}
                className={cn(
                  "transform transition-all duration-300 ease-out",
                  isOpen 
                    ? "translate-x-0 opacity-100" 
                    : "translate-x-4 opacity-0",
                  // Staggered animation delay with extra offset
                  index === 0 && "delay-100",
                  index === 1 && "delay-150",
                  index === 2 && "delay-200"
                )}
              >
                <div className="bg-background border rounded-lg px-3 py-2 shadow-md whitespace-nowrap">
                  <span className="text-sm font-medium">{action.label}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Main FAB Button */}
      <Button
        size="lg"
        className={cn(
          "h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90",
          "hover:shadow-xl transform hover:scale-105 transition-all duration-200",
          isOpen && "rotate-45"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Plus className="h-6 w-6" />
        )}
        <span className="sr-only">
          {isOpen ? 'Close quick actions' : 'Open quick actions'}
        </span>
      </Button>
    </div>
  )
}