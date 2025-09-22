"use client"

import { useState } from 'react'
import { Palette, Settings, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useChartColors, ChartColorScheme } from '@/contexts/chart-color-context'

interface ColorPreviewProps {
  scheme: ChartColorScheme
  size?: 'sm' | 'md' | 'lg'
}

function ColorPreview({ scheme, size = 'md' }: ColorPreviewProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }
  
  return (
    <div className="flex gap-1">
      <div 
        className={`${sizeClasses[size]} rounded-full border-2 border-background`}
        style={{ backgroundColor: scheme.spendingTrend.stroke }}
      />
      <div 
        className={`${sizeClasses[size]} rounded-full border-2 border-background`}
        style={{ backgroundColor: scheme.monthlyComparison.primary }}
      />
    </div>
  )
}

export function ChartColorSettings() {
  const { currentScheme, setScheme, availableSchemes } = useChartColors()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Quick Dropdown Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Palette className="w-4 h-4" />
            Chart Colors
            <ColorPreview scheme={currentScheme} size="sm" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Chart Color Schemes</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {availableSchemes.slice(0, 4).map((scheme) => (
            <DropdownMenuItem
              key={scheme.id}
              onClick={() => setScheme(scheme.id)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ColorPreview scheme={scheme} size="sm" />
                <span>{scheme.name}</span>
              </div>
              {currentScheme.id === scheme.id && (
                <Check className="w-4 h-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsOpen(true)} className="cursor-pointer">
            <Settings className="w-4 h-4 mr-2" />
            More Options...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Detailed Settings Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chart Color Settings</DialogTitle>
            <DialogDescription>
              Choose a color scheme that works best for your viewing preferences and theme.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 max-h-96 overflow-y-auto">
            {availableSchemes.map((scheme) => (
              <Card 
                key={scheme.id}
                className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary/20 ${
                  currentScheme.id === scheme.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setScheme(scheme.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ColorPreview scheme={scheme} size="lg" />
                      <div>
                        <CardTitle className="text-base">{scheme.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {scheme.description}
                        </CardDescription>
                      </div>
                    </div>
                    {currentScheme.id === scheme.id && (
                      <Badge variant="default" className="gap-1">
                        <Check className="w-3 h-3" />
                        Active
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="font-medium text-muted-foreground mb-1">Spending Trend</div>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded border"
                          style={{ backgroundColor: scheme.spendingTrend.stroke }}
                        />
                        <span className="font-mono text-xs">{scheme.spendingTrend.stroke}</span>
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-muted-foreground mb-1">Monthly Comparison</div>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded border"
                          style={{ backgroundColor: scheme.monthlyComparison.primary }}
                        />
                        <span className="font-mono text-xs">{scheme.monthlyComparison.primary}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Simple inline settings for smaller spaces
export function InlineChartColorSettings() {
  const { currentScheme, setScheme, availableSchemes } = useChartColors()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
          <ColorPreview scheme={currentScheme} size="sm" />
          <span className="text-xs">{currentScheme.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="text-xs">Change Colors</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableSchemes.map((scheme) => (
          <DropdownMenuItem
            key={scheme.id}
            onClick={() => setScheme(scheme.id)}
            className="flex items-center justify-between cursor-pointer text-sm"
          >
            <div className="flex items-center gap-2">
              <ColorPreview scheme={scheme} size="sm" />
              <span>{scheme.name}</span>
            </div>
            {currentScheme.id === scheme.id && (
              <Check className="w-3 h-3 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}