"use client"

import { useState } from 'react'
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

export function AddAccountDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({
    institution: '',
    accountName: '',
    accountType: '',
    balance: ''
  })

  const handleSubmit = () => {
    // TODO: Implement actual account creation
    toast.success('Add account feature coming soon!')
    setIsOpen(false)
    // Reset form
    setFormData({
      institution: '',
      accountName: '',
      accountType: '',
      balance: ''
    })
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
            <Label htmlFor="institution">Institution</Label>
            <Select value={formData.institution} onValueChange={(value) => setFormData(prev => ({ ...prev, institution: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select your bank" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="commbank">Commonwealth Bank</SelectItem>
                <SelectItem value="anz">ANZ Bank</SelectItem>
                <SelectItem value="westpac">Westpac</SelectItem>
                <SelectItem value="nab">NAB</SelectItem>
                <SelectItem value="ubank">UBank</SelectItem>
                <SelectItem value="ing">ING</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="account-name">Account Name</Label>
            <Input
              id="account-name"
              value={formData.accountName}
              onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
              placeholder="e.g., Everyday Account"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="account-type">Account Type</Label>
            <Select value={formData.accountType} onValueChange={(value) => setFormData(prev => ({ ...prev, accountType: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">Checking</SelectItem>
                <SelectItem value="savings">Savings</SelectItem>
                <SelectItem value="credit">Credit Card</SelectItem>
                <SelectItem value="investment">Investment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="balance">Current Balance (AUD)</Label>
            <Input
              id="balance"
              type="number"
              step="0.01"
              value={formData.balance}
              onChange={(e) => setFormData(prev => ({ ...prev, balance: e.target.value }))}
              placeholder="0.00"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Add Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
