# Gradient System

Centralized gradient definitions for the Forvis Mazars Design System.

## Table of Contents

- [Overview](#overview)
- [Three Usage Methods](#three-usage-methods)
- [Gradient Categories](#gradient-categories)
  - [Primary Brand Gradients](#primary-brand-gradients)
  - [Dashboard & Card Gradients](#dashboard--card-gradients)
  - [Semantic Gradients](#semantic-gradients)
  - [Premium/Executive Gradients](#premiumexecutive-gradients)
  - [Icon Container Gradients](#icon-container-gradients)
  - [Data Visualization Gradients](#data-visualization-gradients)
- [Usage Examples](#usage-examples)
- [Migration Guide](#migration-guide)
- [Best Practices](#best-practices)

## Overview

**Goal:** Eliminate inline gradient duplication by providing three centralized methods to access gradients.

**Benefits:**
- ✅ Change gradient once, applies everywhere
- ✅ Consistent gradient usage across application
- ✅ Easy to discover available gradients
- ✅ Type-safe with TypeScript
- ✅ No more copying/pasting gradient strings

**Location:**
- **Constants & Utilities:** `src/lib/design-system/gradients.ts`
- **CSS Classes:** `src/app/globals.css`
- **Documentation:** This file

## Three Usage Methods

Choose the method that best suits your needs:

### Method 1: CSS Classes (Recommended for Static Elements)

**Best for:** Static containers, cards, headers where gradient doesn't change

```tsx
<div className="bg-gradient-dashboard-card">
  Content with dashboard card gradient
</div>

<div className="bg-gradient-icon-standard w-12 h-12 rounded-lg">
  <Icon className="h-6 w-6 text-white" />
</div>
```

**Pros:** Simple, no imports, works with Tailwind
**Cons:** Limited to predefined classes

### Method 2: Constants (Recommended for Inline Styles)

**Best for:** Dynamic styling, React inline styles, conditional gradients

```tsx
import { GRADIENTS } from '@/lib/design-system/gradients';

<div style={{ background: GRADIENTS.dashboard.card }}>
  Content with dashboard card gradient
</div>

<button style={{ background: GRADIENTS.semantic.success.button }}>
  Approve
</button>
```

**Pros:** Full access to all gradients, TypeScript support
**Cons:** Requires import

### Method 3: Utility Functions (Recommended for Dynamic/Computed Gradients)

**Best for:** Conditional logic, computed values, semantic helpers

```tsx
import { getGradient, getSemanticGradient } from '@/lib/design-system/gradients';

const gradient = getGradient('dashboard', 'card');
<div style={{ background: gradient }}>Content</div>

const buttonGradient = getSemanticGradient(
  isSuccess ? 'success' : 'error',
  'button'
);
<button style={{ background: buttonGradient }}>Submit</button>
```

**Pros:** Dynamic selection, helper functions for semantic gradients
**Cons:** Requires import, slight overhead

## Gradient Categories

### Primary Brand Gradients

Main brand gradients for headers, primary buttons, and hero sections.

#### Diagonal Blue (Primary Brand)

**Usage:** Hero sections, primary headers, emphasis elements

**CSS Class:** `bg-gradient-primary-diagonal`
**Constant:** `GRADIENTS.primary.diagonal`
**Function:** `getGradient('primary', 'diagonal')`

**Gradient:**
```css
linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)
```

**Example:**
```tsx
<div className="bg-gradient-primary-diagonal p-8 rounded-lg">
  <h1 className="text-3xl font-bold text-white">Forvis Mazars</h1>
</div>
```

#### Horizontal Blue

**Usage:** Alternative primary gradient, navigation headers

**CSS Class:** `bg-gradient-primary-horizontal`
**Constant:** `GRADIENTS.primary.horizontal`
**Function:** `getGradient('primary', 'horizontal')`

**Gradient:**
```css
linear-gradient(to right, #2E5AAC, #25488A)
```

---

### Dashboard & Card Gradients

Light, subtle gradients for interactive cards and containers.

#### Dashboard Card

**Usage:** Analytics cards, stat containers, dashboard tiles

**CSS Class:** `bg-gradient-dashboard-card`
**Constant:** `GRADIENTS.dashboard.card`
**Function:** `getGradient('dashboard', 'card')`

**Gradient:**
```css
linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)
```

**Example:**
```tsx
<div className="bg-gradient-dashboard-card rounded-lg p-4 border border-forvis-blue-100">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">
        Total Revenue
      </p>
      <p className="text-2xl font-bold mt-2 text-forvis-blue-600">$1.2M</p>
    </div>
    <div className="bg-gradient-icon-standard rounded-full p-2.5">
      <DollarSign className="w-5 h-5 text-white" />
    </div>
  </div>
</div>
```

#### Dashboard Hover

**Usage:** Hover overlay on dashboard cards (subtle)

**CSS Class:** `bg-gradient-dashboard-hover`
**Constant:** `GRADIENTS.dashboard.hover`
**Function:** `getGradient('dashboard', 'hover')`

**Gradient:**
```css
linear-gradient(135deg, rgba(91,147,215,0.06) 0%, rgba(46,90,172,0.08) 100%)
```

---

### Semantic Gradients

Status-based gradients for success, error, and warning states.

#### Success Gradients

**Success Light Background**

**Usage:** Success alert backgrounds, approved status containers

**CSS Class:** `bg-gradient-success-light`
**Constant:** `GRADIENTS.semantic.success.light`
**Function:** `getSemanticGradient('success', 'light')`

**Gradient:**
```css
linear-gradient(135deg, #E8F3F1 0%, #C8E3DF 100%)
```

**Success Button**

**Usage:** Approve buttons, confirm actions, success CTAs

**CSS Class:** `bg-gradient-success-button`
**Constant:** `GRADIENTS.semantic.success.button`
**Function:** `getSemanticGradient('success', 'button')`

**Gradient:**
```css
linear-gradient(135deg, #4E9B8E 0%, #2F6A5F 50%, #1F4540 100%)
```

**Example:**
```tsx
<div className="bg-gradient-success-light border-2 border-forvis-success-200 rounded-lg p-4">
  <p className="text-forvis-success-800">Application approved successfully</p>
</div>

<button
  className="px-4 py-2 text-white rounded-lg"
  style={{ background: GRADIENTS.semantic.success.button }}
>
  Approve
</button>
```

#### Error Gradients

**Error Light Background**

**Usage:** Error alert backgrounds, rejected status containers

**CSS Class:** `bg-gradient-error-light`
**Constant:** `GRADIENTS.semantic.error.light`
**Function:** `getSemanticGradient('error', 'light')`

**Gradient:**
```css
linear-gradient(135deg, #F7EBF0 0%, #EDCED9 100%)
```

**Error Button**

**Usage:** Delete buttons, reject actions, danger CTAs

**CSS Class:** `bg-gradient-error-button`
**Constant:** `GRADIENTS.semantic.error.button`
**Function:** `getSemanticGradient('error', 'button')`

**Gradient:**
```css
linear-gradient(135deg, #B8546E 0%, #872F48 50%, #581E2F 100%)
```

#### Warning Gradients

**Warning Light Background**

**Usage:** Warning alert backgrounds, pending status containers

**CSS Class:** `bg-gradient-warning-light`
**Constant:** `GRADIENTS.semantic.warning.light`
**Function:** `getSemanticGradient('warning', 'light')`

**Gradient:**
```css
linear-gradient(135deg, #F8F3E8 0%, #EFE3C8 100%)
```

**Warning Button**

**Usage:** Caution buttons, review actions, warning CTAs

**CSS Class:** `bg-gradient-warning-button`
**Constant:** `GRADIENTS.semantic.warning.button`
**Function:** `getSemanticGradient('warning', 'button')`

**Gradient:**
```css
linear-gradient(135deg, #C09B4E 0%, #8F6A2F 50%, #5E451F 100%)
```

---

### Premium/Executive Gradients

Gold gradients for shared services and premium features.

#### Premium Gold

**Usage:** Shared services cards, executive sections

**CSS Class:** `bg-gradient-premium-gold`
**Constant:** `GRADIENTS.premium.gold`
**Function:** `getGradient('premium', 'gold')`

**Gradient:**
```css
linear-gradient(135deg, #D9CBA8 0%, #B0A488 100%)
```

#### Blue to Gold

**Usage:** Hybrid sections, premium to standard transitions

**CSS Class:** `bg-gradient-premium-blue-to-gold`
**Constant:** `GRADIENTS.premium.blueToGold`
**Function:** `getGradient('premium', 'blueToGold')`

**Gradient:**
```css
linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #D9CBA8 100%)
```

#### Workspace

**Usage:** Data-heavy sections, workspace containers

**CSS Class:** `bg-gradient-premium-workspace`
**Constant:** `GRADIENTS.premium.workspace`
**Function:** `getGradient('premium', 'workspace')`

**Gradient:**
```css
linear-gradient(135deg, #F0EAE0 0%, #E0D5C3 100%)
```

---

### Icon Container Gradients

Gradients specifically for icon containers in cards.

#### Standard Icon Gradient

**Usage:** Icon containers (12×12 or 10×10), dashboard card icons

**CSS Class:** `bg-gradient-icon-standard`
**Constant:** `GRADIENTS.icon.standard`
**Function:** `getGradient('icon', 'standard')`

**Gradient:**
```css
linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)
```

**✅ CORRECT Usage:**
```tsx
// Standard size (12×12 container, 6×6 icon)
<div className="w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-icon-standard shadow-sm">
  <Icon className="h-6 w-6 text-white" />
</div>

// Compact size (10×10 container, 5×5 icon)
<div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-icon-standard shadow-sm">
  <Icon className="h-5 w-5 text-white" />
</div>
```

**❌ WRONG - Never Use Dark Gradient:**
```tsx
// DEPRECATED - Do NOT use
<div style={{ background: 'linear-gradient(to bottom right, #2E5AAC, #1C3667)' }}>
  <Icon />
</div>
```

---

### Data Visualization Gradients

For status tiles, allocation badges, and data elements.

| Color | CSS Class | Constant | Usage |
|---|---|---|---|
| **Red** | `bg-gradient-data-red` | `GRADIENTS.data.red` | Critical, overdue |
| **Orange** | `bg-gradient-data-orange` | `GRADIENTS.data.orange` | Warning, attention |
| **Purple** | `bg-gradient-data-purple` | `GRADIENTS.data.purple` | Review, special |
| **Green** | `bg-gradient-data-green` | `GRADIENTS.data.green` | Complete, approved |
| **Blue** | `bg-gradient-data-blue` | `GRADIENTS.data.blue` | Active, in-progress |
| **Gray** | `bg-gradient-data-gray` | `GRADIENTS.data.gray` | Inactive, unassigned |

**Example - Status Badge:**
```tsx
import { getDataGradient } from '@/lib/design-system/gradients';

const getStatusGradient = (status: string) => {
  switch (status) {
    case 'overdue': return getDataGradient('red');
    case 'in-progress': return getDataGradient('blue');
    case 'complete': return getDataGradient('green');
    default: return getDataGradient('gray');
  }
};

<div
  className="px-3 py-1 rounded-md text-white text-xs font-medium"
  style={{ background: getStatusGradient(task.status) }}
>
  {task.status}
</div>
```

## Usage Examples

### Static Card with CSS Class

```tsx
<div className="bg-gradient-dashboard-card rounded-lg p-4 border border-forvis-blue-100 shadow-corporate">
  <h3 className="text-lg font-semibold text-forvis-gray-900">Card Title</h3>
  <p className="text-sm text-forvis-gray-600 mt-2">Card content</p>
</div>
```

### Dynamic Button with Constants

```tsx
import { GRADIENTS } from '@/lib/design-system/gradients';

const Button = ({ variant, children, ...props }) => {
  const gradient = variant === 'success'
    ? GRADIENTS.semantic.success.button
    : variant === 'danger'
    ? GRADIENTS.semantic.error.button
    : GRADIENTS.primary.diagonal;

  return (
    <button
      className="px-4 py-2 text-white rounded-lg font-medium"
      style={{ background: gradient }}
      {...props}
    >
      {children}
    </button>
  );
};
```

### Conditional Gradient with Utility Functions

```tsx
import { getSemanticGradient } from '@/lib/design-system/gradients';

const StatusAlert = ({ type, message }) => {
  const gradient = getSemanticGradient(type, 'light');

  return (
    <div
      className="rounded-lg p-4 border-2"
      style={{ background: gradient }}
    >
      {message}
    </div>
  );
};

<StatusAlert type="success" message="Operation completed" />
<StatusAlert type="error" message="Operation failed" />
```

### Icon Container Pattern

```tsx
import { GRADIENTS } from '@/lib/design-system/gradients';

const IconContainer = ({ icon: Icon, size = 'standard' }) => {
  const sizeClasses = size === 'compact' 
    ? 'w-10 h-10' 
    : 'w-12 h-12';
  const iconSizeClasses = size === 'compact'
    ? 'h-5 w-5'
    : 'h-6 w-6';

  return (
    <div
      className={`${sizeClasses} rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110 shadow-sm`}
      style={{ background: GRADIENTS.icon.standard }}
    >
      <Icon className={`${iconSizeClasses} text-white`} />
    </div>
  );
};
```

### Modal Header with Gradient

```tsx
import { GRADIENTS } from '@/lib/design-system/gradients';

const ConfirmModal = ({ variant, title }) => {
  const headerGradient = variant === 'danger'
    ? GRADIENTS.semantic.error.button
    : GRADIENTS.primary.diagonal;

  return (
    <div className="rounded-lg overflow-hidden">
      <div
        className="p-4"
        style={{ background: headerGradient }}
      >
        <h2 className="text-xl font-bold text-white">{title}</h2>
      </div>
      {/* Modal body */}
    </div>
  );
};
```

## Migration Guide

### Step 1: Identify Inline Gradients

Search for inline gradient styles:
```bash
grep -r "linear-gradient" src/components/
grep -r "linear-gradient" src/app/
```

### Step 2: Choose Replacement Method

For each inline gradient, choose the appropriate method:

**Use CSS Class if:**
- Static gradient (doesn't change)
- Part of Tailwind className string
- Used in multiple components

**Use Constant if:**
- Dynamic inline styles
- Conditional styling
- Need TypeScript safety

**Use Utility Function if:**
- Conditional gradient selection
- Computed values
- Semantic helpers needed

### Step 3: Replace Inline Gradients

**Before:**
```tsx
<div style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}>
  Content
</div>
```

**After (CSS Class):**
```tsx
<div className="bg-gradient-dashboard-card">
  Content
</div>
```

**After (Constant):**
```tsx
import { GRADIENTS } from '@/lib/design-system/gradients';

<div style={{ background: GRADIENTS.dashboard.card }}>
  Content
</div>
```

**After (Utility Function):**
```tsx
import { getGradient } from '@/lib/design-system/gradients';

<div style={{ background: getGradient('dashboard', 'card') }}>
  Content
</div>
```

### Step 4: Verify Changes

- ✅ No inline gradient strings remain
- ✅ All gradients use centralized system
- ✅ Visual appearance unchanged
- ✅ No TypeScript errors

## Best Practices

### Do's

✅ **Use CSS classes for static elements:**
```tsx
<div className="bg-gradient-dashboard-card">Static card</div>
```

✅ **Use constants for inline styles:**
```tsx
<div style={{ background: GRADIENTS.primary.diagonal }}>Inline style</div>
```

✅ **Use utility functions for dynamic selection:**
```tsx
const gradient = getSemanticGradient(status, 'light');
```

✅ **Import only what you need:**
```tsx
import { dashboardGradients } from '@/lib/design-system/gradients';
const gradient = dashboardGradients.card;
```

### Don'ts

❌ **Don't hardcode gradient strings:**
```tsx
// BAD
<div style={{ background: 'linear-gradient(...)' }}>Content</div>
```

❌ **Don't use deprecated dark icon gradient:**
```tsx
// BAD - Use icon.standard instead
style={{ background: 'linear-gradient(to bottom right, #2E5AAC, #1C3667)' }}
```

❌ **Don't create custom gradients without adding to system:**
```tsx
// BAD - Add to gradients.ts first
<div style={{ background: 'linear-gradient(135deg, #ABC123 0%, #DEF456 100%)' }}>
```

❌ **Don't mix gradient methods unnecessarily:**
```tsx
// BAD - Choose one method per component
<div className="bg-gradient-dashboard-card" style={{ background: GRADIENTS.primary.diagonal }}>
```

### When to Add New Gradients

Add a new gradient to `src/lib/design-system/gradients.ts` if:

1. ✅ Used in 3+ places
2. ✅ Part of a consistent pattern
3. ✅ Approved by design team
4. ✅ Fits existing categories

Then:
1. Add to `GRADIENTS` object
2. Add corresponding CSS class to `globals.css`
3. Update this documentation
4. Export individual constant if needed

## Related Documentation

- [Color System](./02-color-system.md) - Base colors used in gradients
- [Component Catalog](./04-component-catalog.md) - Components using gradients
- [Pattern Library](./05-pattern-library.md) - Gradient usage patterns
- [Before/After Examples](./07-before-after-examples.md) - Migration examples
