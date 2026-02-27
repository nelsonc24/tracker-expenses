"use client"

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Database,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  Loader2,
  AlertTriangle,
  Bot,
  Eye,
  EyeOff,
  KeyRound,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { toast } from 'sonner'

// Sample categories data
const sampleCategories = [
  { id: '1', name: 'Groceries', icon: '🛒', color: '#22c55e', isSystem: true, parentId: null, sortOrder: 1 },
  { id: '2', name: 'Entertainment', icon: '🎬', color: '#8b5cf6', isSystem: true, parentId: null, sortOrder: 2 },
  { id: '3', name: 'Transport', icon: '🚗', color: '#3b82f6', isSystem: true, parentId: null, sortOrder: 3 },
  { id: '4', name: 'Dining Out', icon: '🍽️', color: '#f59e0b', isSystem: false, parentId: '1', sortOrder: 4 },
  { id: '5', name: 'Streaming Services', icon: '📺', color: '#ef4444', isSystem: false, parentId: '2', sortOrder: 5 },
  { id: '6', name: 'Utilities', icon: '⚡', color: '#06b6d4', isSystem: true, parentId: null, sortOrder: 6 },
]

const colorOptions = [
  '#22c55e', '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', 
  '#06b6d4', '#ec4899', '#64748b', '#84cc16', '#f97316'
]

export default function SettingsPage() {
  const { user, isLoaded } = useUser()
  const [selectedTab, setSelectedTab] = useState('general')
  const [notifications, setNotifications] = useState({
    budgetAlerts: true,
    transactionAlerts: false,
    weeklyReports: true,
    monthlyReports: true,
    unusualSpending: true,
    emailNotifications: true,
    pushNotifications: false,
  })
  
  const [preferences, setPreferences] = useState({
    currency: 'AUD',
    dateFormat: 'DD/MM/YYYY',
    firstDayOfWeek: 'monday',
    defaultTheme: 'system',
    colorScheme: 'default',
    autoSync: true,
    smartCategories: true,
    duplicateDetection: true,
  })

  const [clearTransactionsDialogOpen, setClearTransactionsDialogOpen] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  // AI Assistant — per-user Gemini API key state
  const [geminiKey, setGeminiKey] = useState('')
  const [geminiMasked, setGeminiMasked] = useState<string | null>(null)
  const [geminiHasKey, setGeminiHasKey] = useState(false)
  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const [geminiSaving, setGeminiSaving] = useState(false)
  const [geminiDeleting, setGeminiDeleting] = useState(false)

  useEffect(() => {
    fetch('/api/user/gemini-key')
      .then(r => r.json())
      .then((data: { hasKey: boolean; maskedKey: string | null }) => {
        setGeminiHasKey(data.hasKey)
        setGeminiMasked(data.maskedKey)
      })
      .catch(() => {})
  }, [])

  const handleSaveGeminiKey = async () => {
    if (!geminiKey.trim()) return
    setGeminiSaving(true)
    try {
      const res = await fetch('/api/user/gemini-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: geminiKey }),
      })
      const data = await res.json() as { error?: string; maskedKey?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setGeminiHasKey(true)
      setGeminiMasked(data.maskedKey ?? null)
      setGeminiKey('')
      toast.success('API key saved securely')
    } catch {
      toast.error('Failed to save API key')
    } finally {
      setGeminiSaving(false)
    }
  }

  const handleRemoveGeminiKey = async () => {
    setGeminiDeleting(true)
    try {
      await fetch('/api/user/gemini-key', { method: 'DELETE' })
      setGeminiHasKey(false)
      setGeminiMasked(null)
      setGeminiKey('')
      toast.success('API key removed')
    } catch {
      toast.error('Failed to remove API key')
    } finally {
      setGeminiDeleting(false)
    }
  }

  // Function to handle clearing all transactions
  const handleClearAllTransactions = async () => {
    setIsClearing(true)
    
    try {
      const response = await fetch('/api/transactions/clear', {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to clear transactions')
      }

      const result = await response.json()
      
      toast.success(`All transaction data has been cleared successfully. Deleted ${result.deletedCount} transactions.`)
      setClearTransactionsDialogOpen(false)
      
      // Trigger a page refresh to update all data
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error('Error clearing transactions:', error)
      toast.error('Failed to clear transaction data. Please try again.')
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
          Manage your account preferences and application settings
        </p>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
          <TabsTrigger value="general" className="text-xs sm:text-sm">General</TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs sm:text-sm">Notify</TabsTrigger>
          <TabsTrigger value="categories" className="text-xs sm:text-sm">Categories</TabsTrigger>
          <TabsTrigger value="security" className="text-xs sm:text-sm hidden sm:block">Security</TabsTrigger>
          <TabsTrigger value="data" className="text-xs sm:text-sm">Data</TabsTrigger>
          <TabsTrigger value="ai" className="text-xs sm:text-sm">AI</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <User className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Profile Information</span>
              </CardTitle>
              <CardDescription className="text-sm">
                Manage your personal information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm">First Name</Label>
                  <Input 
                    id="firstName" 
                    defaultValue={user?.firstName || ''} 
                    disabled={!isLoaded}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm">Last Name</Label>
                  <Input 
                    id="lastName" 
                    defaultValue={user?.lastName || ''} 
                    disabled={!isLoaded}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  defaultValue={user?.emailAddresses[0]?.emailAddress || ''} 
                  disabled 
                />
                <p className="text-xs text-muted-foreground">
                  Email address is managed by your authentication provider
                </p>
              </div>
              <Button className="w-full sm:w-auto">Save Profile</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <Palette className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Appearance</span>
              </CardTitle>
              <CardDescription className="text-sm">
                Customize the look and feel of your application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <div className="space-y-0.5">
                  <Label className="text-sm">Theme</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Choose your preferred color theme
                  </p>
                </div>
                <ThemeToggle />
              </div>

              <div className="space-y-2">
                <Label>Color Scheme</Label>
                <Select value={preferences.colorScheme} onValueChange={(value) => setPreferences(prev => ({ ...prev, colorScheme: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="forest">Forest</SelectItem>
                    <SelectItem value="sunset">Sunset</SelectItem>
                    <SelectItem value="ocean">Ocean</SelectItem>
                    <SelectItem value="monochrome">Monochrome</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Regional Settings</span>
              </CardTitle>
              <CardDescription>
                Configure regional preferences and formats
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={preferences.currency} onValueChange={(value) => setPreferences(prev => ({ ...prev, currency: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date Format</Label>
                  <Select value={preferences.dateFormat} onValueChange={(value) => setPreferences(prev => ({ ...prev, dateFormat: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>First Day of Week</Label>
                <Select value={preferences.firstDayOfWeek} onValueChange={(value) => setPreferences(prev => ({ ...prev, firstDayOfWeek: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sunday">Sunday</SelectItem>
                    <SelectItem value="monday">Monday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notification Preferences</span>
              </CardTitle>
              <CardDescription>
                Control how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Budget Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when you&apos;re approaching budget limits
                    </p>
                  </div>
                  <Switch 
                    checked={notifications.budgetAlerts} 
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, budgetAlerts: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Transaction Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Real-time notifications for new transactions
                    </p>
                  </div>
                  <Switch 
                    checked={notifications.transactionAlerts} 
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, transactionAlerts: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Unusual Spending</Label>
                    <p className="text-sm text-muted-foreground">
                      Alert me about potentially unusual spending patterns
                    </p>
                  </div>
                  <Switch 
                    checked={notifications.unusualSpending} 
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, unusualSpending: checked }))}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Weekly Reports</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive weekly spending summaries
                    </p>
                  </div>
                  <Switch 
                    checked={notifications.weeklyReports} 
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, weeklyReports: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Monthly Reports</Label>
                    <p className="text-sm text-muted-foreground">
                      Comprehensive monthly financial reports
                    </p>
                  </div>
                  <Switch 
                    checked={notifications.monthlyReports} 
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, monthlyReports: checked }))}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send notifications to your email address
                    </p>
                  </div>
                  <Switch 
                    checked={notifications.emailNotifications} 
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, emailNotifications: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Browser push notifications
                    </p>
                  </div>
                  <Switch 
                    checked={notifications.pushNotifications} 
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, pushNotifications: checked }))}
                  />
                </div>
              </div>
              <Button>Save Preferences</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories */}
        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Transaction Categories</CardTitle>
                  <CardDescription>
                    Manage categories for organizing your transactions
                  </CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sampleCategories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{category.icon}</div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{category.name}</span>
                          {category.isSystem && (
                            <Badge variant="secondary" className="text-xs">System</Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-sm text-muted-foreground">
                            {category.color}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      {!category.isSystem && (
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Security Settings</span>
              </CardTitle>
              <CardDescription>
                Manage your account security and privacy settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-sync with banks</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically sync transactions from connected accounts
                    </p>
                  </div>
                  <Switch 
                    checked={preferences.autoSync} 
                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, autoSync: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Smart categorization</Label>
                    <p className="text-sm text-muted-foreground">
                      Use AI to automatically categorize transactions
                    </p>
                  </div>
                  <Switch 
                    checked={preferences.smartCategories} 
                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, smartCategories: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Duplicate detection</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically detect and merge duplicate transactions
                    </p>
                  </div>
                  <Switch 
                    checked={preferences.duplicateDetection} 
                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, duplicateDetection: checked }))}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Account Security</h4>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Shield className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Shield className="h-4 w-4 mr-2" />
                    Two-Factor Authentication
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Shield className="h-4 w-4 mr-2" />
                    Active Sessions
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Management */}
        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Data Management</span>
              </CardTitle>
              <CardDescription>
                Export, import, and manage your financial data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Export Data</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <Button variant="outline" className="justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Export Transactions (CSV)
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Export Budgets (JSON)
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Export Categories (JSON)
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Export All Data (ZIP)
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Import Data</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <Button variant="outline" className="justify-start">
                    <Upload className="h-4 w-4 mr-2" />
                    Import from CSV
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Upload className="h-4 w-4 mr-2" />
                    Import from Mint
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Upload className="h-4 w-4 mr-2" />
                    Import from YNAB
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Upload className="h-4 w-4 mr-2" />
                    Import from QuickBooks
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium text-red-600">Danger Zone</h4>
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => setClearTransactionsDialogOpen(true)}
                    disabled={isClearing}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All Transaction Data
                  </Button>
                  <Button variant="outline" className="w-full justify-start border-red-200 text-red-600 hover:bg-red-50">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account Permanently
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Assistant */}
        <TabsContent value="ai" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>AI Finance Assistant</span>
              </CardTitle>
              <CardDescription className="text-sm">
                Connect your own Google Gemini API key. Your key is encrypted with AES-256-GCM
                before storage — it cannot be read by anyone, including admins.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current key status */}
              {geminiHasKey && geminiMasked ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/40">
                  <KeyRound className="h-4 w-4 text-green-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Personal API key active</p>
                    <p className="text-xs text-muted-foreground font-mono">{geminiMasked}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive shrink-0"
                    onClick={handleRemoveGeminiKey}
                    disabled={geminiDeleting}
                  >
                    {geminiDeleting
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Trash2 className="h-3 w-3" />}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                  <KeyRound className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Using shared system key — add your own key below for dedicated access.
                  </p>
                </div>
              )}

              {/* Key input */}
              <div className="space-y-3">
                <Label htmlFor="geminiKey" className="text-sm font-medium">
                  {geminiHasKey ? 'Replace API Key' : 'Add Your API Key'}
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="geminiKey"
                      type={showGeminiKey ? 'text' : 'password'}
                      placeholder="AIzaSy..."
                      value={geminiKey}
                      onChange={e => setGeminiKey(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveGeminiKey() }}
                      className="pr-10 font-mono text-sm"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeminiKey(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showGeminiKey
                        ? <EyeOff className="h-4 w-4" />
                        : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button
                    onClick={handleSaveGeminiKey}
                    disabled={!geminiKey.trim() || geminiSaving}
                    className="shrink-0"
                  >
                    {geminiSaving
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : 'Save'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Get a free key at{' '}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:opacity-80"
                  >
                    aistudio.google.com/apikey
                  </a>
                </p>
              </div>

              <Separator />

              {/* Security explanation */}
              <div className="space-y-2">
                <p className="text-sm font-medium">How your key is protected</p>
                <ul className="space-y-1.5 text-xs text-muted-foreground list-disc pl-4">
                  <li>Encrypted with AES-256-GCM before being written to the database</li>
                  <li>The GCM authentication tag detects any tampering with the stored value</li>
                  <li>Decryption requires a server-side secret key that is never exposed to users or logs</li>
                  <li>Only the masked form <code className="bg-muted px-1 rounded font-mono">AIzaSyCgpw...oO0</code> is ever sent to your browser</li>
                  <li>If someone dumps the database, they get ciphertext that is useless without the server key</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

        {/* Clear Transactions Confirmation Dialog */}
      <Dialog open={clearTransactionsDialogOpen} onOpenChange={setClearTransactionsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Clear All Transaction Data
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to clear all your transaction data? This action will permanently delete all transactions and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setClearTransactionsDialogOpen(false)}
              disabled={isClearing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleClearAllTransactions}
              disabled={isClearing}
              variant="destructive"
            >
              {isClearing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Clear All Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
