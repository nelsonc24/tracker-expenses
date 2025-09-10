"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { 
  Search, 
  Layers, 
  Dumbbell, 
  Music, 
  Camera, 
  BookOpen, 
  Code, 
  Brush, 
  Utensils,
  Plane,
  Heart,
  Car,
  Home,
  Briefcase,
  Star,
  Trophy,
  Target
} from 'lucide-react'

interface ActivityTemplate {
  id: string
  name: string
  description: string
  category: string
  color: string
  icon: string
  estimatedBudget?: number
  suggestedBudgetPeriod?: 'monthly' | 'quarterly' | 'yearly'
  keywords: string[]
  isPopular?: boolean
}

interface ActivityTemplatesProps {
  onActivityCreated: () => void
}

const templates: ActivityTemplate[] = [
  // Fitness & Health
  {
    id: 'gym-membership',
    name: 'Gym Membership',
    description: 'Monthly gym membership fees, personal training, fitness classes',
    category: 'fitness',
    color: '#dc2626',
    icon: 'dumbbell',
    estimatedBudget: 80,
    suggestedBudgetPeriod: 'monthly',
    keywords: ['gym', 'fitness', 'workout', 'training', 'health'],
    isPopular: true
  },
  {
    id: 'dance-classes',
    name: 'Dance Classes',
    description: 'Dance lessons, costumes, competitions, recitals',
    category: 'fitness',
    color: '#e11d48',
    icon: 'music',
    estimatedBudget: 200,
    suggestedBudgetPeriod: 'monthly',
    keywords: ['dance', 'ballet', 'salsa', 'hip hop', 'ballroom', 'costume']
  },
  {
    id: 'yoga-pilates',
    name: 'Yoga & Pilates',
    description: 'Studio classes, equipment, retreats, certification',
    category: 'fitness',
    color: '#059669',
    icon: 'heart',
    estimatedBudget: 150,
    suggestedBudgetPeriod: 'monthly',
    keywords: ['yoga', 'pilates', 'meditation', 'mindfulness', 'retreat']
  },
  
  // Creative Arts
  {
    id: 'photography',
    name: 'Photography',
    description: 'Camera equipment, lenses, editing software, workshops',
    category: 'hobby',
    color: '#7c3aed',
    icon: 'camera',
    estimatedBudget: 500,
    suggestedBudgetPeriod: 'quarterly',
    keywords: ['photography', 'camera', 'lens', 'lightroom', 'photoshop'],
    isPopular: true
  },
  {
    id: 'music-lessons',
    name: 'Music Lessons',
    description: 'Instrument lessons, sheet music, equipment, performances',
    category: 'hobby',
    color: '#0ea5e9',
    icon: 'music',
    estimatedBudget: 200,
    suggestedBudgetPeriod: 'monthly',
    keywords: ['music', 'piano', 'guitar', 'violin', 'lessons', 'instrument']
  },
  {
    id: 'art-painting',
    name: 'Art & Painting',
    description: 'Art supplies, canvases, brushes, classes, studio rental',
    category: 'hobby',
    color: '#f59e0b',
    icon: 'brush',
    estimatedBudget: 150,
    suggestedBudgetPeriod: 'monthly',
    keywords: ['art', 'painting', 'drawing', 'canvas', 'acrylic', 'watercolor']
  },
  
  // Education & Skills
  {
    id: 'coding-bootcamp',
    name: 'Coding Bootcamp',
    description: 'Programming courses, certification, books, development tools',
    category: 'education',
    color: '#16a34a',
    icon: 'code',
    estimatedBudget: 3000,
    suggestedBudgetPeriod: 'yearly',
    keywords: ['coding', 'programming', 'bootcamp', 'javascript', 'python', 'react'],
    isPopular: true
  },
  {
    id: 'language-learning',
    name: 'Language Learning',
    description: 'Language apps, tutoring, books, immersion programs',
    category: 'education',
    color: '#db2777',
    icon: 'book-open',
    estimatedBudget: 100,
    suggestedBudgetPeriod: 'monthly',
    keywords: ['language', 'spanish', 'french', 'german', 'duolingo', 'tutor']
  },
  {
    id: 'professional-development',
    name: 'Professional Development',
    description: 'Conferences, workshops, certification courses, networking',
    category: 'professional',
    color: '#1d4ed8',
    icon: 'briefcase',
    estimatedBudget: 1500,
    suggestedBudgetPeriod: 'yearly',
    keywords: ['conference', 'workshop', 'certification', 'training', 'networking']
  },
  
  // Lifestyle & Hobbies
  {
    id: 'cooking-classes',
    name: 'Cooking Classes',
    description: 'Culinary classes, specialty ingredients, kitchen equipment',
    category: 'lifestyle',
    color: '#ea580c',
    icon: 'utensils',
    estimatedBudget: 200,
    suggestedBudgetPeriod: 'monthly',
    keywords: ['cooking', 'culinary', 'chef', 'baking', 'ingredients', 'kitchen']
  },
  {
    id: 'travel-adventures',
    name: 'Travel & Adventures',
    description: 'Weekend trips, outdoor activities, gear, accommodations',
    category: 'lifestyle',
    color: '#0891b2',
    icon: 'plane',
    estimatedBudget: 800,
    suggestedBudgetPeriod: 'quarterly',
    keywords: ['travel', 'hiking', 'camping', 'adventure', 'vacation', 'outdoor']
  },
  {
    id: 'home-improvement',
    name: 'Home Improvement',
    description: 'DIY projects, tools, materials, garden improvements',
    category: 'project',
    color: '#65a30d',
    icon: 'home',
    estimatedBudget: 500,
    suggestedBudgetPeriod: 'quarterly',
    keywords: ['home', 'diy', 'renovation', 'garden', 'tools', 'improvement']
  },
  
  // Sports & Competition
  {
    id: 'competitive-sports',
    name: 'Competitive Sports',
    description: 'Equipment, training, competitions, travel, gear',
    category: 'fitness',
    color: '#dc2626',
    icon: 'trophy',
    estimatedBudget: 400,
    suggestedBudgetPeriod: 'monthly',
    keywords: ['sport', 'competition', 'equipment', 'training', 'tournament']
  }
]

const getIconComponent = (iconName: string) => {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    dumbbell: Dumbbell,
    music: Music,
    camera: Camera,
    'book-open': BookOpen,
    code: Code,
    brush: Brush,
    utensils: Utensils,
    plane: Plane,
    heart: Heart,
    car: Car,
    home: Home,
    briefcase: Briefcase,
    trophy: Trophy,
    target: Target
  }
  
  const IconComponent = icons[iconName] || Star
  return <IconComponent className="h-6 w-6" />
}

export function ActivityTemplates({ onActivityCreated }: ActivityTemplatesProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const categories = Array.from(new Set(templates.map(t => t.category)))
  
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = !searchQuery || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.keywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesCategory = !selectedCategory || template.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const popularTemplates = templates.filter(t => t.isPopular)

  const createActivityFromTemplate = async (template: ActivityTemplate) => {
    try {
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          category: template.category,
          color: template.color,
          budget: template.estimatedBudget,
          budgetPeriod: template.suggestedBudgetPeriod || 'monthly'
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create activity')
      }

      toast.success(`Created "${template.name}" activity successfully!`)
      setOpen(false)
      onActivityCreated()
    } catch (error) {
      console.error('Error creating activity:', error)
      toast.error('Failed to create activity from template')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount)
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      fitness: 'bg-red-100 text-red-800',
      hobby: 'bg-purple-100 text-purple-800',
      education: 'bg-green-100 text-green-800',
      professional: 'bg-blue-100 text-blue-800',
      lifestyle: 'bg-orange-100 text-orange-800',
      project: 'bg-emerald-100 text-emerald-800'
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Use Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Activity Templates
          </DialogTitle>
          <DialogDescription>
            Choose from pre-configured activity templates to get started quickly
          </DialogDescription>
        </DialogHeader>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              All Categories
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="capitalize"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Popular Templates */}
        {!searchQuery && !selectedCategory && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4" />
              Popular Templates
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {popularTemplates.map((template) => (
                <Card 
                  key={template.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
                  style={{ borderLeftColor: template.color }}
                  onClick={() => createActivityFromTemplate(template)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-100">
                        {getIconComponent(template.icon)}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-sm">{template.name}</CardTitle>
                        <Badge className={`text-xs ${getCategoryColor(template.category)}`}>
                          {template.category}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground mb-2">
                      {template.description}
                    </p>
                    {template.estimatedBudget && (
                      <div className="text-xs font-medium">
                        Suggested budget: {formatCurrency(template.estimatedBudget)}/{template.suggestedBudgetPeriod}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* All Templates */}
        <ScrollArea className="h-96">
          <div className="space-y-3">
            <h3 className="text-sm font-medium">
              {searchQuery || selectedCategory ? 'Search Results' : 'All Templates'}
              <span className="text-muted-foreground ml-2">({filteredTemplates.length})</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredTemplates.map((template) => (
                <Card 
                  key={template.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
                  style={{ borderLeftColor: template.color }}
                  onClick={() => createActivityFromTemplate(template)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-100">
                        {getIconComponent(template.icon)}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-sm flex items-center gap-2">
                          {template.name}
                          {template.isPopular && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Popular
                            </Badge>
                          )}
                        </CardTitle>
                        <Badge className={`text-xs ${getCategoryColor(template.category)}`}>
                          {template.category}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground mb-2">
                      {template.description}
                    </p>
                    {template.estimatedBudget && (
                      <div className="text-xs font-medium">
                        Suggested budget: {formatCurrency(template.estimatedBudget)}/{template.suggestedBudgetPeriod}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.keywords.slice(0, 3).map((keyword) => (
                        <Badge key={keyword} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredTemplates.length === 0 && (
              <div className="text-center py-8">
                <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <div className="text-sm text-muted-foreground">
                  No templates found matching your criteria
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedCategory(null)
                  }}
                >
                  Clear filters
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            Click any template to create an activity with suggested settings
          </div>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
