"use client"

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

interface CategoryFormData {
  name: string
  description: string
  color: string
  icon: string
  customIconUrl: string
  parentId: string
}

interface Category {
  id: string
  name: string
}

interface MobileCategoryFormProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  formData: CategoryFormData
  setFormData: (data: CategoryFormData) => void
  categories: Category[]
  availableIcons: string[]
  iconMapping: Record<string, React.ComponentType<{ className?: string }>>
  colorOptions: string[]
  onSubmit: () => void
  submitText: string
  selectedCategory?: { id: string }
}

export function MobileCategoryForm({
  isOpen,
  onOpenChange,
  title,
  description,
  formData,
  setFormData,
  categories,
  availableIcons,
  iconMapping,
  colorOptions,
  onSubmit,
  submitText,
  selectedCategory
}: MobileCategoryFormProps) {
  const isMobile = useIsMobile()

  const FormContent = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Category name"
          className="mt-2"
        />
      </div>

      <div>
        <Label htmlFor="parent">Parent Category (Optional)</Label>
        <Select 
          value={formData.parentId || "none"} 
          onValueChange={(value) => 
            setFormData({ ...formData, parentId: value === "none" ? "" : value })
          }
        >
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Select parent category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None (Top Level)</SelectItem>
            {categories
              .filter(cat => cat.id !== selectedCategory?.id)
              .map(category => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="icon">Icon</Label>
        <Select 
          value={formData.icon} 
          onValueChange={(value) => setFormData({ ...formData, icon: value })}
        >
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableIcons.map(iconName => {
              const IconComponent = iconMapping[iconName as keyof typeof iconMapping]
              return (
                <SelectItem key={iconName} value={iconName}>
                  <div className="flex items-center space-x-2">
                    <IconComponent className="h-4 w-4" />
                    <span className="capitalize">{iconName.replace('-', ' ')}</span>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="customIconUrl">Custom Icon URL (Optional)</Label>
        <Input
          id="customIconUrl"
          value={formData.customIconUrl}
          onChange={(e) => setFormData({ ...formData, customIconUrl: e.target.value })}
          placeholder="https://example.com/icon.png"
          className="mt-2"
        />
        <p className="text-sm text-muted-foreground mt-1">
          Leave empty to use the selected icon above. Custom icon will override the selected icon.
        </p>
      </div>

      <div>
        <Label htmlFor="color">Color</Label>
        <div className="grid grid-cols-6 gap-3 mt-3">
          {colorOptions.map(color => (
            <button
              key={color}
              type="button"
              className={cn(
                "w-10 h-10 rounded-full border-2 transition-all",
                formData.color === color 
                  ? "border-foreground scale-110" 
                  : "border-transparent hover:scale-105"
              )}
              style={{ backgroundColor: color }}
              onClick={() => setFormData({ ...formData, color })}
              aria-label={`Select color ${color}`}
              title={`Select color ${color}`}
            />
          ))}
        </div>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh]">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>
              {description}
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <FormContent />
          </div>

          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={onSubmit} 
              disabled={!formData.name.trim()}
              className="flex-1"
            >
              {submitText}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <FormContent />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={onSubmit} 
            disabled={!formData.name.trim()}
          >
            {submitText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}