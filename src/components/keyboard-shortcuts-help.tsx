"use client"

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Keyboard, HelpCircle } from 'lucide-react'
import { KeyboardShortcut, formatShortcut, SHORTCUT_CATEGORIES } from '@/hooks/use-keyboard-shortcuts'

type KeyboardShortcutsHelpProps = {
  shortcuts: KeyboardShortcut[]
  trigger?: React.ReactNode
}

export function KeyboardShortcutsHelp({ shortcuts, trigger }: KeyboardShortcutsHelpProps) {
  const [open, setOpen] = useState(false)

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = []
    }
    acc[shortcut.category].push(shortcut)
    return acc
  }, {} as Record<string, KeyboardShortcut[]>)

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Keyboard className="h-4 w-4 mr-2" />
      Shortcuts
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate and perform actions quickly.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category} className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                {category}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30">
                    <span className="text-sm">{shortcut.description}</span>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {formatShortcut(shortcut)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <HelpCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="mb-1">Tips:</p>
              <ul className="space-y-1">
                <li>• Shortcuts are disabled when typing in input fields</li>
                <li>• Press <Badge variant="outline" className="text-xs">Esc</Badge> to cancel actions or close dialogs</li>
                <li>• Use <Badge variant="outline" className="text-xs">Tab</Badge> to navigate between form elements</li>
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
