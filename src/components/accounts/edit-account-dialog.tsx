"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

interface Account {
  id: string
  name: string
  institution: string
  accountType: string
  accountNumber?: string
  bsb?: string
  balance: string
  isActive: boolean
}

interface EditAccountDialogProps {
  account: Account
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

interface FormData {
  name: string
  institution: string
  accountType: string
  accountNumber: string
  bsb: string
  balance: string
  isActive: boolean
}

interface FormErrors {
  name?: string
  institution?: string
  accountType?: string
  balance?: string
}

const institutionLabels = {
  'Commonwealth Bank': 'Commonwealth Bank',
  'ANZ Bank': 'ANZ Bank',
  'Westpac': 'Westpac',
  'NAB': 'NAB',
  'UBank': 'UBank',
  'ING': 'ING',
  'Bendigo Bank': 'Bendigo Bank',
  'Other': 'Other'
}

export function EditAccountDialog({ account, isOpen, onOpenChange }: EditAccountDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    institution: '',
    accountType: '',
    accountNumber: '',
    bsb: '',
    balance: '',
    isActive: true
  })
  const [errors, setErrors] = useState<FormErrors>({})

  // Initialize form data when account changes
  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name,
        institution: account.institution,
        accountType: account.accountType,
        accountNumber: account.accountNumber || '',
        bsb: account.bsb || '',
        balance: account.balance,
        isActive: account.isActive
      })
    }
  }, [account])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Account name is required'
    }

    if (!formData.institution) {
      newErrors.institution = 'Institution is required'
    }

    if (!formData.accountType) {
      newErrors.accountType = 'Account type is required'
    }

    if (!formData.balance.trim()) {
      newErrors.balance = 'Balance is required'
    } else {
      const balance = parseFloat(formData.balance)
      if (isNaN(balance)) {
        newErrors.balance = 'Balance must be a valid number'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/accounts/${account.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          institution: formData.institution,
          accountType: formData.accountType,
          accountNumber: formData.accountNumber || undefined,
          bsb: formData.bsb || undefined,
          balance: formData.balance,
          isActive: formData.isActive,
          metadata: {
            description: `${formData.accountType} account at ${formData.institution}`,
          }
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update account')
      }

      const updatedAccount = await response.json()
      
      toast.success('Account updated successfully!')
      onOpenChange(false)
      
      // Refresh the page to show the updated account
      router.refresh()
    } catch (error) {
      console.error('Error updating account:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update account')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFieldChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing (for string fields)
    if (typeof value === 'string' && errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
          <DialogDescription>
            Update your account details and settings.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Account Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="e.g., Everyday Account"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="institution">Institution *</Label>
            <Select 
              value={formData.institution} 
              onValueChange={(value) => handleFieldChange('institution', value)}
            >
              <SelectTrigger className={errors.institution ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select your bank" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(institutionLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.institution && (
              <p className="text-sm text-red-500">{errors.institution}</p>
            )}
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="account-type">Account Type *</Label>
            <Select 
              value={formData.accountType} 
              onValueChange={(value) => handleFieldChange('accountType', value)}
            >
              <SelectTrigger className={errors.accountType ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">Checking</SelectItem>
                <SelectItem value="savings">Savings</SelectItem>
                <SelectItem value="credit">Credit Card</SelectItem>
                <SelectItem value="investment">Investment</SelectItem>
              </SelectContent>
            </Select>
            {errors.accountType && (
              <p className="text-sm text-red-500">{errors.accountType}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="account-number">Account Number (Optional)</Label>
            <Input
              id="account-number"
              value={formData.accountNumber}
              onChange={(e) => handleFieldChange('accountNumber', e.target.value)}
              placeholder="e.g., 123456789"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bsb">BSB (Optional)</Label>
            <Input
              id="bsb"
              value={formData.bsb}
              onChange={(e) => handleFieldChange('bsb', e.target.value)}
              placeholder="e.g., 062-001"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="balance">Current Balance (AUD) *</Label>
            <Input
              id="balance"
              type="number"
              step="0.01"
              value={formData.balance}
              onChange={(e) => handleFieldChange('balance', e.target.value)}
              placeholder="0.00"
              className={errors.balance ? 'border-red-500' : ''}
            />
            {errors.balance && (
              <p className="text-sm text-red-500">{errors.balance}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is-active"
              checked={formData.isActive}
              onCheckedChange={(checked) => handleFieldChange('isActive', checked)}
            />
            <Label htmlFor="is-active">Account is active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'Updating...' : 'Update Account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
