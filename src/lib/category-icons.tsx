import React from 'react'
import { 
  ShoppingCart,
  Car,
  Home,
  Utensils,
  Coffee,
  Gamepad2,
  Plane,
  Heart,
  GraduationCap,
  Briefcase,
  CreditCard,
  Gift,
  Music,
  Shirt,
  Zap,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  Hash,
  FolderPlus,
  MoreHorizontal,
  Film,
  Dumbbell,
  Smartphone,
  Laptop,
  Tv,
  Wifi,
  Lightbulb,
  Wrench,
  Stethoscope,
  Pill,
  Baby,
  PawPrint,
  Trees,
  Flower2,
  Pizza,
  Wine,
  IceCream,
  Cake,
  Bus,
  Train,
  Bike,
  Fuel,
  Building,
  Factory,
  Warehouse,
  type LucideIcon
} from 'lucide-react'

/**
 * Comprehensive icon mapping for categories
 * Maps icon names (stored in DB) to Lucide React components
 */
export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  // Shopping & Retail
  'shopping-cart': ShoppingCart,
  'shopping-bag': ShoppingBag,
  'gift': Gift,
  'shirt': Shirt,
  
  // Transportation
  'car': Car,
  'plane': Plane,
  'bus': Bus,
  'train': Train,
  'bike': Bike,
  'fuel': Fuel,
  
  // Home & Living
  'home': Home,
  'lightbulb': Lightbulb,
  'wrench': Wrench,
  'warehouse': Warehouse,
  'building': Building,
  'factory': Factory,
  
  // Food & Dining
  'utensils': Utensils,
  'coffee': Coffee,
  'pizza': Pizza,
  'wine': Wine,
  'ice-cream': IceCream,
  'cake': Cake,
  
  // Entertainment & Leisure
  'gamepad2': Gamepad2,
  'music': Music,
  'film': Film,
  'tv': Tv,
  
  // Health & Wellness
  'heart': Heart,
  'stethoscope': Stethoscope,
  'pill': Pill,
  'dumbbell': Dumbbell,
  
  // Education & Work
  'graduation-cap': GraduationCap,
  'briefcase': Briefcase,
  
  // Technology
  'smartphone': Smartphone,
  'laptop': Laptop,
  'wifi': Wifi,
  'zap': Zap,
  
  // Finance
  'dollar-sign': DollarSign,
  'credit-card': CreditCard,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  
  // Family & Pets
  'baby': Baby,
  'paw-print': PawPrint,
  
  // Nature
  'trees': Trees,
  'flower2': Flower2,
  
  // Default & Utilities
  'hash': Hash,
  'folder-plus': FolderPlus,
  'more-horizontal': MoreHorizontal,
}

/**
 * Get all available icon names
 */
export const getAvailableIconNames = (): string[] => {
  return Object.keys(CATEGORY_ICON_MAP)
}

/**
 * Get icon component by name
 * Returns the icon component or a default icon if not found
 */
export const getIconComponent = (iconName: string | null | undefined): LucideIcon => {
  if (!iconName) return Hash
  return CATEGORY_ICON_MAP[iconName] || Hash
}

/**
 * Render a category icon with optional styling
 * This is a React component that handles icon rendering
 */
export const getCategoryIcon = (
  iconName: string | null | undefined,
  className: string = "h-4 w-4"
): React.ReactElement => {
  const IconComponent = getIconComponent(iconName)
  return <IconComponent className={className} />
}

/**
 * Icon categories for organized display in picker
 */
export const ICON_CATEGORIES = {
  'Shopping & Retail': [
    'shopping-cart', 
    'shopping-bag', 
    'gift', 
    'shirt'
  ],
  'Transportation': [
    'car', 
    'plane', 
    'bus', 
    'train', 
    'bike', 
    'fuel'
  ],
  'Home & Living': [
    'home', 
    'lightbulb', 
    'wrench', 
    'warehouse', 
    'building', 
    'factory'
  ],
  'Food & Dining': [
    'utensils', 
    'coffee', 
    'pizza', 
    'wine', 
    'ice-cream', 
    'cake'
  ],
  'Entertainment': [
    'gamepad2', 
    'music', 
    'film', 
    'tv'
  ],
  'Health & Wellness': [
    'heart', 
    'stethoscope', 
    'pill', 
    'dumbbell'
  ],
  'Education & Work': [
    'graduation-cap', 
    'briefcase'
  ],
  'Technology': [
    'smartphone', 
    'laptop', 
    'wifi', 
    'zap'
  ],
  'Finance': [
    'dollar-sign', 
    'credit-card', 
    'trending-up', 
    'trending-down'
  ],
  'Family & Pets': [
    'baby', 
    'paw-print'
  ],
  'Nature': [
    'trees', 
    'flower2'
  ],
  'Other': [
    'hash', 
    'folder-plus', 
    'more-horizontal'
  ]
} as const

/**
 * Format icon name for display
 */
export const formatIconName = (iconName: string): string => {
  return iconName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
