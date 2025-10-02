# Category Icon System

## Overview

This document describes the robust category icon system implemented for the expense tracker application. The system provides multiple ways to set category icons including predefined icon selection, custom URLs, and file uploads.

## Components

### 1. Shared Icon Utility (`src/lib/category-icons.tsx`)

A centralized utility that manages all category icons across the application.

**Key Features:**
- Comprehensive icon mapping with 50+ Lucide React icons
- Organized into logical categories (Shopping, Transportation, Food, etc.)
- Type-safe icon component retrieval
- Utility functions for icon rendering and formatting

**Usage:**
```tsx
import { getCategoryIcon, getIconComponent } from '@/lib/category-icons'

// Render an icon directly
const icon = getCategoryIcon('shopping-cart', 'h-6 w-6')

// Get the icon component
const IconComponent = getIconComponent('shopping-cart')
return <IconComponent className="h-4 w-4" />
```

**Available Icon Categories:**
- Shopping & Retail: `shopping-cart`, `shopping-bag`, `gift`, `shirt`
- Transportation: `car`, `plane`, `bus`, `train`, `bike`, `fuel`
- Home & Living: `home`, `lightbulb`, `wrench`, `warehouse`, `building`, `factory`
- Food & Dining: `utensils`, `coffee`, `pizza`, `wine`, `ice-cream`, `cake`
- Entertainment: `gamepad2`, `music`, `film`, `tv`
- Health & Wellness: `heart`, `stethoscope`, `pill`, `dumbbell`
- Education & Work: `graduation-cap`, `briefcase`
- Technology: `smartphone`, `laptop`, `wifi`, `zap`
- Finance: `dollar-sign`, `credit-card`, `trending-up`, `trending-down`
- Family & Pets: `baby`, `paw-print`
- Nature: `trees`, `flower2`
- Other: `hash`, `folder-plus`, `more-horizontal`

### 2. IconPicker Component (`src/components/icon-picker.tsx`)

A comprehensive UI component for selecting or uploading category icons.

**Features:**
- **Icons Tab**: Browse and select from organized icon categories
- **URL Tab**: Enter a custom icon URL with live preview
- **Upload Tab**: Upload custom icon files (PNG, JPG, SVG up to 2MB)
- Visual selection with checkmarks
- Real-time preview of selected icons
- Responsive grid layout
- Accessibility features

**Props:**
```tsx
interface IconPickerProps {
  selectedIcon: string
  onIconChange: (iconName: string) => void
  customIconUrl?: string
  onCustomIconUrlChange?: (url: string) => void
  showCustomUpload?: boolean
  className?: string
}
```

**Usage Example:**
```tsx
import { IconPicker } from '@/components/icon-picker'

function CategoryForm() {
  const [icon, setIcon] = useState('hash')
  const [customUrl, setCustomUrl] = useState('')

  return (
    <IconPicker
      selectedIcon={icon}
      onIconChange={setIcon}
      customIconUrl={customUrl}
      onCustomIconUrlChange={setCustomUrl}
      showCustomUpload={true}
    />
  )
}
```

## Database Schema

The `categories` table includes:
```sql
icon TEXT DEFAULT 'folder' NOT NULL
custom_icon_url TEXT
```

- `icon`: Stores the icon name (e.g., 'shopping-cart')
- `custom_icon_url`: Stores custom icon URL or uploaded file URL

## Implementation in Pages

### Categories Page (`src/app/(dashboard)/categories/page.tsx`)

**Changes Made:**
1. Replaced icon select dropdowns with `IconPicker` component
2. Updated `renderCategoryIcon` function to use shared `getIconComponent`
3. Removed redundant icon mapping code
4. Support for both create and edit dialogs

**Icon Rendering:**
```tsx
function renderCategoryIcon(iconName, customIconUrl, color) {
  if (customIconUrl) {
    return <Image src={customIconUrl} ... />
  }
  const IconComponent = getIconComponent(iconName)
  return <IconComponent className="h-4 w-4" />
}
```

### Budgets Page (`src/app/(dashboard)/budgets/page.tsx`)

**Changes Made:**
1. Removed local `getCategoryIcon` function
2. Imported shared `getCategoryIcon` utility
3. Removed duplicate icon imports
4. Now uses consistent icon rendering across the app

## File Upload System

### Current Implementation
The file upload feature is UI-ready but requires backend storage integration.

**Current Flow:**
1. User selects an image file
2. File is validated (type, size)
3. Preview is generated using FileReader
4. Data URL is temporarily used

### Production Integration (TODO)

To enable permanent file storage, integrate with a storage service:

#### Option 1: Vercel Blob Storage
```tsx
import { put } from '@vercel/blob'

async function uploadIcon(file: File) {
  const blob = await put(`icons/${file.name}`, file, {
    access: 'public',
  })
  return blob.url
}
```

#### Option 2: AWS S3
```tsx
import AWS from 'aws-sdk'

async function uploadToS3(file: File) {
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  })
  
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `category-icons/${Date.now()}-${file.name}`,
    Body: file,
    ContentType: file.type,
    ACL: 'public-read'
  }
  
  const result = await s3.upload(params).promise()
  return result.Location
}
```

#### API Route for Upload (`src/app/api/categories/upload-icon/route.ts`)
```tsx
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { put } from '@vercel/blob'

export async function POST(request: NextRequest) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File
  
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Validate file type and size
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 })
  }

  try {
    const blob = await put(`category-icons/${userId}/${Date.now()}-${file.name}`, file, {
      access: 'public',
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
```

## Benefits of the New System

1. **Centralized Management**: Single source of truth for all category icons
2. **Type Safety**: TypeScript ensures proper icon usage
3. **Flexibility**: Support for predefined icons, custom URLs, and file uploads
4. **User Experience**: Visual icon picker with organized categories
5. **Reusability**: Shared utilities can be used anywhere in the app
6. **Scalability**: Easy to add new icons or icon categories
7. **Consistency**: Same icon rendering logic across all pages

## Migration Notes

### For Existing Categories
- Old icon names will continue to work
- New icons are automatically available
- Custom icons require no migration

### For Future Development
- Use `getCategoryIcon` or `getIconComponent` from shared utilities
- Don't create new icon mappings in individual components
- Add new icons to `CATEGORY_ICON_MAP` in `lib/category-icons.tsx`

## Troubleshooting

### Icon Not Displaying
1. Check that the icon name exists in `CATEGORY_ICON_MAP`
2. Verify the icon is imported in `category-icons.tsx`
3. Ensure proper className is passed

### Custom Icon Not Loading
1. Verify the URL is accessible
2. Check for CORS issues
3. Ensure image format is supported
4. Check browser console for errors

### Upload Not Working
1. Verify file size is under 2MB
2. Check file type is an image
3. Ensure backend storage is configured
4. Check API route is accessible

## Future Enhancements

1. **Icon Search**: Add search functionality to IconPicker
2. **Recent Icons**: Show recently used icons
3. **Favorites**: Allow users to favorite frequently used icons
4. **Color Customization**: Preview icons in category colors
5. **Emoji Support**: Allow emoji as category icons
6. **SVG Editor**: Simple SVG icon editor for custom designs
7. **Icon Packs**: Import third-party icon packs
8. **AI Generation**: Generate custom icons using AI

## Testing

### Manual Testing Checklist
- [ ] Create category with predefined icon
- [ ] Create category with custom URL icon
- [ ] Upload custom icon file
- [ ] Edit category icon
- [ ] Verify icon displays correctly in category list
- [ ] Verify icon displays correctly in budgets page
- [ ] Test icon in both light and dark modes
- [ ] Test responsive layout on mobile devices
- [ ] Test accessibility with keyboard navigation
- [ ] Test with screen reader

### Unit Tests (TODO)
```tsx
describe('getCategoryIcon', () => {
  it('should return icon component for valid icon name', () => {
    const icon = getIconComponent('shopping-cart')
    expect(icon).toBeDefined()
  })

  it('should return default icon for invalid icon name', () => {
    const icon = getIconComponent('invalid-icon')
    expect(icon).toBe(Hash)
  })
})
```

## Support

For questions or issues related to the category icon system, please:
1. Check this documentation first
2. Search existing GitHub issues
3. Create a new issue with detailed information
4. Tag with `icons` or `categories` label
