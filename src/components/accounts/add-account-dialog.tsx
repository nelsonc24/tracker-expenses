"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

interface FormData {
  institution: string
  accountName: string
  accountType: string
  accountNumber: string
  bsb: string
  balance: string
}

interface FormErrors {
  institution?: string
  accountName?: string
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

export function AddAccountDialog() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    institution: '',
    accountName: '',
    accountType: '',
    accountNumber: '',
    bsb: '',
    balance: ''
  })
  const [errors, setErrors] = useState<FormErrors>({})

  // Auto-open dialog when action=add query parameter is present
  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'add') {
      setIsOpen(true)
      // Remove the query parameter from the URL
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [searchParams])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.institution) {
      newErrors.institution = 'Institution is required'
    }

    if (!formData.accountName.trim()) {
      newErrors.accountName = 'Account name is required'
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
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.accountName,
          institution: formData.institution,
          accountType: formData.accountType,
          accountNumber: formData.accountNumber || undefined,
          bsb: formData.bsb || undefined,
          balance: formData.balance,
          metadata: {
            description: `${formData.accountType} account at ${formData.institution}`,
          }
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create account')
      }

      await response.json()
      
      toast.success('Account added successfully!')
      setIsOpen(false)
      
      // Reset form
      setFormData({
        institution: '',
        accountName: '',
        accountType: '',
        accountNumber: '',
        bsb: '',
        balance: ''
      })
      setErrors({})
      
      // Refresh the page to show the new account
      router.refresh()
    } catch (error) {
      console.error('Error creating account:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFieldChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Account</DialogTitle>
          <DialogDescription>
            Connect a new bank account or add a manual account to track.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
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
            <Label htmlFor="account-name">Account Name *</Label>
            <Input
              id="account-name"
              value={formData.accountName}
              onChange={(e) => handleFieldChange('accountName', e.target.value)}
              placeholder="e.g., Everyday Account"
              className={errors.accountName ? 'border-red-500' : ''}
            />
            {errors.accountName && (
              <p className="text-sm text-red-500">{errors.accountName}</p>
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
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'Adding...' : 'Add Account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
