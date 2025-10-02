'use client'

import React, { useState, useRef } from 'react'
import Image from 'next/image'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Upload, Link as LinkIcon, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  ICON_CATEGORIES, 
  formatIconName,
  getIconComponent,
  getCategoryIcon
} from '@/lib/category-icons'

interface IconPickerProps {
  selectedIcon: string
  onIconChange: (iconName: string) => void
  customIconUrl?: string
  onCustomIconUrlChange?: (url: string) => void
  showCustomUpload?: boolean
  className?: string
}

/**
 * IconPicker Component
 * A comprehensive icon picker that supports:
 * - Selecting from predefined Lucide icons organized by category
 * - Custom icon URL input
 * - File upload for custom icons (future enhancement)
 */
export function IconPicker({
  selectedIcon,
  onIconChange,
  customIconUrl = '',
  onCustomIconUrlChange,
  showCustomUpload = true,
  className
}: IconPickerProps) {
  const [activeTab, setActiveTab] = useState<'icons' | 'url' | 'upload'>('icons')
  const [customUrl, setCustomUrl] = useState(customIconUrl)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleIconSelect = (iconName: string) => {
    onIconChange(iconName)
    // Clear custom URL when selecting a preset icon
    if (onCustomIconUrlChange) {
      onCustomIconUrlChange('')
    }
  }

  const handleCustomUrlChange = (url: string) => {
    setCustomUrl(url)
    if (onCustomIconUrlChange) {
      onCustomIconUrlChange(url)
    }
  }

  const handleCustomUrlApply = () => {
    if (customUrl && onCustomIconUrlChange) {
      onCustomIconUrlChange(customUrl)
      // Optionally clear the selected icon
      // onIconChange('')
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB')
      return
    }

    setUploadedFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setUploadPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!uploadedFile) return

    // TODO: Implement actual file upload to storage service (e.g., Vercel Blob, S3, etc.)
    // For now, we'll use the data URL as a preview
    if (uploadPreview && onCustomIconUrlChange) {
      onCustomIconUrlChange(uploadPreview)
      alert('Note: File upload is not fully implemented. Using preview URL for now.')
    }
  }

  const clearUpload = () => {
    setUploadedFile(null)
    setUploadPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const renderIconGrid = (icons: readonly string[]) => (
    <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
      {icons.map((iconName) => {
        const IconComponent = getIconComponent(iconName)
        const isSelected = selectedIcon === iconName && !customIconUrl
        
        return (
          <button
            key={iconName}
            type="button"
            onClick={() => handleIconSelect(iconName)}
            className={cn(
              "relative flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all hover:bg-accent",
              isSelected 
                ? "border-primary bg-accent" 
                : "border-transparent hover:border-border"
            )}
            title={formatIconName(iconName)}
          >
            <IconComponent className="h-5 w-5" />
            {isSelected && (
              <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                <Check className="h-3 w-3" />
              </div>
            )}
          </button>
        )
      })}
    </div>
  )

  return (
    <div className={cn("space-y-4", className)}>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'icons' | 'url' | 'upload')}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="icons">Icons</TabsTrigger>
          <TabsTrigger value="url">URL</TabsTrigger>
          {showCustomUpload && <TabsTrigger value="upload">Upload</TabsTrigger>}
        </TabsList>

        <TabsContent value="icons" className="space-y-4">
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-6">
              {Object.entries(ICON_CATEGORIES).map(([category, icons]) => (
                <div key={category}>
                  <h4 className="text-sm font-medium mb-3 text-muted-foreground">
                    {category}
                  </h4>
                  {renderIconGrid(icons)}
                </div>
              ))}
            </div>
          </ScrollArea>
          
          {selectedIcon && !customIconUrl && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Selected:</span>
              <div className="flex items-center gap-2 font-medium text-foreground">
                {getCategoryIcon(selectedIcon, "h-4 w-4")}
                <span>{formatIconName(selectedIcon)}</span>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="url" className="space-y-4">
          <div className="space-y-3">
            <div>
              <Label htmlFor="custom-icon-url">Custom Icon URL</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="custom-icon-url"
                  type="url"
                  placeholder="https://example.com/icon.png"
                  value={customUrl}
                  onChange={(e) => handleCustomUrlChange(e.target.value)}
                />
                <Button 
                  type="button" 
                  variant="secondary"
                  onClick={handleCustomUrlApply}
                  disabled={!customUrl}
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Enter a direct URL to an image. The image will be displayed as your category icon.
              </p>
            </div>

            {customUrl && (
              <div className="border rounded-lg p-4 space-y-3">
                <Label>Preview</Label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                    <Image
                      src={customUrl}
                      alt="Custom icon preview"
                      width={48}
                      height={48}
                      className="object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLElement
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent) {
                          parent.innerHTML = '<span class="text-xs text-muted-foreground">Failed to load</span>'
                        }
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Custom Icon</p>
                    <p className="text-xs text-muted-foreground truncate max-w-xs">
                      {customUrl}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCustomUrl('')
                      if (onCustomIconUrlChange) {
                        onCustomIconUrlChange('')
                      }
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {showCustomUpload && (
          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label>Upload Custom Icon</Label>
                <div 
                  className={cn(
                    "mt-2 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                    uploadPreview 
                      ? "border-primary bg-primary/5" 
                      : "border-muted-foreground/25 hover:border-muted-foreground/50"
                  )}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadPreview ? (
                    <div className="space-y-3">
                      <div className="w-24 h-24 mx-auto rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                        <Image
                          src={uploadPreview}
                          alt="Upload preview"
                          width={80}
                          height={80}
                          className="object-contain"
                        />
                      </div>
                      <p className="text-sm font-medium">{uploadedFile?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(uploadedFile?.size || 0 / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm font-medium">Click to upload</p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG, SVG up to 2MB
                      </p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                  aria-label="Upload custom icon"
                />
              </div>

              {uploadedFile && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={handleUpload}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Use This Icon
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearUpload}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-3">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  <strong>Note:</strong> File upload requires additional backend setup for permanent storage. 
                  Currently using temporary preview URLs. For production use, consider integrating with 
                  Vercel Blob, AWS S3, or similar storage service.
                </p>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
