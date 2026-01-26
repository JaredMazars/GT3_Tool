# Getting Started

Quick start guide for the Forvis Mazars Design System.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Key Concepts](#key-concepts)
- [Common Tasks](#common-tasks)
- [Next Steps](#next-steps)

## Overview

The Forvis Mazars Design System provides centralized styling, components, and patterns for building consistent, professional UI across the application.

**What's Included:**

- ✅ **13 UI Components** - Button, Input, Banner, Card, and more
- ✅ **Centralized Gradients** - 3 ways to use (CSS, constants, functions)
- ✅ **Forvis Brand Colors** - Complete professional palette
- ✅ **Common Patterns** - Modals, forms, tables, alerts
- ✅ **Migration Tools** - Step-by-step guides and checklists

**Design Philosophy:**

- 🎯 **Consistency** - Same components everywhere
- 🎨 **Brand Compliance** - Forvis Mazars identity
- ⚡ **Efficiency** - Change once, apply everywhere
- 📚 **Discoverability** - Easy to find and use
- 🔒 **Type Safety** - Full TypeScript support

---

## Installation

**The design system is already installed!** No additional setup required.

All components and utilities are available in your project:

- **UI Components**: `src/components/ui/`
- **Gradient Utilities**: `src/lib/design-system/gradients.ts`
- **CSS Classes**: `src/app/globals.css`
- **Documentation**: `docs/design-system/`

---

## Basic Usage

### 1. Import Components

All UI components are imported from a single location:

```tsx
import { Button, Input, Banner, Card } from '@/components/ui';
```

**Never import directly from component files:**
```tsx
// ❌ WRONG
import Button from '@/components/ui/Button';

// ✅ CORRECT
import { Button } from '@/components/ui';
```

---

### 2. Use Centralized Gradients

**Three methods to use gradients:**

**Method 1: CSS Classes** (Recommended for static elements)
```tsx
<div className="bg-gradient-dashboard-card">
  Content with dashboard card gradient
</div>
```

**Method 2: Constants** (Recommended for inline styles)
```tsx
import { GRADIENTS } from '@/lib/design-system/gradients';

<div style={{ background: GRADIENTS.dashboard.card }}>
  Content with dashboard card gradient
</div>
```

**Method 3: Utility Functions** (Recommended for dynamic/conditional)
```tsx
import { getGradient, getSemanticGradient } from '@/lib/design-system/gradients';

const gradient = getGradient('dashboard', 'card');
<div style={{ background: gradient }}>Content</div>
```

---

### 3. Use Forvis Brand Colors

Replace default Tailwind colors with Forvis brand colors:

```tsx
// ❌ WRONG - Default Tailwind
<p className="text-red-600">Error</p>
<div className="bg-green-50">Success</div>

// ✅ CORRECT - Forvis Brand
<p className="text-forvis-error-600">Error</p>
<div className="bg-forvis-success-50">Success</div>
```

---

### 4. Replace Browser Dialogs

**Never use browser dialogs:**

```tsx
// ❌ WRONG - Browser dialog
if (window.confirm('Delete this?')) {
  deleteItem();
}

// ✅ CORRECT - ConfirmModal
import { ConfirmModal } from '@/components/shared/ConfirmModal';

const [showConfirm, setShowConfirm] = useState(false);

<ConfirmModal
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  onConfirm={handleDelete}
  title="Confirm Deletion"
  message="Are you sure you want to delete this item?"
  variant="danger"
/>
```

---

## Key Concepts

### Component-First Approach

**Always use components instead of custom HTML elements:**

| Task | Use | Don't Use |
|---|---|---|
| Action button | `<Button variant="primary">` | `<button className="...">` |
| Form input | `<Input variant="text">` | `<input type="text">` |
| Alert message | `<Banner variant="error">` | Custom alert divs |
| Container | `<Card variant="standard">` | Custom card divs |
| Confirmation | `<ConfirmModal>` | `window.confirm()` |

---

### Gradient Centralization

**Never hardcode gradient strings:**

```tsx
// ❌ WRONG
<div style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}>
```

**Always use centralized system:**

```tsx
// ✅ CORRECT - CSS Class
<div className="bg-gradient-dashboard-card">

// ✅ CORRECT - Constant
import { GRADIENTS } from '@/lib/design-system/gradients';
<div style={{ background: GRADIENTS.dashboard.card }}>

// ✅ CORRECT - Function
import { getGradient } from '@/lib/design-system/gradients';
<div style={{ background: getGradient('dashboard', 'card') }}>
```

---

### Brand Color Consistency

**Use Forvis colors for semantic meaning:**

- **Success**: `text-forvis-success-600`, `bg-forvis-success-50`
- **Error**: `text-forvis-error-600`, `bg-forvis-error-50`
- **Warning**: `text-forvis-warning-600`, `bg-forvis-warning-50`
- **Info**: `text-forvis-blue-500`, `bg-forvis-blue-50`

---

### Accessibility Standards

**All colors meet WCAG AA standards:**

- Body text (16px): Use 600+ shades on light backgrounds
- Large text (18px+): Use 500+ shades on light backgrounds
- Buttons/Interactive: Use 500+ shades

**Example:**
```tsx
// ✅ CORRECT - Accessible contrast
<p className="text-forvis-gray-800">Body text</p>
<h1 className="text-forvis-gray-900">Heading</h1>

// ❌ WRONG - Insufficient contrast
<p className="text-forvis-gray-400">Body text</p>
```

---

## Common Tasks

### Create a Form

```tsx
import { Input, Button, Banner } from '@/components/ui';
import { useState } from 'react';

const [formData, setFormData] = useState({ name: '', email: '' });
const [errors, setErrors] = useState<Record<string, string>>({});
const [saving, setSaving] = useState(false);

<form onSubmit={handleSubmit} className="space-y-4">
  {/* Error banner */}
  {errors._form && (
    <Banner variant="error" message={errors._form} dismissible />
  )}

  {/* Fields */}
  <Input
    variant="text"
    label="Name"
    value={formData.name}
    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
    error={errors.name}
    required
  />

  <Input
    variant="email"
    label="Email"
    value={formData.email}
    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
    error={errors.email}
    required
  />

  {/* Actions */}
  <div className="flex justify-end gap-3">
    <Button variant="secondary" onClick={() => navigate(-1)}>
      Cancel
    </Button>
    <Button variant="gradient" type="submit" loading={saving}>
      Submit
    </Button>
  </div>
</form>
```

---

### Show Notification

```tsx
import { Banner } from '@/components/ui';
import { useState, useEffect } from 'react';

const [success, setSuccess] = useState<string | null>(null);
const [error, setError] = useState<string | null>(null);

// Auto-dismiss success after 5 seconds
useEffect(() => {
  if (success) {
    const timer = setTimeout(() => setSuccess(null), 5000);
    return () => clearTimeout(timer);
  }
}, [success]);

// In JSX
{success && (
  <Banner
    variant="success"
    message={success}
    dismissible
    onDismiss={() => setSuccess(null)}
  />
)}

{error && (
  <Banner
    variant="error"
    message={error}
    dismissible
    onDismiss={() => setError(null)}
  />
)}

// Trigger notification
try {
  await saveData();
  setSuccess('Changes saved successfully');
} catch (err) {
  setError('Failed to save changes. Please try again.');
}
```

---

### Create a Dashboard Card

```tsx
import { GRADIENTS } from '@/lib/design-system/gradients';
import { DollarSign } from 'lucide-react';

<div
  className="rounded-lg p-4 border border-forvis-blue-100 shadow-corporate"
  style={{ background: GRADIENTS.dashboard.card }}
>
  <div className="flex items-center justify-between">
    <div>
      <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">
        Total Revenue
      </p>
      <p className="text-2xl font-bold mt-2 text-forvis-blue-600">$1.2M</p>
    </div>
    <div
      className="rounded-full p-2.5"
      style={{ background: GRADIENTS.icon.standard }}
    >
      <DollarSign className="w-5 h-5 text-white" />
    </div>
  </div>
</div>
```

---

### Request Confirmation

```tsx
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { Button } from '@/components/ui';
import { useState } from 'react';

const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

const handleDelete = async () => {
  await deleteItem(itemId);
  setShowDeleteConfirm(false);
  navigate('/list');
};

<>
  <Button
    variant="danger"
    onClick={() => setShowDeleteConfirm(true)}
  >
    Delete
  </Button>

  <ConfirmModal
    isOpen={showDeleteConfirm}
    onClose={() => setShowDeleteConfirm(false)}
    onConfirm={handleDelete}
    title="Confirm Deletion"
    message="Are you sure you want to delete this item? This action cannot be undone."
    variant="danger"
    confirmText="Delete"
    cancelText="Cancel"
  />
</>
```

---

## Next Steps

### 🔍 Explore Documentation

- **[Component Catalog](./04-component-catalog.md)** - All 13 components with props and examples
- **[Pattern Library](./05-pattern-library.md)** - Common UI patterns
- **[Gradient System](./03-gradients.md)** - Complete gradient reference
- **[Color System](./02-color-system.md)** - Color palette and usage

### 🚀 Build New Features

1. Check [Component Catalog](./04-component-catalog.md) for available components
2. Follow [Pattern Library](./05-pattern-library.md) for established patterns
3. Use centralized gradients and Forvis colors
4. Import components from `@/components/ui`

### 🔄 Migrate Existing Code

1. Read [Migration Guide](./06-migration-guide.md)
2. Copy domain checklist template
3. Follow step-by-step migration process
4. Reference [Before/After Examples](./07-before-after-examples.md)

---

## Tips for Success

### Do's

✅ **Always search first** - Component might already exist
✅ **Follow patterns** - Consistency is key
✅ **Use centralized system** - Gradients, colors, components
✅ **Document changes** - Help future developers
✅ **Test thoroughly** - Verify visual and functional behavior

### Don'ts

❌ **Don't create custom styling** - Use existing components
❌ **Don't hardcode gradients** - Use centralized system
❌ **Don't use browser dialogs** - Use ConfirmModal/Banner
❌ **Don't skip documentation** - Read relevant guides
❌ **Don't ignore patterns** - Follow established conventions

---

## Quick Reference

### Import Statement
```tsx
import { Button, Input, Banner, Card } from '@/components/ui';
import { GRADIENTS } from '@/lib/design-system/gradients';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
```

### Common Components
- `<Button variant="primary|secondary|gradient|danger">` - Action buttons
- `<Input variant="text|email|password|number|textarea|select">` - Form inputs
- `<Banner variant="info|error|warning|success">` - Notifications
- `<Card variant="standard|dashboard|shared-service|stats">` - Containers
- `<ConfirmModal variant="danger|warning|info">` - Confirmations

### Common Classes
- `bg-gradient-dashboard-card` - Dashboard card gradient
- `bg-gradient-icon-standard` - Icon container gradient
- `text-forvis-error-600` - Error text color
- `bg-forvis-success-50` - Success background color

---

## Related Documentation

- [Component Catalog](./04-component-catalog.md) - Complete component reference
- [Pattern Library](./05-pattern-library.md) - UI pattern reference
- [Gradient System](./03-gradients.md) - Gradient documentation
- [Color System](./02-color-system.md) - Color documentation
- [Migration Guide](./06-migration-guide.md) - Migration process
- [Before/After Examples](./07-before-after-examples.md) - Code examples

**Ready to dive deeper?** Continue to the [Component Catalog](./04-component-catalog.md) to explore all available components!
