# Forvis Mazars Styling Applied to Teams Page

## Overview
The team management pages have been updated to align with Forvis Mazars brand guidelines and styling patterns used throughout the application.

## Color Palette Applied

### Primary Colors
- **Forvis Blue 500**: `#2E5AAC` - Primary brand color
- **Forvis Blue 400**: `#5B93D7` - Light blue accent
- **Forvis Blue 600**: `#25488A` - Dark blue
- **Forvis Blue 700**: `#1C3667` - Very dark blue
- **Forvis Blue 50**: `#EBF2FA` - Very light blue background
- **Forvis Blue 100**: `#D6E4F5` - Light blue background

### Gray Scale
- **Forvis Gray 50**: `#F8F9FA` - Page backgrounds
- **Forvis Gray 100**: `#F1F3F5` - Card backgrounds
- **Forvis Gray 200**: `#E9ECEF` - Borders
- **Forvis Gray 300**: `#DEE2E6` - Strong borders
- **Forvis Gray 600**: `#6C757D` - Disabled states
- **Forvis Gray 700**: `#495057` - Secondary text
- **Forvis Gray 900**: `#212529` - Primary text

## Design Elements Applied

### 1. Gradients
**Primary Button Gradient:**
```css
linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)
```

**Header Background Gradient:**
```css
linear-gradient(to right, #EBF2FA, #D6E4F5)
```

**Selected Item Background:**
```css
linear-gradient(135deg, #EBF2FA 0%, #D6E4F5 100%)
```

### 2. Shadows
- `shadow-corporate` - Subtle shadow with blue tint
- `shadow-corporate-md` - Medium shadow
- `shadow-corporate-lg` - Large shadow for modals

### 3. Borders
- Standard borders: `border-2` with forvis colors
- Interactive hover: Changes to `border-forvis-blue-500`
- Dashed borders for empty states: `border-dashed`

## Components Updated

### 1. ProjectUserList Component
**File:** `src/components/UserManagement/ProjectUserList.tsx`

**Changes:**
- Team member cards with Forvis blue gradient avatars
- Corporate shadows on all cards
- Hover effects with `shadow-corporate-md`
- Gradient backgrounds for selected states
- Modal headers with gradient backgrounds
- Blue-tinted detail cards
- Forvis-branded buttons and badges

**Key Elements:**
- User avatars: Blue gradient circles
- Cards: White with gray borders, corporate shadows
- Empty state: White card with dashed border
- Modal: Gradient header, structured layout
- Remove button: Red gradient

### 2. UserSearchModal Component
**File:** `src/components/UserManagement/UserSearchModal.tsx`

**Changes:**
- Modal header with gradient background
- Search input with blue accent icon
- User cards with gradient selection state
- Blue gradient avatars
- Role selector with gradient background
- Forvis-branded action buttons

**Key Elements:**
- Search button: Blue gradient
- Selected user cards: Light blue gradient background
- Role assignment section: Blue gradient background
- Action buttons: Forvis blue gradient

### 3. Project Team Page
**File:** `src/app/dashboard/projects/[id]/page.tsx`

**Changes:**
- Page background: `bg-forvis-gray-50`
- Header card: White with border and shadow
- Add Team Member button: Blue gradient
- Info badge: Gray with border
- Maximum width container: Centered layout

## Styling Patterns Established

### Interactive Elements
```typescript
// Primary Button
className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg 
           transition-all shadow-corporate hover:shadow-corporate-md"
style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}

// Secondary Button
className="px-6 py-2 bg-white text-forvis-gray-700 font-semibold 
           rounded-lg border-2 border-forvis-gray-300 
           hover:bg-forvis-gray-100 transition-colors shadow-corporate"
```

### Cards
```typescript
// Standard Card
className="bg-white border-2 border-forvis-gray-200 rounded-lg p-4 
           hover:border-forvis-blue-500 hover:shadow-corporate-md 
           transition-all cursor-pointer shadow-corporate"
```

### Avatars
```typescript
// User Avatar
className="w-12 h-12 rounded-full flex items-center justify-center 
           text-white font-bold text-lg shadow-corporate"
style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
```

### Modal Headers
```typescript
// Modal Header
className="px-6 py-4 border-b-2 border-forvis-gray-200 
           flex items-center justify-between"
style={{ background: 'linear-gradient(to right, #EBF2FA, #D6E4F5)' }}
```

## Typography

### Headers
- **H2**: `text-2xl font-bold text-forvis-gray-900`
- **H3**: `text-xl font-bold text-forvis-blue-900` (in modals)
- **Descriptions**: `text-sm text-forvis-gray-600`
- **Labels**: `text-sm font-bold text-forvis-gray-900`

### Body Text
- **Primary**: `text-forvis-gray-900`
- **Secondary**: `text-forvis-gray-600`
- **Tertiary**: `text-forvis-gray-500`

## Accessibility

All styling maintains:
- ✅ Sufficient color contrast (WCAG AA compliant)
- ✅ Clear hover states for interactive elements
- ✅ Focus states on form inputs
- ✅ Semantic color usage (blue for primary, red for destructive)
- ✅ Consistent spacing and sizing

## Consistency with Application

The team management styling now matches:
- Dashboard navigation bar
- Project cards on dashboard
- Balance sheet and income statement pages
- Tax calculation adjustments page
- Other project type pages (Tax Opinion, Tax Administration)

## Result

✅ **Professional Forvis Mazars branded appearance**
✅ **Consistent with existing application design**
✅ **Enhanced visual hierarchy and user experience**
✅ **Corporate shadows and gradients throughout**
✅ **Accessible and responsive design**

