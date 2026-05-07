"use client"

import { useState } from 'react'
import { Plus, CreditCard, Receipt, Target, Wallet, Tag, CircleDollarSign, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useRouter, usePathname } from 'next/navigation'
import { useIsMobile } from '@/hooks/use-mobile'

const quickActions = [
  {
    icon: CreditCard,
    label: 'Add Transaction',
    href: '/transactions?action=add',
    color: 'bg-blue-500 hover:bg-blue-600',
    modules: ['/transactions', '/dashboard']
  },
  {
    icon: CircleDollarSign,
    label: 'Add Debt',
    href: '/debts?action=add',
    color: 'bg-red-500 hover:bg-red-600',
    modules: ['/debts']
  },
  {
    icon: Receipt,
    label: 'Add Bill',
    href: '/bills?action=add',
    color: 'bg-green-500 hover:bg-green-600',
    modules: ['/bills', '/recurring']
  },
  {
    icon: Target,
    label: 'Add Budget',
    href: '/budgets?action=add',
    color: 'bg-purple-500 hover:bg-purple-600',
    modules: ['/budgets']
  },
  {
    icon: Tag,
    label: 'Add Category',
    href: '/categories?action=add',
    color: 'bg-orange-500 hover:bg-orange-600',
    modules: ['/categories']
  },
  {
    icon: TrendingUp,
    label: 'Add Activity',
    href: '/activities?action=add',
    color: 'bg-indigo-500 hover:bg-indigo-600',
    modules: ['/activities']
  },
  {
    icon: Wallet,
    label: 'Add Account',
    href: '/accounts?action=add',
    color: 'bg-cyan-500 hover:bg-cyan-600',
    modules: ['/accounts']
  },
]

interface MobileFloatingActionButtonProps {
  className?: string
}

export function MobileFloatingActionButton({ className }: MobileFloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const isMobile = useIsMobile()
  const router = useRouter()
  const pathname = usePathname()

  if (!isMobile) {
    return null
  }

  // Get context-aware actions based on current page
  const getContextActions = () => {
    const currentModuleAction = quickActions.find(action => 
      action.modules.some(module => pathname?.startsWith(module))
    )
    
    // If we're on a specific module page, prioritize that module's action
    if (currentModuleAction) {
      const otherActions = quickActions.filter(action => action !== currentModuleAction)
      return [currentModuleAction, ...otherActions.slice(0, 2)]
    }
    
    // Default: show the first 3 actions
    return quickActions.slice(0, 3)
  }

  const contextActions = getContextActions()

  const handleActionClick = (href: string) => {
    setIsOpen(false)
    router.push(href)
  }

  return (
    <>
      {/* Backdrop — closes menu when tapping outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px]"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className={cn(
        "fixed bottom-6 right-4 z-40 flex flex-col items-end gap-3",
        className
      )}>
        {/* Action items — each is a label+button row */}
        {isOpen && contextActions.map((action, index) => (
          <div
            key={action.label}
            className="flex items-center gap-3"
            style={{
              animation: 'fabItemIn 0.2s ease-out forwards',
              animationDelay: `${(contextActions.length - 1 - index) * 50}ms`,
              opacity: 0,
            }}
          >
            <div className="bg-background border rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
              <span className="text-sm font-medium">{action.label}</span>
            </div>
            <Button
              size="icon"
              className={cn(
                "h-12 w-12 rounded-full shadow-lg text-white border-0 shrink-0",
                action.color,
                "hover:shadow-xl hover:scale-105 transition-transform duration-150"
              )}
              onClick={() => handleActionClick(action.href)}
            >
              <action.icon className="h-5 w-5" />
              <span className="sr-only">{action.label}</span>
            </Button>
          </div>
        ))}

        {/* Main FAB button */}
        <Button
          size="icon"
          className={cn(
            "h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 shrink-0",
            "transition-transform duration-300",
            isOpen && "rotate-45"
          )}
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? 'Close quick actions' : 'Open quick actions'}
        >
          <Plus className="h-6 w-6" />
          <span className="sr-only">{isOpen ? 'Close quick actions' : 'Open quick actions'}</span>
        </Button>
      </div>

      {/* Keyframe for action items entrance */}
      <style>{`
        @keyframes fabItemIn {
          from { opacity: 0; transform: translateY(8px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </>
  )
}